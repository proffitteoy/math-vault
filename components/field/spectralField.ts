export type SpectralParameter = {
  u: number
  v: number
}

export type SpectralSample = {
  x: number
  y: number
  velocityX: number
  velocityY: number
}

export const SPECTRAL_BETA = 0.18
export const SPECTRAL_MODES = [2, 3, 5, 7, 11, 13] as const
export const SPECTRAL_LAMBDAS = SPECTRAL_MODES.map((mode) => SPECTRAL_BETA * Math.pow(mode, 1.5))
export const SPECTRAL_PLAYBACK_RATE = 0.3

const BASE_AMPLITUDES = [0.31, 0.24, 0.18, 0.13, 0.09, 0.06] as const
const BASE_PHASES = [0.31, 2.17, 4.02, 5.41, 1.24, 3.52] as const
const AMPLITUDE_MODULATION = [0.08, 0.11, 0.15, 0.19, 0.23, 0.27] as const
const PHASE_MODULATION = [0.16, 0.22, 0.34, 0.48, 0.62, 0.78] as const
const AMPLITUDE_X = [1, 1, 2, 2, 3, 4] as const
const AMPLITUDE_Y = [1, -1, 1, -2, 2, -3] as const
const PHASE_X = [1, 1, 2, 3, 3, 4] as const
const PHASE_Y = [-1, 1, -2, 1, -3, 2] as const
const AMPLITUDE_OFFSETS = [0.4, 1.7, 2.8, 4.2, 5.1, 0.9] as const
const PHASE_OFFSETS = [2.1, 0.8, 4.7, 1.9, 3.4, 5.6] as const
const TAU = Math.PI * 2

// The generalized golden ratio gives the deterministic two-dimensional R2 sequence.
const R2_G = 1.324717957244746
const R2_A1 = 1 / R2_G
const R2_A2 = 1 / (R2_G * R2_G)

function fract(value: number) {
  return value - Math.floor(value)
}

export function spectralParameterAt(index: number): SpectralParameter {
  const sample = index + 1
  return {
    u: fract(0.5 + R2_A1 * sample),
    v: fract(0.5 + R2_A2 * sample),
  }
}

export function sampleSpectralFamily(
  parameter: SpectralParameter,
  time: number,
  modeCount: number = SPECTRAL_MODES.length,
): SpectralSample {
  let x = 0
  let y = 0
  let velocityX = 0
  let velocityY = 0
  const activeModes = Math.min(modeCount, SPECTRAL_MODES.length)

  for (let mode = 0; mode < activeModes; mode++) {
    const amplitudeWave =
      TAU * (AMPLITUDE_X[mode] * parameter.u + AMPLITUDE_Y[mode] * parameter.v) +
      AMPLITUDE_OFFSETS[mode]
    const phaseWave =
      TAU * (PHASE_X[mode] * parameter.u + PHASE_Y[mode] * parameter.v) + PHASE_OFFSETS[mode]
    const amplitude =
      BASE_AMPLITUDES[mode] * (1 + AMPLITUDE_MODULATION[mode] * Math.sin(amplitudeWave))
    const phase = BASE_PHASES[mode] + PHASE_MODULATION[mode] * Math.sin(phaseWave)
    const theta = SPECTRAL_LAMBDAS[mode] * time + phase
    const cosine = Math.cos(theta)
    const sine = Math.sin(theta)

    x += amplitude * cosine
    y += amplitude * sine
    velocityX -= amplitude * SPECTRAL_LAMBDAS[mode] * sine
    velocityY += amplitude * SPECTRAL_LAMBDAS[mode] * cosine
  }

  return { x, y, velocityX, velocityY }
}

export const SPECTRAL_FIELD_GLSL = String.raw`
const float BASE_AMPLITUDES[6] = float[6](0.31, 0.24, 0.18, 0.13, 0.09, 0.06);
const float BASE_PHASES[6] = float[6](0.31, 2.17, 4.02, 5.41, 1.24, 3.52);
const float AMPLITUDE_MODULATION[6] = float[6](0.08, 0.11, 0.15, 0.19, 0.23, 0.27);
const float PHASE_MODULATION[6] = float[6](0.16, 0.22, 0.34, 0.48, 0.62, 0.78);
const float AMPLITUDE_X[6] = float[6](1.0, 1.0, 2.0, 2.0, 3.0, 4.0);
const float AMPLITUDE_Y[6] = float[6](1.0, -1.0, 1.0, -2.0, 2.0, -3.0);
const float PHASE_X[6] = float[6](1.0, 1.0, 2.0, 3.0, 3.0, 4.0);
const float PHASE_Y[6] = float[6](-1.0, 1.0, -2.0, 1.0, -3.0, 2.0);
const float AMPLITUDE_OFFSETS[6] = float[6](0.4, 1.7, 2.8, 4.2, 5.1, 0.9);
const float PHASE_OFFSETS[6] = float[6](2.1, 0.8, 4.7, 1.9, 3.4, 5.6);

vec2 sampleSpectralFamily(vec2 parameter, float time) {
  vec2 value = vec2(0.0);
  for (int mode = 0; mode < 6; mode++) {
    if (mode >= uModeCount) break;
    float amplitudeWave =
      6.28318530718 *
      (AMPLITUDE_X[mode] * parameter.x + AMPLITUDE_Y[mode] * parameter.y) +
      AMPLITUDE_OFFSETS[mode];
    float phaseWave =
      6.28318530718 *
      (PHASE_X[mode] * parameter.x + PHASE_Y[mode] * parameter.y) +
      PHASE_OFFSETS[mode];
    float amplitude =
      BASE_AMPLITUDES[mode] *
      (1.0 + AMPLITUDE_MODULATION[mode] * sin(amplitudeWave));
    float phase = BASE_PHASES[mode] + PHASE_MODULATION[mode] * sin(phaseWave);
    float theta = uLambda[mode] * time + phase;
    value += amplitude * vec2(cos(theta), sin(theta));
  }
  return value;
}

vec2 viewportFieldPoint(vec2 parameter, float time) {
  return parameter * uResolution + sampleSpectralFamily(parameter, time) * uFieldScale;
}
`
