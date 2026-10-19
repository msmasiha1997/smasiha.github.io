/**
 * Numerical reference for the toy Gibbs law, not another sampling algorithm.
 * In two dimensions dx = (baseA*baseB/2) dq dphi, so phi is uniform and
 * q has density proportional to exp(-(q-r²)² / ((1+q)*temperature)).
 * The CDF uses a fine deterministic trapezoidal quadrature. Its normalization
 * is the radial q integral, not the ambient-space partition function.
 * Its omitted tail
 * has a separately computed upper bound. Finite quadrature is still numerical.
 */
import { seededRandom, summarize } from './ula-model.js';

const TAU = 2 * Math.PI;
const GRID_STEP = 0.0005;
const ANGULAR_BINS = 8;
const RADIAL_BINS = 4;
const radialCache = new Map();

function radialReference(radius, temperature) {
  const key = `${radius}:${temperature}`;
  if (radialCache.has(key)) return radialCache.get(key);
  const r2 = radius * radius;
  let qMax = r2 + Math.max(2, 25 * temperature + 8 * Math.sqrt(temperature));
  let grid, density, cumulative, normalization, tailMassBound, step;
  for (let attempt = 0; attempt < 4; attempt += 1) {
    const intervals = Math.ceil(qMax / GRID_STEP);
    step = qMax / intervals;
    grid = new Float64Array(intervals + 1);
    density = new Float64Array(intervals + 1);
    cumulative = new Float64Array(intervals + 1);
    let lowerIntegral = 0;
    for (let i = 0; i <= intervals; i += 1) {
      const q = i * step;
      grid[i] = q;
      density[i] = Math.exp(-((q - r2) ** 2) / ((1 + q) * temperature));
      if (i) {
        cumulative[i] = cumulative[i - 1] + step * (density[i - 1] + density[i]) / 2;
        // The density is unimodal, so the smaller endpoint is a lower bound
        // throughout each interval, including the interval crossing its mode.
        lowerIntegral += step * Math.min(density[i - 1], density[i]);
      }
    }
    normalization = cumulative[intervals];
    const slope = 1 - (1 + r2) ** 2 / (1 + qMax) ** 2;
    // g is convex as a function of q. Its tangent at qMax bounds the tail.
    const tailIntegralBound = temperature * density[intervals] / slope;
    tailMassBound = tailIntegralBound / lowerIntegral;
    if (tailMassBound < 1e-12) break;
    qMax *= 1.5;
  }
  if (!(normalization > 0) || tailMassBound >= 1e-12) {
    throw new RangeError('Could not resolve the Gibbs radial law at this temperature.');
  }
  for (let i = 0; i < cumulative.length; i += 1) cumulative[i] /= normalization;
  const radialCDF = q => {
    if (q <= 0) return 0;
    if (q >= qMax) return 1;
    const index = Math.floor(q / step);
    const fraction = q / step - index;
    return cumulative[index] + fraction * (cumulative[index + 1] - cumulative[index]);
  };
  const inverseCDF = u => {
    if (!(u >= 0 && u <= 1)) throw new RangeError('The inverse CDF input must lie in [0, 1].');
    if (u === 0) return 0;
    if (u === 1) return qMax;
    let low = 0, high = cumulative.length - 1;
    while (high - low > 1) {
      const middle = (low + high) >>> 1;
      if (cumulative[middle] < u) low = middle;
      else high = middle;
    }
    const fraction = (u - cumulative[low]) / (cumulative[high] - cumulative[low]);
    return grid[low] + fraction * step;
  };
  let radialCoupling = 0;
  for (let i = 1; i < grid.length; i += 1) {
    const before = Math.abs(Math.sqrt(grid[i - 1]) - radius) * density[i - 1];
    const after = Math.abs(Math.sqrt(grid[i]) - radius) * density[i];
    radialCoupling += step * (before + after) / (2 * normalization);
  }
  const reference = { qMax, step, normalization, tailMassBound, radialCDF, inverseCDF, radialCoupling };
  if (radialCache.size >= 32) radialCache.delete(radialCache.keys().next().value);
  radialCache.set(key, reference);
  return reference;
}

/**
 * Mathematically specified target evaluated by quadrature. `points` directly
 * transforms paired uniforms; the points are NOT trajectories or ULA output.
 * `couplingDistance` is the cost of the same-angle coupling to the limiting
 * measure, hence an upper bound on W1, not a computed optimal-transport W1.
 */
export function createGibbsReference(model, temperature) {
  if (!Number.isFinite(temperature) || temperature < 0 || temperature > 1 || (temperature > 0 && temperature < .001)) {
    throw new RangeError('Use zero for the limiting law, or a temperature between 0.001 and 1.');
  }
  const r2 = model.radius * model.radius;
  const radial = temperature ? radialReference(model.radius, temperature) : {
    qMax: r2, step: 0, normalization: null, tailMassBound: 0,
    radialCDF: q => q < r2 ? 0 : 1,
    inverseCDF: u => {
      if (!(u >= 0 && u <= 1)) throw new RangeError('The inverse CDF input must lie in [0, 1].');
      return r2;
    },
    radialCoupling: 0,
  };
  const radialEdges = [0, radial.inverseCDF(.25), radial.inverseCDF(.5), radial.inverseCDF(.75), Infinity];
  const radialProbabilities = temperature ? [.25, .25, .25, .25] : [0, 1, 0, 0];
  const angularProbabilities = Array(ANGULAR_BINS).fill(1 / ANGULAR_BINS);
  const binProbabilities = radialProbabilities.flatMap(weight => angularProbabilities.map(p => weight * p));
  let meanRadialStretch = 0;
  for (let i = 0; i < 512; i += 1) {
    const angle = TAU * (i + .5) / 512;
    meanRadialStretch += Math.hypot(model.baseA * Math.cos(angle), model.baseB * Math.sin(angle)) / 512;
  }
  let distanceMean;
  return {
    temperature, ...radial, radialEdges, radialProbabilities, angularProbabilities, binProbabilities,
    couplingDistance: radial.radialCoupling * meanRadialStretch,
    // A separate numerical diagnostic: 512 radial quantile strata × 64 angles.
    // Lazy so animated parameter changes need not evaluate distances at all.
    get meanDistance() {
      if (distanceMean !== undefined) return distanceMean;
      if (!temperature) return 0;
      if (model.baseA === model.baseB) return radial.radialCoupling * model.baseA;
      let total = 0;
      for (let i = 0; i < 512; i += 1) {
        const radius = Math.sqrt(radial.inverseCDF((i + .5) / 512));
        for (let j = 0; j < 64; j += 1) {
          const angle = TAU * (j + .5) / 64;
          const p = model.world(model.baseA * radius * Math.cos(angle), model.baseB * radius * Math.sin(angle));
          total += model.distance(p.x, p.y);
        }
      }
      distanceMean = total / (512 * 64);
      return distanceMean;
    },
    points(count = 256, seed = 9173) {
      if (!Number.isInteger(count) || count < 0) throw new RangeError('count must be a nonnegative integer.');
      const random = seededRandom(seed);
      return Array.from({ length: count }, () => {
        const radius = Math.sqrt(radial.inverseCDF(random()));
        const angle = TAU * random();
        return model.world(model.baseA * radius * Math.cos(angle), model.baseB * radius * Math.sin(angle));
      });
    },
  };
}

/**
 * Coarse joint-bin TV: one half the sum of absolute frequency differences.
 * Four target radial quartiles × eight angular bins; it is not the total
 * variation between continuous measures, not W1, and not a mixing certificate.
 * Even independent target draws have a positive finite-sample discrepancy.
 */
export function distributionDiagnostics(particles, model, reference) {
  const radialCounts = Array(RADIAL_BINS).fill(0);
  const angularCounts = Array(ANGULAR_BINS).fill(0);
  const binCounts = Array(RADIAL_BINS * ANGULAR_BINS).fill(0);
  for (const particle of particles) {
    const local = model.local(particle.x, particle.y);
    const q = (local.x / model.baseA) ** 2 + (local.y / model.baseB) ** 2;
    let radialBin;
    if (!reference.temperature) {
      const residual = q - model.radius * model.radius;
      radialBin = Math.abs(residual) <= 1e-10 ? 1 : residual < 0 ? 0 : 3;
    } else {
      radialBin = q < reference.radialEdges[1] ? 0 : q < reference.radialEdges[2] ? 1 : q < reference.radialEdges[3] ? 2 : 3;
    }
    const angularBin = Math.min(ANGULAR_BINS - 1, Math.floor(model.ellipticAngle(particle.x, particle.y) / TAU * ANGULAR_BINS));
    radialCounts[radialBin] += 1;
    angularCounts[angularBin] += 1;
    binCounts[radialBin * ANGULAR_BINS + angularBin] += 1;
  }
  const sampleCount = particles.length;
  const discrepancy = (counts, target) => sampleCount
    ? counts.reduce((sum, count, i) => sum + Math.abs(count / sampleCount - target[i]), 0) / 2
    : null;
  return {
    ...summarize(particles, model), sampleCount, binCounts, radialCounts, angularCounts,
    binTV: discrepancy(binCounts, reference.binProbabilities),
    radialTV: discrepancy(radialCounts, reference.radialProbabilities),
    angularTV: discrepancy(angularCounts, reference.angularProbabilities),
  };
}
