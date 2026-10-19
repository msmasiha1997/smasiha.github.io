/**
 * Two additional fixed Gibbs-law illustrations with non-elliptical minimizers.
 * The invertible shear (X,Y) -> (X,Y+s(X)) has determinant one. Combined with
 * (u,v) -> (a*u,b*v), its constant Jacobian a*b preserves the radial integral.
 * These models are not substituted into the article's numerical samplers:
 * their gradients need not be globally Lipschitz.
 */
import { createGibbsReference } from './gibbs-reference.js';

const TAU = 2 * Math.PI;
const A = 1.45;
const B = .7;
const PEAK_SAMPLES = 16384;
const modelCache = new Map();

export const DENSITY_CURVES = Object.freeze({
  wavy: Object.freeze({
    label: 'Wavy curve', a: A, b: B,
    amplitude: .5, frequency: 2, offset: 0,
    formula: 's(x) = 0.5 sin(2x)',
    shearRange: Object.freeze([-.5, .5]),
    derivativeBound: 1,
    secondDerivativeBound: 2,
  }),
  bent: Object.freeze({
    label: 'Bent curve', a: A, b: B,
    amplitude: .55, frequency: 1.7, offset: -.4,
    formula: 's(x) = 0.55(1 - cos(1.7x)) - 0.4',
    shearRange: Object.freeze([-.4, .7]),
    derivativeBound: .55 * 1.7,
    secondDerivativeBound: .55 * 1.7 ** 2,
  }),
});

/**
 * Fixed shape with q=(x/a)^2+((y-s(x))/b)^2 and g=(q-1)^2/(1+q).
 * world/local apply/undo the shear on physical affine coordinates (X,Y).
 * They do not apply/remove a and b; those appear explicitly in q and point().
 */
export function createDensityModel(example = 'wavy') {
  if (example !== 'wavy' && example !== 'bent') {
    throw new RangeError('The curved Gibbs example must be wavy or bent.');
  }
  if (modelCache.has(example)) return modelCache.get(example);
  const parameters = DENSITY_CURVES[example];
  const { a, b, amplitude, frequency, offset } = parameters;
  const shear = example === 'wavy'
    ? x => amplitude * Math.sin(frequency * x)
    : x => amplitude * (1 - Math.cos(frequency * x)) + offset;
  const shearDerivative = example === 'wavy'
    ? x => amplitude * frequency * Math.cos(frequency * x)
    : x => amplitude * frequency * Math.sin(frequency * x);
  const shearSecondDerivative = example === 'wavy'
    ? x => -amplitude * frequency ** 2 * Math.sin(frequency * x)
    : x => amplitude * frequency ** 2 * Math.cos(frequency * x);
  const world = (x, y) => ({ x, y: y + shear(x) });
  const local = (x, y) => ({ x, y: y - shear(x) });
  const point = angle => world(a * Math.cos(angle), b * Math.sin(angle));
  const curveSpeed = angle => {
    const x = a * Math.cos(angle);
    const dx = -a * Math.sin(angle);
    const dy = b * Math.cos(angle) + shearDerivative(x) * dx;
    return Math.hypot(dx, dy);
  };
  const limitingArcDensity = angle => 1 / (TAU * curveSpeed(angle));
  // Operator norm of [[1,0],[k,1]], maximized for |k| <= kappa.
  // The inverse shear has the same Lipschitz bound.
  const kappa = parameters.derivativeBound;
  const shearLipschitz = (Math.sqrt(kappa * kappa + 4) + kappa) / 2;
  let linePeak = 0;
  for (let i = 0; i < PEAK_SAMPLES; i += 1) {
    linePeak = Math.max(linePeak, limitingArcDensity(TAU * i / PEAK_SAMPLES));
  }
  const model = Object.freeze({
    example, label: parameters.label, a, b, baseA: a, baseB: b, radius: 1,
    transformation: 'vertical-shear', jacobianDeterminant: a * b,
    parameters, shear, shearDerivative, shearSecondDerivative,
    shearBounds: Object.freeze({
      value: parameters.shearRange,
      firstDerivative: kappa,
      secondDerivative: parameters.secondDerivativeBound,
    }),
    shearLipschitz,
    // The dense angular maximum is useful for display; the second quantity
    // is an analytic bound, not a maximum estimated from samples.
    linePeak, linePeakSamples: PEAK_SAMPLES,
    arcDensityUpperBound: shearLipschitz / (TAU * Math.min(a, b)),
    world, local, inverse: local, point, curveSpeed, limitingArcDensity,
    curve(count = 480) {
      if (!Number.isInteger(count) || count < 4) throw new RangeError('Use at least four curve intervals.');
      return Array.from({ length: count + 1 }, (_, i) => point(TAU * i / count));
    },
    q(x, y) {
      const p = local(x, y);
      return (p.x / a) ** 2 + (p.y / b) ** 2;
    },
    potential(x, y) {
      const p = local(x, y);
      const q = (p.x / a) ** 2 + (p.y / b) ** 2;
      return (q - 1) ** 2 / (1 + q);
    },
    gradient(x, y) {
      const residual = y - shear(x);
      const q = (x / a) ** 2 + (residual / b) ** 2;
      const factor = 1 - 4 / ((1 + q) * (1 + q));
      return {
        x: factor * (2 * x / (a * a) - 2 * residual * shearDerivative(x) / (b * b)),
        y: factor * 2 * residual / (b * b),
      };
    },
    ellipticAngle(x, y) {
      const p = local(x, y);
      return (Math.atan2(p.y / b, p.x / a) + TAU) % TAU;
    },
  });
  modelCache.set(example, model);
  return model;
}

/**
 * Reuse the original radial quadrature without exposing its affine distance
 * formula as a distance for the sheared model. If R=sqrt(Q) and Phi is uniform,
 * the affine same-angle coupling cost is E[|R-1| |(a cos Phi,b sin Phi)|].
 * Applying the shear to both coupled points multiplies distances by at most L.
 * Therefore L times that cost bounds W1 for the transformed law and its limit.
 * This bound need not equal the actual coupling cost or the optimal W1.
 */
export function createDensityReference(model, temperature) {
  if (!model || model.transformation !== 'vertical-shear' || !(model.shearLipschitz >= 1)) {
    throw new TypeError('Pass a model from createDensityModel().');
  }
  const radial = createGibbsReference(model, temperature);
  const ambientNormalization = temperature
    ? Math.PI * model.baseA * model.baseB * radial.normalization
    : null;
  // Do not spread radial: it includes a lazy Euclidean-distance diagnostic
  // for the old affine geometry. That diagnostic does not apply to this shear.
  return {
    temperature: radial.temperature,
    qMax: radial.qMax, step: radial.step,
    normalization: radial.normalization,
    ambientNormalization,
    peak: temperature ? 1 / ambientNormalization : null,
    tailMassBound: radial.tailMassBound,
    radialCDF: radial.radialCDF, inverseCDF: radial.inverseCDF,
    radialCoupling: radial.radialCoupling,
    radialEdges: radial.radialEdges,
    radialProbabilities: radial.radialProbabilities,
    angularProbabilities: radial.angularProbabilities,
    binProbabilities: radial.binProbabilities,
    points: (count, seed) => radial.points(count, seed),
    unshearedCouplingCost: radial.couplingDistance,
    couplingUpperBound: model.shearLipschitz * radial.couplingDistance,
    couplingBoundFactor: model.shearLipschitz,
    couplingInterpretation: 'A Lipschitz bound on a specified coupling cost, hence an upper bound on W1; not an exact W1 calculation',
  };
}

export function densityCurveMetadata(example = 'wavy') {
  const model = createDensityModel(example);
  return {
    example, label: model.label, parameters: model.parameters,
    map: 'x = a*u, y = b*v + s(a*u)',
    inverseRadius: 'q = (x/a)^2 + ((y-s(x))/b)^2',
    potential: 'g = (q-1)^2 / (1+q)',
    jacobian: model.jacobianDeterminant,
    normalization: 'Z_lambda = pi*a*b*integral_0^infinity exp(-(q-1)^2/((1+q)*lambda)) dq',
    limitingLaw: 'Uniform angular parameter on F(a*cos(phi), b*sin(phi))',
    limitingArcDensity: '1 / (2*pi*curveSpeed(phi))',
    linePeak: model.linePeak, linePeakSamples: model.linePeakSamples,
    arcDensityUpperBound: model.arcDensityUpperBound,
    shearBounds: model.shearBounds, shearLipschitz: model.shearLipschitz,
    couplingBound: 'W1 <= L * affineSameAngleCouplingCost, with L=(sqrt(kappa^2+4)+kappa)/2',
    scope: 'A fixed Gibbs-law illustration. The invertible smooth map gives regular minimizers and local quadratic growth; no global PL or globally Lipschitz-gradient claim is made.',
  };
}
