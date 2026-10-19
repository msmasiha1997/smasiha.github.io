/**
 * Numerical models for the sampling article. No displayed solution curve is
 * queried by advanceULA: the update uses only the model's gradient.
 *
 * For q = ||diag(1/baseA, 1/baseB) R^T (x-c)||², use
 *   g(x) = (q-r²)² / (q+1), where r changes with theta.
 * Its minimizers form an ellipse (a circle when baseA=baseB). The quadratic growth at
 * infinity makes exp(-g / temperature) integrable. Finite-step ULA has a
 * discretization bias; its samples are not exact draws from that Gibbs law.
 */

const TAU = 2 * Math.PI;

/** A reproducible Mulberry32 stream. Returned values are in [0, 1). */
export function seededRandom(seed = 2424) {
  let state = seed >>> 0;
  return () => {
    state = (state + 0x6D2B79F5) | 0;
    let value = Math.imul(state ^ (state >>> 15), 1 | state);
    value ^= value + Math.imul(value ^ (value >>> 7), 61 | value);
    return ((value ^ (value >>> 14)) >>> 0) / 4294967296;
  };
}

/** Box–Muller draws, keeping the second draw for the next call. */
export function gaussianRandom(random = seededRandom()) {
  let spare = null;
  return () => {
    if (spare !== null) {
      const value = spare;
      spare = null;
      return value;
    }
    const radius = Math.sqrt(-2 * Math.log(1 - random()));
    const angle = TAU * random();
    spare = radius * Math.sin(angle);
    return radius * Math.cos(angle);
  };
}

/**
 * Exact Euclidean distance up to bisection tolerance, for a >= b > 0.
 * Solve the monotone Lagrange-multiplier equation in the first quadrant.
 * The major-axis case needs its own formula for points inside the evolute.
 */
function ellipseDistance(x, y, a, b) {
  const u = Math.abs(x);
  const v = Math.abs(y);
  if (Math.abs(a - b) < 1e-12) return Math.abs(Math.hypot(u, v) - a);
  const a2 = a * a;
  const b2 = b * b;
  if (v < 1e-12) {
    const threshold = (a2 - b2) / a;
    if (u >= threshold) return Math.abs(u - a);
    const nearestX = a2 * u / (a2 - b2);
    const nearestY = b * Math.sqrt(Math.max(0, 1 - nearestX * nearestX / a2));
    return Math.hypot(nearestX - u, nearestY);
  }
  const q = u * u / a2 + v * v / b2;
  let low = b * v - b2;
  let high = q < 1 ? 0 : a * Math.hypot(u, v);
  for (let iteration = 0; iteration < 56; iteration += 1) {
    const t = (low + high) / 2;
    const rx = a * u / (t + a2);
    const ry = b * v / (t + b2);
    if (rx * rx + ry * ry > 1) low = t;
    else high = t;
  }
  const t = (low + high) / 2;
  return Math.hypot(a2 * u / (t + a2) - u, b2 * v / (t + b2) - v);
}

export function createModel(example = 'ellipse', theta = 0.5) {
  if (example !== 'circle' && example !== 'ellipse') {
    throw new RangeError('The example must be circle or ellipse.');
  }
  if (!Number.isFinite(theta)) throw new RangeError('theta must be finite.');
  const parameter = Math.max(0, Math.min(1, theta));
  // The leading quadratic form stays fixed as theta varies. Only the
  // center and level-set radius change; this avoids changing the quadratic
  // tail across the parameter family.
  const baseA = example === 'circle' ? 1.2 : 1.4;
  const baseB = example === 'circle' ? 1.2 : 0.8;
  const radius = 0.85 + 0.3 * parameter;
  const a = baseA * radius;
  const b = baseB * radius;
  const angle = example === 'circle' ? 0 : -0.15;
  const center = {
    x: 0.7 * (parameter - 0.5),
    y: 0.55 * (parameter - 0.5),
  };
  const cosine = Math.cos(angle);
  const sine = Math.sin(angle);
  const invA2 = 1 / (baseA * baseA);
  const invB2 = 1 / (baseB * baseB);
  const local = (x, y) => {
    const dx = x - center.x;
    const dy = y - center.y;
    return { x: cosine * dx + sine * dy, y: -sine * dx + cosine * dy };
  };
  const world = (x, y) => ({
    x: center.x + cosine * x - sine * y,
    y: center.y + sine * x + cosine * y,
  });
  const point = t => world(a * Math.cos(t), b * Math.sin(t));
  return {
    example, theta: parameter, a, b, baseA, baseB, radius, angle, center,
    bounds: { xMin: -3.4, xMax: 3.4, yMin: -3.4, yMax: 3.4 },
    local, world, point,
    curve: (count = 180) => Array.from({ length: count + 1 }, (_, i) => point(TAU * i / count)),
    potential(x, y) {
      const p = local(x, y);
      const q = p.x * p.x * invA2 + p.y * p.y * invB2;
      return (q - radius * radius) ** 2 / (1 + q);
    },
    gradient(x, y) {
      const p = local(x, y);
      const q = p.x * p.x * invA2 + p.y * p.y * invB2;
      const factor = 2 * (1 - (1 + radius * radius) ** 2 / ((1 + q) * (1 + q)));
      const gx = factor * p.x * invA2;
      const gy = factor * p.y * invB2;
      return { x: cosine * gx - sine * gy, y: sine * gx + cosine * gy };
    },
    distance(x, y) {
      const p = local(x, y);
      return ellipseDistance(p.x, p.y, a, b);
    },
    ellipticAngle(x, y) {
      const p = local(x, y);
      return (Math.atan2(p.y / b, p.x / a) + TAU) % TAU;
    },
    normalStiffness(t) {
      return 8 * radius * radius / (1 + radius * radius) * (Math.cos(t) ** 2 * invA2 + Math.sin(t) ** 2 * invB2);
    },
    // Density with respect to arc length, not to elliptic angle. The latter
    // is exactly uniform for this family, including at finite temperature.
    limitingArcDensity(t) {
      return 1 / (TAU * Math.hypot(a * Math.sin(t), b * Math.cos(t)));
    },
  };
}

/** Deterministic off-manifold initial conditions; no simulated burn-in. */
export function createEnsemble(model, count = 64, seed = 2424) {
  const random = seededRandom(seed);
  // A fixed Cartesian cloud, independent of the hidden solution geometry.
  // Retain the model argument so callers can share a uniform setup API.
  return Array.from({ length: count }, () => ({
    x: 2 + 0.5 * random(),
    y: 0.1 + 0.6 * random(),
  }));
}

/** Mutates the supplied ensemble. No projection, clipping, or resets. */
export function advanceULA(particles, model, {
  h = 0.01, temperature = 0.06, steps = 1, normal,
} = {}) {
  if (!(h > 0) || !Number.isFinite(h) || !(temperature >= 0) || !Number.isFinite(temperature)) {
    throw new RangeError('Use a finite positive step size and nonnegative temperature.');
  }
  if (!Number.isInteger(steps) || steps < 0) throw new RangeError('steps must be a nonnegative integer.');
  if (typeof normal !== 'function') throw new TypeError('Pass a seeded Gaussian generator as normal.');
  const noiseScale = Math.sqrt(2 * h * temperature);
  for (let step = 0; step < steps; step += 1) {
    for (const particle of particles) {
      const gradient = model.gradient(particle.x, particle.y);
      particle.x += -h * gradient.x + noiseScale * normal();
      particle.y += -h * gradient.y + noiseScale * normal();
    }
  }
  return particles;
}

/** Distance queries are for explanatory diagnostics, never sampler updates. */
export function summarize(particles, model) {
  let distanceSum = 0;
  let distanceSquareSum = 0;
  let lossSum = 0;
  for (const particle of particles) {
    const distance = model.distance(particle.x, particle.y);
    distanceSum += distance;
    distanceSquareSum += distance * distance;
    lossSum += model.potential(particle.x, particle.y);
  }
  const count = particles.length;
  return {
    meanDistance: count ? distanceSum / count : 0,
    rmsDistance: count ? Math.sqrt(distanceSquareSum / count) : 0,
    meanLoss: count ? lossSum / count : 0,
  };
}
