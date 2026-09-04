export type OrbitPoint = {
  x: number
  y: number
}

export type VisibleInterval = readonly [start: number, end: number]

export const ORBIT_BETA = 0.18
export const ORBIT_MODES = [2, 3, 5, 7, 11, 13] as const
export const ORBIT_LAMBDAS = ORBIT_MODES.map((mode) => ORBIT_BETA * Math.pow(mode, 1.5))
export const ORBIT_AMPLITUDES = [0.42, 0.36, 0.3, 0.25, 0.2, 0.16] as const
export const ORBIT_PHASES = [0.31, 2.17, 4.02, 5.41, 1.24, 3.52] as const
export const ORBIT_PLAYBACK_SPEED = 0.025
export const ORBIT_SEARCH_DURATION = 600
export const ORBIT_CROP_OVERSCAN = 1.04

// Highest-scoring 16:9 crop from 100,000 samples on t ∈ [0, 600].
// 12 × 7 grid coverage: 100%; independent visible segments: 73.
export const ORBIT_CROP = {
  xMin: -0.595426,
  xMax: 0.134689,
  yMin: -1.229504,
  yMax: -0.818815,
} as const

export const VISIBLE_INTERVALS: readonly VisibleInterval[] = [
  [21.685609, 21.82667],
  [22.169944, 22.31852],
  [35.018866, 35.124638],
  [43.350368, 43.59416],
  [56.117863, 56.790472],
  [82.61956, 82.823869],
  [84.277698, 84.305738],
  [96.042767, 96.256411],
  [96.946324, 97.00614],
  [103.602995, 103.769048],
  [109.363392, 109.523075],
  [116.310552, 116.429036],
  [118.364627, 118.579465],
  [122.058788, 122.210695],
  [131.196984, 131.576424],
  [143.1385, 143.358395],
  [143.733209, 144.033055],
  [169.026418, 169.358875],
  [169.719604, 169.780835],
  [184.035616, 184.200817],
  [190.770882, 190.874317],
  [193.689839, 193.834849],
  [203.396386, 203.614736],
  [216.68909, 216.858044],
  [218.196555, 218.424464],
  [230.990902, 231.027782],
  [231.218961, 231.259796],
  [243.42496, 243.713425],
  [244.239917, 244.418952],
  [256.0073, 256.333668],
  [265.36695, 265.728045],
  [271.176519, 271.266514],
  [278.004096, 278.162319],
  [278.467618, 278.762151],
  [284.534569, 284.54585],
  [290.486716, 290.658786],
  [291.22068, 291.516832],
  [293.440477, 293.446961],
  [303.193777, 303.236048],
  [304.697177, 304.918349],
  [305.404448, 305.533606],
  [331.260884, 331.401112],
  [352.394714, 352.712036],
  [365.192476, 365.727035],
  [391.671657, 391.847561],
  [403.120936, 403.22505],
  [405.118599, 405.285391],
  [412.592903, 412.834284],
  [418.447179, 418.570518],
  [425.369011, 425.534936],
  [427.434312, 427.623626],
  [431.205938, 431.277297],
  [438.741611, 438.849892],
  [440.264209, 440.580641],
  [452.222354, 452.434895],
  [452.763009, 453.019484],
  [478.031378, 478.389293],
  [478.757656, 478.780058],
  [493.153939, 493.25874],
  [499.742514, 500.018023],
  [502.76743, 502.876849],
  [512.576339, 512.664183],
  [525.671268, 525.918322],
  [527.277068, 527.525143],
  [539.988287, 540.258184],
  [552.475591, 552.717408],
  [553.322841, 553.449303],
  [565.112172, 565.375883],
  [574.417201, 574.762613],
  [587.022683, 587.243248],
  [587.498619, 587.728106],
  [593.623495, 593.634893],
  [599.523018, 599.757244],
]

export const VISIBLE_INTERVAL_DURATION = VISIBLE_INTERVALS.reduce(
  (total, interval) => total + interval[1] - interval[0],
  0,
)

export function sampleOrbit(time: number): OrbitPoint {
  let x = 0
  let y = 0

  for (let index = 0; index < ORBIT_MODES.length; index++) {
    const angle = ORBIT_LAMBDAS[index] * time + ORBIT_PHASES[index]
    x += ORBIT_AMPLITUDES[index] * Math.cos(angle)
    y += ORBIT_AMPLITUDES[index] * Math.sin(angle)
  }

  return { x, y }
}

export function isPointInOrbitCrop(point: OrbitPoint) {
  return (
    point.x >= ORBIT_CROP.xMin &&
    point.x <= ORBIT_CROP.xMax &&
    point.y >= ORBIT_CROP.yMin &&
    point.y <= ORBIT_CROP.yMax
  )
}

export function viewportTransform(point: OrbitPoint, width: number, height: number): OrbitPoint {
  const cropWidth = ORBIT_CROP.xMax - ORBIT_CROP.xMin
  const cropHeight = ORBIT_CROP.yMax - ORBIT_CROP.yMin
  const cropCenterX = (ORBIT_CROP.xMin + ORBIT_CROP.xMax) * 0.5
  const cropCenterY = (ORBIT_CROP.yMin + ORBIT_CROP.yMax) * 0.5
  const scale = Math.min(width / cropWidth, height / cropHeight) * ORBIT_CROP_OVERSCAN

  return {
    x: width * 0.5 + (point.x - cropCenterX) * scale,
    y: height * 0.5 - (point.y - cropCenterY) * scale,
  }
}

export function visibleIntervalAt(unitValue: number) {
  let target = Math.min(1 - Number.EPSILON, Math.max(0, unitValue)) * VISIBLE_INTERVAL_DURATION

  for (let index = 0; index < VISIBLE_INTERVALS.length; index++) {
    const interval = VISIBLE_INTERVALS[index]
    const duration = interval[1] - interval[0]
    if (target < duration) return { index, interval }
    target -= duration
  }

  const index = VISIBLE_INTERVALS.length - 1
  return { index, interval: VISIBLE_INTERVALS[index] }
}

export function sampleVisibleTime(interval: VisibleInterval, unitValue: number) {
  return interval[0] + (interval[1] - interval[0]) * Math.min(1, Math.max(0, unitValue))
}

export const SPECTRAL_ORBIT_GLSL = String.raw`
const float ORBIT_AMPLITUDES[6] = float[6](0.42, 0.36, 0.30, 0.25, 0.20, 0.16);
const float ORBIT_PHASES[6] = float[6](0.31, 2.17, 4.02, 5.41, 1.24, 3.52);

vec2 sampleSpectralOrbit(float time) {
  vec2 value = vec2(0.0);
  for (int index = 0; index < 6; index++) {
    float theta = uLambda[index] * time + ORBIT_PHASES[index];
    value += ORBIT_AMPLITUDES[index] * vec2(cos(theta), sin(theta));
  }
  return value;
}

vec2 viewportOrbitPoint(float time) {
  vec2 value = sampleSpectralOrbit(time);
  const vec2 cropMin = vec2(-0.595426, -1.229504);
  const vec2 cropMax = vec2(0.134689, -0.818815);
  vec2 cropSize = cropMax - cropMin;
  vec2 cropCenter = (cropMin + cropMax) * 0.5;
  float scale = min(uResolution.x / cropSize.x, uResolution.y / cropSize.y) * 1.04;
  return vec2(
    uResolution.x * 0.5 + (value.x - cropCenter.x) * scale,
    uResolution.y * 0.5 - (value.y - cropCenter.y) * scale
  );
}
`
