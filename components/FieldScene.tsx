"use client"

import { useEffect, useRef } from "react"
import { siteConfig } from "../siteConfig"
import { useFieldMode } from "./FieldModeProvider"
import { useTheme } from "./ThemeProvider"

const TAU = Math.PI * 2
const PHI = (1 + Math.sqrt(5)) / 2
const NORMAL_FRAME_MS = 1000 / 30
const NORMAL_PIXEL_RATIO = 1.25
const FIELD_BETA = 0.18
const MODE_INDICES = [2, 3, 5, 7, 11, 13] as const
const LAMBDAS = MODE_INDICES.map((mode) => FIELD_BETA * Math.pow(mode, 1.5))
const FIELD_FLOW_SPEED = 0.14
const FIELD_RADIAL_MIX = 0.22
const FIELD_EPSILON = 0.05
const FIELD_WAVE_NUMBER_SCALE = 0.42
const FIELD_WAVE_DIRECTIONS = [0.18, 1.35, 2.55, 3.58, 4.72, 5.68] as const
const FIELD_MODE_AMPLITUDES = [0.42, 0.36, 0.3, 0.25, 0.2, 0.16] as const
const FIELD_MODE_PHASES = [0.31, 2.17, 4.02, 5.41, 1.24, 3.52] as const
const MAX_TRACERS = 2400
const MAX_OBSTACLES = 8
const EFFECT_COUNTS = {
  sakura: 40,
  fireflies: 50,
  grass: 150,
  danmaku: 15,
  foregroundTracer: 96,
} as const

type Spectrum = {
  amplitudes: number[]
  cosPhases: number[]
  sinPhases: number[]
}

type Obstacle = {
  left: number
  top: number
  right: number
  bottom: number
}

type Impulse = {
  x: number
  y: number
  startedAt: number
}

type Ripple = {
  x: number
  y: number
  radius: number
  opacity: number
  velocity: number
}

type FieldQuality = {
  foregroundCount: number
  tracerRatio: number
  pixelRatio: number
  modeCount: number
  frameMs: number
}

const FIELD_QUALITY: FieldQuality[] = [
  { foregroundCount: 96, tracerRatio: 1, pixelRatio: 1.5, modeCount: 6, frameMs: 1000 / 60 },
  { foregroundCount: 48, tracerRatio: 1, pixelRatio: 1.5, modeCount: 6, frameMs: 1000 / 60 },
  { foregroundCount: 48, tracerRatio: 0.68, pixelRatio: 1.5, modeCount: 6, frameMs: 1000 / 60 },
  { foregroundCount: 48, tracerRatio: 0.68, pixelRatio: 1, modeCount: 6, frameMs: 1000 / 60 },
  { foregroundCount: 48, tracerRatio: 0.68, pixelRatio: 1, modeCount: 4, frameMs: 1000 / 45 },
  { foregroundCount: 32, tracerRatio: 0.55, pixelRatio: 1, modeCount: 4, frameMs: 1000 / 30 },
]

const SPECTRAL_FIELD_GLSL = String.raw`
uniform float uTime;
uniform float uModeCount;
uniform vec2 uPointer;
uniform vec4 uImpulse;
uniform float uLambda[6];

const float MODE_VALUES[6] = float[6](2.0, 3.0, 5.0, 7.0, 11.0, 13.0);
const float WAVE_DIRECTIONS[6] = float[6](0.18, 1.35, 2.55, 3.58, 4.72, 5.68);
const float MODE_AMPLITUDES[6] = float[6](0.42, 0.36, 0.30, 0.25, 0.20, 0.16);
const float MODE_PHASES[6] = float[6](0.31, 2.17, 4.02, 5.41, 1.24, 3.52);

float hash11(float value) {
  return fract(sin(value * 127.1) * 43758.5453123);
}

vec2 spawnPosition(float seed) {
  float horizontal = hash11(seed * 1.37 + 3.1);
  float edgeHorizontal =
    horizontal < 0.5
      ? 0.5 * pow(horizontal * 2.0, 1.45)
      : 1.0 - 0.5 * pow((1.0 - horizontal) * 2.0, 1.45);
  horizontal = mix(horizontal, edgeHorizontal, 0.28);
  return vec2(
    mix(-1.04, 1.04, horizontal),
    mix(-1.04, 1.04, hash11(seed * 2.71 + 7.9))
  );
}

vec2 fieldVelocityAt(vec2 position, float time) {
  vec2 psi = vec2(0.0);
  vec2 gradientX = vec2(0.0);
  vec2 gradientY = vec2(0.0);

  float impulseAge = time - uImpulse.z;
  float impulseBias = 0.0;
  if (impulseAge >= 0.0 && impulseAge < 2.8) {
    float distanceSquared = dot(position - uImpulse.xy, position - uImpulse.xy);
    impulseBias =
      uImpulse.w *
      exp(-distanceSquared / 0.16) *
      exp(-impulseAge * 1.35);
  }
  float pointerBias =
    0.055 *
    exp(-dot(position - uPointer, position - uPointer) / 0.075);

  for (int index = 0; index < 6; index++) {
    if (float(index) >= uModeCount) {
      continue;
    }
    float waveNumber = 0.42 * MODE_VALUES[index];
    vec2 waveVector =
      waveNumber *
      vec2(cos(WAVE_DIRECTIONS[index]), sin(WAVE_DIRECTIONS[index]));
    float alternating = index % 2 == 0 ? 1.0 : -1.0;
    float theta =
      dot(waveVector, position) -
      uLambda[index] * time +
      MODE_PHASES[index] +
      impulseBias * (0.35 + float(index) * 0.13) +
      pointerBias * alternating;
    vec2 mode = MODE_AMPLITUDES[index] * vec2(cos(theta), sin(theta));
    vec2 tangent = vec2(-mode.y, mode.x);
    psi += mode;
    gradientX += waveVector.x * tangent;
    gradientY += waveVector.y * tangent;
  }

  vec2 phaseCurrent = vec2(
    psi.x * gradientX.y - psi.y * gradientX.x,
    psi.x * gradientY.y - psi.y * gradientY.x
  );
  vec2 amplitudeCurrent = vec2(
    dot(psi, gradientX),
    dot(psi, gradientY)
  );
  vec2 velocity =
    0.14 *
    (phaseCurrent + 0.22 * amplitudeCurrent) /
    (dot(psi, psi) + 0.05);
  float speed = length(velocity);
  if (speed > 0.34) {
    velocity *= 0.34 / speed;
  }
  return velocity;
}
`

const UPDATE_VERTEX_SHADER = String.raw`#version 300 es
precision highp float;

layout(location = 0) in vec4 aState;

uniform float uDeltaTime;

${SPECTRAL_FIELD_GLSL}

out vec4 vState;

void main() {
  float seed = aState.w;
  float lifetime = mix(12.0, 28.0, hash11(seed * 3.17));
  float age = aState.z + uDeltaTime;
  vec2 position = aState.xy;

  if (age >= lifetime) {
    seed += 2417.0;
    age = 0.0;
    position = spawnPosition(seed);
  } else if (uDeltaTime > 0.0) {
    float stepStartedAt = uTime - uDeltaTime;
    vec2 firstVelocity = fieldVelocityAt(position, stepStartedAt);
    vec2 midpoint = position + 0.5 * uDeltaTime * firstVelocity;
    vec2 midpointVelocity = fieldVelocityAt(midpoint, stepStartedAt + 0.5 * uDeltaTime);
    position += uDeltaTime * midpointVelocity;
    position = mod(position + 1.08, 2.16) - 1.08;
  }

  vState = vec4(position, age, seed);
  gl_Position = vec4(position, 0.0, 1.0);
  gl_PointSize = 1.0;
}
`

const UPDATE_FRAGMENT_SHADER = String.raw`#version 300 es
precision mediump float;
out vec4 outColor;
void main() {
  outColor = vec4(0.0);
}
`

const RENDER_VERTEX_SHADER = String.raw`#version 300 es
precision highp float;

layout(location = 0) in vec4 aState;
layout(location = 1) in vec2 aCorner;

uniform float uAlpha;
uniform float uTheme;
uniform vec2 uResolution;
uniform vec4 uObstacles[8];
uniform int uObstacleCount;

${SPECTRAL_FIELD_GLSL}

out float vAlpha;
out float vTheme;
out float vShade;
out float vAlong;
out float vAcross;

void main() {
  float lifetime = mix(12.0, 28.0, hash11(aState.w * 3.17));
  float life = aState.z / lifetime;
  float fade = smoothstep(0.0, 0.12, life) * (1.0 - smoothstep(0.82, 1.0, life));
  vec2 position = aState.xy;
  vec2 velocity = fieldVelocityAt(position, uTime);
  float obstacleShade = 1.0;

  for (int index = 0; index < 8; index++) {
    if (index >= uObstacleCount) {
      break;
    }
    vec4 obstacle = uObstacles[index];
    bool inside =
      position.x > obstacle.x &&
      position.x < obstacle.z &&
      position.y > obstacle.y &&
      position.y < obstacle.w;
    vec2 closest = clamp(position, obstacle.xy, obstacle.zw);
    vec2 offset = position - closest;
    float edgeDistance = length(offset);
    vec2 direction = inside
      ? normalize(position - (obstacle.xy + obstacle.zw) * 0.5 + vec2(0.0001))
      : normalize(offset + vec2(0.0001));
    float influence = inside ? 1.0 : 1.0 - smoothstep(0.0, 0.11, edgeDistance);
    position += direction * influence * 0.035;
    obstacleShade *= inside ? 0.35 : mix(0.72, 1.0, 1.0 - influence);
  }

  vec2 pixelVelocity = velocity * uResolution;
  float speed = length(pixelVelocity);
  vec2 direction =
    speed > 0.0001
      ? pixelVelocity / speed
      : vec2(cos(aState.w), sin(aState.w));
  vec2 normal = vec2(-direction.y, direction.x);
  float longTracer = step(0.94, hash11(aState.w * 9.91));
  float lengthPx =
    11.0 +
    hash11(aState.w * 4.19) * 11.0 +
    longTracer * 6.0 +
    2.0 * speed / (80.0 + speed);
  float widthPx = 1.4 + hash11(aState.w * 8.73);
  vec2 pixelToClip = vec2(2.0 / uResolution.x, 2.0 / uResolution.y);
  position +=
    (
      direction * aCorner.x * lengthPx * 0.5 +
      normal * aCorner.y * widthPx * 0.5
    ) *
    pixelToClip;

  gl_Position = vec4(position, 0.0, 1.0);
  vAlpha = mix(0.32, 0.52, hash11(aState.w * 6.41)) * fade * uAlpha * obstacleShade;
  vTheme = uTheme;
  vShade = hash11(aState.w * 5.73);
  vAlong = aCorner.x;
  vAcross = aCorner.y;
}
`

const FRAGMENT_SHADER = String.raw`#version 300 es
precision mediump float;

in float vAlpha;
in float vTheme;
in float vShade;
in float vAlong;
in float vAcross;
out vec4 outColor;

void main() {
  vec3 daylight = mix(vec3(0.10, 0.20, 0.36), vec3(0.38, 0.20, 0.44), vShade);
  vec3 night = mix(vec3(0.62, 0.78, 1.0), vec3(0.84, 0.90, 1.0), vShade);
  float sideEdge = 1.0 - smoothstep(0.88, 1.0, abs(vAcross));
  float capStart = smoothstep(0.76, 1.0, abs(vAlong));
  float capEdge = 1.0 - smoothstep(0.92, 1.0, length(vec2(capStart, vAcross)));
  float edgeAlpha = sideEdge * capEdge;
  outColor = vec4(mix(daylight, night, vTheme), vAlpha * edgeAlpha);
}
`
function hash(index: number, seed: number) {
  const value = Math.sin(index * 12.9898 + seed * 78.233) * 43758.5453
  return value - Math.floor(value)
}

function clamp(value: number, minimum: number, maximum: number) {
  return Math.min(maximum, Math.max(minimum, value))
}

function wrap(value: number, size: number) {
  return ((value % size) + size) % size
}

function smoothstep(value: number) {
  const bounded = clamp(value, 0, 1)
  return bounded * bounded * (3 - 2 * bounded)
}

function sampleFieldVelocity(
  x: number,
  y: number,
  time: number,
  modeCount: number,
  pointer: { x: number; y: number },
  impulse: Impulse | undefined,
) {
  let psiReal = 0
  let psiImaginary = 0
  let gradientXReal = 0
  let gradientXImaginary = 0
  let gradientYReal = 0
  let gradientYImaginary = 0

  const impulseAge = impulse ? time - impulse.startedAt : 100
  const impulseDistanceSquared = impulse
    ? (x - (impulse.x * 2 - 1)) ** 2 + (y - (1 - impulse.y * 2)) ** 2
    : Infinity
  const impulseBias =
    impulse && impulseAge >= 0 && impulseAge < 2.8
      ? Math.exp(-impulseDistanceSquared / 0.16) * Math.exp(-impulseAge * 1.35)
      : 0
  const pointerX = pointer.x * 2 - 1
  const pointerY = 1 - pointer.y * 2
  const pointerDistanceSquared = (x - pointerX) ** 2 + (y - pointerY) ** 2
  const pointerBias = 0.055 * Math.exp(-pointerDistanceSquared / 0.075)

  for (let mode = 0; mode < Math.min(modeCount, MODE_INDICES.length); mode++) {
    const waveNumber = FIELD_WAVE_NUMBER_SCALE * MODE_INDICES[mode]
    const waveX = waveNumber * Math.cos(FIELD_WAVE_DIRECTIONS[mode])
    const waveY = waveNumber * Math.sin(FIELD_WAVE_DIRECTIONS[mode])
    const theta =
      waveX * x +
      waveY * y -
      LAMBDAS[mode] * time +
      FIELD_MODE_PHASES[mode] +
      impulseBias * (0.35 + mode * 0.13) +
      pointerBias * (mode % 2 === 0 ? 1 : -1)
    const modeReal = FIELD_MODE_AMPLITUDES[mode] * Math.cos(theta)
    const modeImaginary = FIELD_MODE_AMPLITUDES[mode] * Math.sin(theta)
    const tangentReal = -modeImaginary
    const tangentImaginary = modeReal
    psiReal += modeReal
    psiImaginary += modeImaginary
    gradientXReal += waveX * tangentReal
    gradientXImaginary += waveX * tangentImaginary
    gradientYReal += waveY * tangentReal
    gradientYImaginary += waveY * tangentImaginary
  }

  const denominator = psiReal * psiReal + psiImaginary * psiImaginary + FIELD_EPSILON
  let velocityX =
    (FIELD_FLOW_SPEED *
      (psiReal * gradientXImaginary -
        psiImaginary * gradientXReal +
        FIELD_RADIAL_MIX * (psiReal * gradientXReal + psiImaginary * gradientXImaginary))) /
    denominator
  let velocityY =
    (FIELD_FLOW_SPEED *
      (psiReal * gradientYImaginary -
        psiImaginary * gradientYReal +
        FIELD_RADIAL_MIX * (psiReal * gradientYReal + psiImaginary * gradientYImaginary))) /
    denominator
  const speed = Math.hypot(velocityX, velocityY)
  if (speed > 0.34) {
    velocityX *= 0.34 / speed
    velocityY *= 0.34 / speed
  }
  return { x: velocityX, y: velocityY }
}
function sideWeightedPosition(index: number, seed: number) {
  const position = hash(index, seed)
  const edgePosition =
    position < 0.5
      ? 0.5 * Math.pow(position * 2, 1.45)
      : 1 - 0.5 * Math.pow((1 - position) * 2, 1.45)

  return position + (edgePosition - position) * 0.28
}

function createSpectrum(index: number, seed: number, modeCount: number, spatialPhase = 0) {
  const amplitudes = Array.from({ length: modeCount }, (_, mode) => {
    const envelope = Math.pow(mode + 1.5, -1.4)
    return envelope * (0.72 + hash(index * 19 + mode, seed) * 0.56)
  })
  const amplitudeSum = amplitudes.reduce((sum, amplitude) => sum + amplitude, 0)
  const phases = Array.from(
    { length: modeCount },
    (_, mode) => hash(index * 23 + mode, seed + 7) * TAU + spatialPhase * (mode + 1),
  )

  return {
    amplitudes: amplitudes.map((amplitude) => amplitude / amplitudeSum),
    cosPhases: phases.map(Math.cos),
    sinPhases: phases.map(Math.sin),
  }
}

function sampleSpectrum(
  spectrum: Spectrum,
  cosines: number[],
  sines: number[],
  modeCount: number,
  phaseBias = 0,
) {
  let x = 0
  let y = 0
  let velocityX = 0
  let velocityY = 0
  const biasCosine = Math.cos(phaseBias)
  const biasSine = Math.sin(phaseBias)

  for (let mode = 0; mode < Math.min(modeCount, spectrum.amplitudes.length); mode++) {
    const phaseCosine =
      cosines[mode] * spectrum.cosPhases[mode] - sines[mode] * spectrum.sinPhases[mode]
    const phaseSine =
      sines[mode] * spectrum.cosPhases[mode] + cosines[mode] * spectrum.sinPhases[mode]
    const cosine = phaseCosine * biasCosine - phaseSine * biasSine
    const sine = phaseSine * biasCosine + phaseCosine * biasSine
    const amplitude = spectrum.amplitudes[mode]
    x += amplitude * cosine
    y += amplitude * sine
    velocityX -= amplitude * LAMBDAS[mode] * sine
    velocityY += amplitude * LAMBDAS[mode] * cosine
  }

  return { x, y, velocityX, velocityY }
}

function createFireflySprite() {
  const sprite = document.createElement("canvas")
  const size = 48
  sprite.width = size
  sprite.height = size
  const context = sprite.getContext("2d")
  if (!context) return sprite

  const glow = context.createRadialGradient(size / 2, size / 2, 0, size / 2, size / 2, size / 2)
  glow.addColorStop(0, "rgba(230, 255, 220, 1)")
  glow.addColorStop(0.16, "rgba(150, 255, 170, 0.95)")
  glow.addColorStop(0.48, "rgba(80, 255, 130, 0.35)")
  glow.addColorStop(1, "rgba(50, 255, 100, 0)")
  context.fillStyle = glow
  context.fillRect(0, 0, size, size)
  return sprite
}

function createShader(
  gl: WebGL2RenderingContext,
  type: typeof gl.VERTEX_SHADER | typeof gl.FRAGMENT_SHADER,
  source: string,
) {
  const shader = gl.createShader(type)
  if (!shader) return null
  gl.shaderSource(shader, source)
  gl.compileShader(shader)
  if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
    console.warn("Field shader compilation failed:", gl.getShaderInfoLog(shader))
    gl.deleteShader(shader)
    return null
  }
  return shader
}

function createProgram(
  gl: WebGL2RenderingContext,
  vertexSource: string,
  fragmentSource: string,
  transformVaryings?: string[],
) {
  const vertexShader = createShader(gl, gl.VERTEX_SHADER, vertexSource)
  const fragmentShader = createShader(gl, gl.FRAGMENT_SHADER, fragmentSource)
  if (!vertexShader || !fragmentShader) {
    if (vertexShader) gl.deleteShader(vertexShader)
    if (fragmentShader) gl.deleteShader(fragmentShader)
    return null
  }

  const program = gl.createProgram()
  if (!program) {
    gl.deleteShader(vertexShader)
    gl.deleteShader(fragmentShader)
    return null
  }
  gl.attachShader(program, vertexShader)
  gl.attachShader(program, fragmentShader)
  if (transformVaryings) {
    gl.transformFeedbackVaryings(program, transformVaryings, gl.INTERLEAVED_ATTRIBS)
  }
  gl.linkProgram(program)
  gl.deleteShader(vertexShader)
  gl.deleteShader(fragmentShader)

  if (!gl.getProgramParameter(program, gl.LINK_STATUS)) {
    console.warn("Field program linking failed:", gl.getProgramInfoLog(program))
    gl.deleteProgram(program)
    return null
  }
  return program
}

function createFieldRenderer(canvas: HTMLCanvasElement) {
  const gl = canvas.getContext("webgl2", {
    alpha: true,
    antialias: true,
    depth: false,
    powerPreference: "high-performance",
    premultipliedAlpha: false,
  })
  if (!gl) return null

  const updateProgram = createProgram(gl, UPDATE_VERTEX_SHADER, UPDATE_FRAGMENT_SHADER, ["vState"])
  const renderProgram = createProgram(gl, RENDER_VERTEX_SHADER, FRAGMENT_SHADER)
  if (!updateProgram || !renderProgram) {
    if (updateProgram) gl.deleteProgram(updateProgram)
    if (renderProgram) gl.deleteProgram(renderProgram)
    return null
  }

  const initialStates = new Float32Array(MAX_TRACERS * 4)
  for (let tracer = 0; tracer < MAX_TRACERS; tracer++) {
    const seed = tracer + 1
    const lifetime = 12 + hash(seed, 37) * 16
    initialStates.set(
      [
        sideWeightedPosition(tracer, 31) * 2.08 - 1.04,
        hash(tracer, 32) * 2.08 - 1.04,
        hash(tracer, 33) * lifetime,
        seed,
      ],
      tracer * 4,
    )
  }

  const stateBufferA = gl.createBuffer()
  const stateBufferB = gl.createBuffer()
  const quadBuffer = gl.createBuffer()
  if (!stateBufferA || !stateBufferB || !quadBuffer) {
    if (stateBufferA) gl.deleteBuffer(stateBufferA)
    if (stateBufferB) gl.deleteBuffer(stateBufferB)
    if (quadBuffer) gl.deleteBuffer(quadBuffer)
    gl.deleteProgram(updateProgram)
    gl.deleteProgram(renderProgram)
    return null
  }
  const stateBuffers = [stateBufferA, stateBufferB]
  for (const buffer of stateBuffers) {
    gl.bindBuffer(gl.ARRAY_BUFFER, buffer)
    gl.bufferData(gl.ARRAY_BUFFER, initialStates, gl.DYNAMIC_COPY)
  }

  gl.bindBuffer(gl.ARRAY_BUFFER, quadBuffer)
  gl.bufferData(
    gl.ARRAY_BUFFER,
    new Float32Array([-1, -1, 1, -1, 1, 1, -1, -1, 1, 1, -1, 1]),
    gl.STATIC_DRAW,
  )

  const createUpdateVertexArray = (stateBuffer: WebGLBuffer) => {
    const vertexArray = gl.createVertexArray()
    if (!vertexArray) return null
    gl.bindVertexArray(vertexArray)
    gl.bindBuffer(gl.ARRAY_BUFFER, stateBuffer)
    gl.enableVertexAttribArray(0)
    gl.vertexAttribPointer(0, 4, gl.FLOAT, false, 4 * Float32Array.BYTES_PER_ELEMENT, 0)
    return vertexArray
  }

  const createRenderVertexArray = (stateBuffer: WebGLBuffer) => {
    const vertexArray = gl.createVertexArray()
    if (!vertexArray) return null
    gl.bindVertexArray(vertexArray)
    gl.bindBuffer(gl.ARRAY_BUFFER, stateBuffer)
    gl.enableVertexAttribArray(0)
    gl.vertexAttribPointer(0, 4, gl.FLOAT, false, 4 * Float32Array.BYTES_PER_ELEMENT, 0)
    gl.vertexAttribDivisor(0, 1)
    gl.bindBuffer(gl.ARRAY_BUFFER, quadBuffer)
    gl.enableVertexAttribArray(1)
    gl.vertexAttribPointer(1, 2, gl.FLOAT, false, 2 * Float32Array.BYTES_PER_ELEMENT, 0)
    gl.vertexAttribDivisor(1, 0)
    return vertexArray
  }

  const updateVertexArrayA = createUpdateVertexArray(stateBufferA)
  const updateVertexArrayB = createUpdateVertexArray(stateBufferB)
  const renderVertexArrayA = createRenderVertexArray(stateBufferA)
  const renderVertexArrayB = createRenderVertexArray(stateBufferB)
  if (!updateVertexArrayA || !updateVertexArrayB || !renderVertexArrayA || !renderVertexArrayB) {
    for (const vertexArray of [
      updateVertexArrayA,
      updateVertexArrayB,
      renderVertexArrayA,
      renderVertexArrayB,
    ]) {
      if (vertexArray) gl.deleteVertexArray(vertexArray)
    }
    for (const buffer of stateBuffers) gl.deleteBuffer(buffer)
    gl.deleteBuffer(quadBuffer)
    gl.deleteProgram(updateProgram)
    gl.deleteProgram(renderProgram)
    return null
  }
  const updateVertexArrays = [updateVertexArrayA, updateVertexArrayB]
  const renderVertexArrays = [renderVertexArrayA, renderVertexArrayB]
  gl.bindVertexArray(null)
  gl.bindBuffer(gl.ARRAY_BUFFER, null)

  const updateUniforms = {
    time: gl.getUniformLocation(updateProgram, "uTime"),
    deltaTime: gl.getUniformLocation(updateProgram, "uDeltaTime"),
    modeCount: gl.getUniformLocation(updateProgram, "uModeCount"),
    pointer: gl.getUniformLocation(updateProgram, "uPointer"),
    impulse: gl.getUniformLocation(updateProgram, "uImpulse"),
    lambda: gl.getUniformLocation(updateProgram, "uLambda[0]"),
  }
  const renderUniforms = {
    time: gl.getUniformLocation(renderProgram, "uTime"),
    alpha: gl.getUniformLocation(renderProgram, "uAlpha"),
    theme: gl.getUniformLocation(renderProgram, "uTheme"),
    modeCount: gl.getUniformLocation(renderProgram, "uModeCount"),
    resolution: gl.getUniformLocation(renderProgram, "uResolution"),
    pointer: gl.getUniformLocation(renderProgram, "uPointer"),
    impulse: gl.getUniformLocation(renderProgram, "uImpulse"),
    lambda: gl.getUniformLocation(renderProgram, "uLambda[0]"),
    obstacles: gl.getUniformLocation(renderProgram, "uObstacles[0]"),
    obstacleCount: gl.getUniformLocation(renderProgram, "uObstacleCount"),
  }

  gl.enable(gl.BLEND)
  gl.blendFunc(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA)

  let stateIndex = 0
  let lastTime: number | null = null

  const resize = (width: number, height: number, pixelRatio: number) => {
    canvas.width = Math.max(1, Math.floor(width * pixelRatio))
    canvas.height = Math.max(1, Math.floor(height * pixelRatio))
    canvas.style.width = width + "px"
    canvas.style.height = height + "px"
    gl.viewport(0, 0, canvas.width, canvas.height)
  }

  const setFlowUniforms = (
    programUniforms: {
      time: WebGLUniformLocation | null
      modeCount: WebGLUniformLocation | null
      pointer: WebGLUniformLocation | null
      impulse: WebGLUniformLocation | null
      lambda: WebGLUniformLocation | null
    },
    time: number,
    modeCount: number,
    pointer: { x: number; y: number },
    impulse: Impulse | undefined,
  ) => {
    gl.uniform1f(programUniforms.time, time)
    gl.uniform1f(programUniforms.modeCount, modeCount)
    gl.uniform2f(programUniforms.pointer, pointer.x * 2 - 1, 1 - pointer.y * 2)
    gl.uniform4f(
      programUniforms.impulse,
      impulse ? impulse.x * 2 - 1 : -4,
      impulse ? 1 - impulse.y * 2 : -4,
      impulse?.startedAt ?? -100,
      impulse ? 1 : 0,
    )
    gl.uniform1fv(programUniforms.lambda, LAMBDAS)
  }

  const render = ({
    time,
    alpha,
    theme,
    modeCount,
    tracerCount,
    width,
    height,
    pointer,
    impulse,
    obstacles,
  }: {
    time: number
    alpha: number
    theme: number
    modeCount: number
    tracerCount: number
    width: number
    height: number
    pointer: { x: number; y: number }
    impulse: Impulse | undefined
    obstacles: Obstacle[]
  }) => {
    gl.clearColor(0, 0, 0, 0)
    gl.clear(gl.COLOR_BUFFER_BIT)

    const deltaTime = lastTime === null ? 0 : clamp(time - lastTime, 0, 0.05)
    lastTime = time
    const activeCount = Math.min(tracerCount, MAX_TRACERS)
    if (alpha <= 0.001 || activeCount <= 0) return

    const writeIndex = 1 - stateIndex
    gl.useProgram(updateProgram)
    setFlowUniforms(updateUniforms, time, modeCount, pointer, impulse)
    gl.uniform1f(updateUniforms.deltaTime, deltaTime)
    gl.bindVertexArray(updateVertexArrays[stateIndex])
    gl.bindBufferBase(gl.TRANSFORM_FEEDBACK_BUFFER, 0, stateBuffers[writeIndex])
    gl.enable(gl.RASTERIZER_DISCARD)
    gl.beginTransformFeedback(gl.POINTS)
    gl.drawArrays(gl.POINTS, 0, activeCount)
    gl.endTransformFeedback()
    gl.disable(gl.RASTERIZER_DISCARD)
    gl.bindBufferBase(gl.TRANSFORM_FEEDBACK_BUFFER, 0, null)
    gl.bindVertexArray(null)
    stateIndex = writeIndex

    const obstacleData = new Float32Array(MAX_OBSTACLES * 4)
    obstacles.slice(0, MAX_OBSTACLES).forEach((obstacle, index) => {
      obstacleData.set(
        [
          (obstacle.left / width) * 2 - 1,
          1 - (obstacle.bottom / height) * 2,
          (obstacle.right / width) * 2 - 1,
          1 - (obstacle.top / height) * 2,
        ],
        index * 4,
      )
    })

    gl.useProgram(renderProgram)
    setFlowUniforms(renderUniforms, time, modeCount, pointer, impulse)
    gl.uniform1f(renderUniforms.alpha, alpha)
    gl.uniform1f(renderUniforms.theme, theme)
    gl.uniform2f(renderUniforms.resolution, width, height)
    gl.uniform4fv(renderUniforms.obstacles, obstacleData)
    gl.uniform1i(renderUniforms.obstacleCount, Math.min(obstacles.length, MAX_OBSTACLES))
    gl.bindVertexArray(renderVertexArrays[stateIndex])
    gl.drawArraysInstanced(gl.TRIANGLES, 0, 6, activeCount)
    gl.bindVertexArray(null)
  }

  const destroy = () => {
    for (const vertexArray of [...updateVertexArrays, ...renderVertexArrays]) {
      gl.deleteVertexArray(vertexArray)
    }
    for (const buffer of stateBuffers) gl.deleteBuffer(buffer)
    gl.deleteBuffer(quadBuffer)
    gl.deleteProgram(updateProgram)
    gl.deleteProgram(renderProgram)
    gl.getExtension("WEBGL_lose_context")?.loseContext()
  }

  return { resize, render, destroy }
}
function pointShade(x: number, y: number, obstacles: Obstacle[]) {
  for (const obstacle of obstacles) {
    if (x >= obstacle.left && x <= obstacle.right && y >= obstacle.top && y <= obstacle.bottom) {
      return 0.55
    }
  }
  return 1
}

export default function FieldScene() {
  const speciesCanvasRef = useRef<HTMLCanvasElement>(null)
  const fieldCanvasRef = useRef<HTMLCanvasElement>(null)
  const frontCanvasRef = useRef<HTMLCanvasElement>(null)
  const { isDark } = useTheme()
  const { performanceMode } = useFieldMode()
  const darkRef = useRef(isDark)
  const modeRef = useRef(performanceMode)

  useEffect(() => {
    darkRef.current = isDark
  }, [isDark])

  useEffect(() => {
    modeRef.current = performanceMode
    document.documentElement.dataset.performanceMode = performanceMode
  }, [performanceMode])

  useEffect(() => {
    const speciesCanvas = speciesCanvasRef.current
    const fieldCanvas = fieldCanvasRef.current
    const frontCanvas = frontCanvasRef.current
    if (!speciesCanvas || !fieldCanvas || !frontCanvas) return

    const speciesContext = speciesCanvas.getContext("2d", { alpha: true })
    const frontContext = frontCanvas.getContext("2d", { alpha: true })
    if (!speciesContext || !frontContext) return

    const sakura = Array.from({ length: EFFECT_COUNTS.sakura }, (_, index) => ({
      x0: sideWeightedPosition(index, 1),
      y0: hash(index, 2),
      wind: -4 + hash(index, 3) * 8,
      a: 18 + hash(index, 4) * 34,
      b: 6 + hash(index, 5) * 16,
      w: 0.28 + hash(index, 6) * 0.38,
      phi: hash(index, 7) * TAU,
      psi: hash(index, 8) * TAU,
      fallSpeed: 24 + hash(index, 9) * 34,
      theta0: hash(index, 10) * TAU,
      spin: -0.8 + hash(index, 11) * 1.6,
      twist: 0.25 + hash(index, 12) * 0.65,
      nu: 0.45 + hash(index, 13) * 0.55,
      eta: hash(index, 14) * TAU,
      mu: 0.55 + hash(index, 15) * 0.65,
      xi: hash(index, 16) * TAU,
      size: 7 + hash(index, 17) * 8,
      opacity: 0.38 + hash(index, 18) * 0.32,
      spectrum: createSpectrum(index, 101, 4),
    }))
    const fireflies = Array.from({ length: EFFECT_COUNTS.fireflies }, (_, index) => ({
      x0: 0.04 + sideWeightedPosition(index, 1) * 0.92,
      y0: 0.08 + hash(index, 2) * 0.76,
      a: 20 + hash(index, 3) * 44,
      b: 7 + hash(index, 4) * 18,
      c: 16 + hash(index, 5) * 36,
      d: 6 + hash(index, 6) * 16,
      wx: 0.18 + hash(index, 7) * 0.28,
      wy: 0.16 + hash(index, 8) * 0.26,
      phi: hash(index, 9) * TAU,
      psi: hash(index, 10) * TAU,
      eta: hash(index, 11) * TAU,
      xi: hash(index, 12) * TAU,
      glowFrequency: 0.5 + hash(index, 13) * 0.65,
      glowPhase: hash(index, 14) * TAU,
      radius: 2.2 + hash(index, 15) * 2.4,
      spectrum: createSpectrum(index, 202, 4),
    }))
    const grass = Array.from({ length: EFFECT_COUNTS.grass }, (_, index) => {
      const x = (index + 0.5 + (hash(index, 1) - 0.5) * 0.55) / EFFECT_COUNTS.grass
      return {
        x,
        height: 30 + hash(index, 2) * 52,
        width: 1 + hash(index, 3) * 1.8,
        baseAngle: -0.07 + hash(index, 4) * 0.14,
        amplitude: 0.08 + hash(index, 5) * 0.12,
        secondaryAmplitude: 0.025 + hash(index, 6) * 0.065,
        phase: hash(index, 7) * TAU,
        opacity: 0.24 + hash(index, 8) * 0.34,
        spectrum: createSpectrum(index, 303, 3, x * TAU * 2.2),
      }
    })
    const foregroundTracers = Array.from({ length: EFFECT_COUNTS.foregroundTracer }, (_, index) => {
      const seed = index + 10001
      const lifetime = 12 + hash(seed, 406) * 16
      return {
        x: sideWeightedPosition(index, 401) * 2.08 - 1.04,
        y: hash(index, 402) * 2.08 - 1.04,
        age: hash(index, 407) * lifetime,
        seed,
      }
    })
    const danmaku = siteConfig.danmakuList.length
      ? Array.from({ length: EFFECT_COUNTS.danmaku }, (_, index) => ({
          text: siteConfig.danmakuList[Math.floor(hash(index, 1) * siteConfig.danmakuList.length)],
          y: 0.12 + hash(index, 2) * 0.36,
          speed: 24 + hash(index, 3) * 18,
          phase: hash(index, 4) * 42,
        }))
      : []
    const fireflySprite = createFireflySprite()
    const desktopQuery = window.matchMedia("(min-width: 768px)")
    const reducedMotionQuery = window.matchMedia("(prefers-reduced-motion: reduce)")
    const ripples: Ripple[] = []
    const impulses: Impulse[] = []
    const pointer = { x: -2, y: -2 }
    let obstacles: Obstacle[] = []
    let lastObstacleSample = -1000
    let fieldRenderer: ReturnType<typeof createFieldRenderer> = null
    let width = 0
    let height = 0
    let animationFrame = 0
    let lastFrame = 0
    let startTime = performance.now()
    let fieldBlend = modeRef.current === "field" ? 1 : 0
    let themeBlend = darkRef.current ? 1 : 0
    let qualityIndex = 0
    let frameCount = 0
    let frameWindowStartedAt = performance.now()
    let lowFpsWindows = 0

    const resize2dCanvas = (
      canvas: HTMLCanvasElement,
      context: CanvasRenderingContext2D,
      pixelRatio: number,
    ) => {
      canvas.width = Math.max(1, Math.floor(width * pixelRatio))
      canvas.height = Math.max(1, Math.floor(height * pixelRatio))
      canvas.style.width = width + "px"
      canvas.style.height = height + "px"
      context.setTransform(pixelRatio, 0, 0, pixelRatio, 0, 0)
    }

    const resizeCanvases = () => {
      width = window.innerWidth
      height = window.innerHeight
      const normalRatio = Math.min(window.devicePixelRatio || 1, NORMAL_PIXEL_RATIO)
      const fieldRatio = Math.min(
        window.devicePixelRatio || 1,
        FIELD_QUALITY[qualityIndex].pixelRatio,
      )
      resize2dCanvas(speciesCanvas, speciesContext, normalRatio)
      resize2dCanvas(frontCanvas, frontContext, fieldRatio)
      fieldRenderer?.resize(width, height, fieldRatio)
      lastObstacleSample = -1000
    }

    const sampleObstacles = (now: number) => {
      if (now - lastObstacleSample < 350) return
      lastObstacleSample = now
      obstacles = Array.from(document.querySelectorAll<HTMLElement>("[data-field-obstacle]"))
        .map((element) => element.getBoundingClientRect())
        .filter(
          (rect) =>
            rect.width > 20 &&
            rect.height > 20 &&
            rect.bottom > 0 &&
            rect.top < height &&
            rect.right > 0 &&
            rect.left < width,
        )
        .slice(0, MAX_OBSTACLES)
        .map((rect) => ({
          left: rect.left,
          top: rect.top,
          right: rect.right,
          bottom: rect.bottom,
        }))
    }

    const drawSpecies = (time: number, cosines: number[], sines: number[], modeCount: number) => {
      speciesContext.clearRect(0, 0, width, height)
      const fieldAmount = smoothstep(fieldBlend)

      speciesContext.font = '700 18px "Source Han Serif SC", "Noto Serif SC", serif'
      speciesContext.textBaseline = "middle"
      const danmakuAlpha = (0.3 * (1 - themeBlend) + 0.1 * themeBlend) * (1 - fieldAmount * 0.5)
      speciesContext.fillStyle = "rgba(255, 255, 255, " + danmakuAlpha + ")"
      for (const item of danmaku) {
        const textWidth = speciesContext.measureText(item.text).width
        const distance = width + textWidth
        const x = width - ((item.speed * (time + item.phase)) % distance)
        speciesContext.fillText(item.text, x, height * item.y)
      }

      const daylight = 1 - themeBlend
      if (daylight > 0.001) {
        for (const petal of sakura) {
          const spectral = sampleSpectrum(petal.spectrum, cosines, sines, Math.min(4, modeCount))
          const margin = petal.size * 2
          const normalX =
            petal.x0 * width +
            petal.wind * time +
            petal.a * Math.sin(petal.w * time + petal.phi) +
            petal.b * Math.sin(PHI * petal.w * time + petal.psi)
          const fieldX = petal.x0 * width + spectral.x * (42 + petal.a)
          const x =
            wrap(normalX + (fieldX - normalX) * fieldAmount + margin, width + margin * 2) - margin
          const normalY = petal.y0 * height + petal.fallSpeed * time
          const fieldY = normalY + spectral.y * 18
          const y =
            wrap(normalY + (fieldY - normalY) * fieldAmount + margin, height + margin * 2) - margin
          const angle =
            petal.theta0 + petal.spin * time + petal.twist * Math.sin(petal.nu * time + petal.eta)
          const squash = 0.75 + 0.25 * Math.sin(petal.mu * time + petal.xi)

          speciesContext.save()
          speciesContext.globalAlpha = daylight
          speciesContext.translate(x, y)
          speciesContext.rotate(angle)
          speciesContext.scale(squash, 1)
          speciesContext.fillStyle = "rgba(249, 168, 212, " + petal.opacity + ")"
          speciesContext.beginPath()
          speciesContext.moveTo(0, -petal.size * 0.65)
          speciesContext.bezierCurveTo(
            petal.size * 0.65,
            -petal.size * 0.2,
            petal.size * 0.5,
            petal.size * 0.65,
            0,
            petal.size * 0.7,
          )
          speciesContext.bezierCurveTo(
            -petal.size * 0.45,
            petal.size * 0.55,
            -petal.size * 0.55,
            -petal.size * 0.2,
            0,
            -petal.size * 0.65,
          )
          speciesContext.fill()
          speciesContext.restore()
        }
      }

      if (themeBlend > 0.001) {
        for (const firefly of fireflies) {
          const spectral = sampleSpectrum(firefly.spectrum, cosines, sines, Math.min(4, modeCount))
          const normalX =
            firefly.x0 * width +
            firefly.a * Math.sin(firefly.wx * time + firefly.phi) +
            firefly.b * Math.sin(Math.SQRT2 * firefly.wx * time + firefly.psi)
          const normalY =
            firefly.y0 * height +
            firefly.c * Math.sin(firefly.wy * time + firefly.eta) +
            firefly.d * Math.sin(Math.sqrt(3) * firefly.wy * time + firefly.xi)
          const fieldX = firefly.x0 * width + spectral.x * (36 + firefly.a)
          const fieldY = firefly.y0 * height + spectral.y * (32 + firefly.c)
          const x = normalX + (fieldX - normalX) * fieldAmount
          const y = normalY + (fieldY - normalY) * fieldAmount
          const breathe = 0.5 + 0.5 * Math.sin(firefly.glowFrequency * time + firefly.glowPhase)
          const radius = firefly.radius * (0.85 + 0.25 * breathe)
          const glowSize = radius * 9

          speciesContext.globalAlpha = themeBlend * (0.15 + 0.85 * breathe)
          speciesContext.drawImage(
            fireflySprite,
            x - glowSize / 2,
            y - glowSize / 2,
            glowSize,
            glowSize,
          )
        }
      }
      speciesContext.globalAlpha = 1

      const windFrequency = 0.8
      const waveNumber = (TAU * 2.2) / Math.max(width, 1)
      const gust = 0.7 + 0.3 * Math.sin(0.17 * time) + 0.12 * Math.sin(Math.SQRT2 * 0.17 * time)
      speciesContext.lineCap = "round"
      const lightGrass = [16, 185, 129]
      const darkGrass = [226, 232, 240]
      speciesContext.strokeStyle =
        "rgb(" +
        Math.round(lightGrass[0] + (darkGrass[0] - lightGrass[0]) * themeBlend) +
        ", " +
        Math.round(lightGrass[1] + (darkGrass[1] - lightGrass[1]) * themeBlend) +
        ", " +
        Math.round(lightGrass[2] + (darkGrass[2] - lightGrass[2]) * themeBlend) +
        ")"

      for (const blade of grass) {
        const x = blade.x * width
        const wave1 = Math.sin(windFrequency * time - waveNumber * x)
        const wave2 = Math.sin(
          Math.SQRT2 * windFrequency * time - 0.63 * waveNumber * x + blade.phase,
        )
        const normalAngle =
          blade.baseAngle + gust * (blade.amplitude * wave1 + blade.secondaryAmplitude * wave2)
        const spectral = sampleSpectrum(blade.spectrum, cosines, sines, Math.min(3, modeCount))
        const fieldAngle = blade.baseAngle + spectral.x * (blade.amplitude * 1.15)
        const angle = normalAngle + (fieldAngle - normalAngle) * fieldAmount
        const tipX = x + Math.sin(angle) * blade.height
        const tipY = height - Math.cos(angle) * blade.height

        speciesContext.globalAlpha = blade.opacity
        speciesContext.lineWidth = blade.width
        speciesContext.beginPath()
        speciesContext.moveTo(x, height + 2)
        speciesContext.quadraticCurveTo(
          x + Math.sin(angle) * blade.height * 0.35,
          height - blade.height * 0.55,
          tipX,
          tipY,
        )
        speciesContext.stroke()
      }
      speciesContext.globalAlpha = 1
    }

    const drawFront = (time: number, deltaTime: number, quality: FieldQuality) => {
      frontContext.clearRect(0, 0, width, height)

      const frontAlpha = smoothstep((fieldBlend - 0.58) / 0.42)
      if (frontAlpha > 0.001) {
        frontContext.lineCap = "round"
        frontContext.strokeStyle = themeBlend > 0.5 ? "rgb(218, 232, 255)" : "rgb(48, 63, 112)"
        const latestImpulse = impulses[impulses.length - 1]
        const step = Math.min(deltaTime, 0.05)

        for (let index = 0; index < quality.foregroundCount; index++) {
          const tracer = foregroundTracers[index]
          const lifetime = 12 + hash(tracer.seed, 406) * 16
          tracer.age += step

          if (tracer.age >= lifetime) {
            tracer.seed += 7919
            tracer.age = 0
            tracer.x = sideWeightedPosition(tracer.seed, 409) * 2.08 - 1.04
            tracer.y = hash(tracer.seed, 410) * 2.08 - 1.04
          } else if (step > 0) {
            const firstVelocity = sampleFieldVelocity(
              tracer.x,
              tracer.y,
              time - step,
              quality.modeCount,
              pointer,
              latestImpulse,
            )
            const midpointX = tracer.x + firstVelocity.x * step * 0.5
            const midpointY = tracer.y + firstVelocity.y * step * 0.5
            const midpointVelocity = sampleFieldVelocity(
              midpointX,
              midpointY,
              time - step * 0.5,
              quality.modeCount,
              pointer,
              latestImpulse,
            )
            tracer.x = wrap(tracer.x + midpointVelocity.x * step + 1.08, 2.16) - 1.08
            tracer.y = wrap(tracer.y + midpointVelocity.y * step + 1.08, 2.16) - 1.08
          }

          const life = tracer.age / lifetime
          const fade = smoothstep(life / 0.12) * (1 - smoothstep((life - 0.82) / 0.18))
          const velocity = sampleFieldVelocity(
            tracer.x,
            tracer.y,
            time,
            quality.modeCount,
            pointer,
            latestImpulse,
          )
          const pixelVelocityX = velocity.x * width
          const pixelVelocityY = -velocity.y * height
          const speed = Math.hypot(pixelVelocityX, pixelVelocityY)
          const directionX = speed > 0.0001 ? pixelVelocityX / speed : Math.cos(tracer.seed)
          const directionY = speed > 0.0001 ? pixelVelocityY / speed : Math.sin(tracer.seed)
          const x = ((tracer.x + 1) * width) / 2
          const y = ((1 - tracer.y) * height) / 2
          const length = 11 + hash(tracer.seed, 404) * 13 + (2.5 * speed) / (80 + speed)
          const shade = pointShade(x, y, obstacles)

          frontContext.globalAlpha =
            (0.14 + hash(tracer.seed, 405) * 0.1) * fade * frontAlpha * shade
          frontContext.lineWidth = 1 + hash(tracer.seed, 411) * 0.7
          frontContext.beginPath()
          frontContext.moveTo(x - directionX * length * 0.5, y - directionY * length * 0.5)
          frontContext.lineTo(x + directionX * length * 0.5, y + directionY * length * 0.5)
          frontContext.stroke()
        }
      }
      for (let index = ripples.length - 1; index >= 0; index--) {
        const ripple = ripples[index]
        ripple.radius += ripple.velocity
        ripple.velocity *= 0.96
        ripple.opacity -= 0.015
        if (ripple.opacity <= 0) {
          ripples.splice(index, 1)
          continue
        }
        frontContext.globalAlpha = ripple.opacity
        frontContext.strokeStyle = "rgb(129, 140, 248)"
        frontContext.lineWidth = 2
        frontContext.shadowBlur = 15
        frontContext.shadowColor = "rgba(129, 140, 248, 0.5)"
        frontContext.beginPath()
        frontContext.arc(ripple.x, ripple.y, ripple.radius, 0, TAU)
        frontContext.stroke()
      }
      frontContext.shadowBlur = 0
      frontContext.globalAlpha = 1
    }

    const renderFrame = (now: number, force = false) => {
      const elapsedSinceLastFrame = now - lastFrame
      const quality = FIELD_QUALITY[qualityIndex]
      const transitioning = fieldBlend > 0.001 && fieldBlend < 0.999
      const targetFrameMs =
        modeRef.current === "field" || transitioning ? quality.frameMs : NORMAL_FRAME_MS
      if (!force && elapsedSinceLastFrame < targetFrameMs) return
      lastFrame = now - (elapsedSinceLastFrame % targetFrameMs)

      const deltaSeconds = clamp(elapsedSinceLastFrame / 1000, 0, 0.1)

      if (reducedMotionQuery.matches) {
        fieldBlend = modeRef.current === "field" ? 1 : 0
        themeBlend = darkRef.current ? 1 : 0
      } else {
        const fieldTarget = modeRef.current === "field" ? 1 : 0
        const themeTarget = darkRef.current ? 1 : 0
        fieldBlend += clamp(fieldTarget - fieldBlend, -deltaSeconds / 0.9, deltaSeconds / 0.9)
        themeBlend += clamp(themeTarget - themeBlend, -deltaSeconds, deltaSeconds)
      }

      const time = (now - startTime) / 1000
      const cosines = LAMBDAS.map((lambda) => Math.cos(lambda * time))
      const sines = LAMBDAS.map((lambda) => Math.sin(lambda * time))
      sampleObstacles(now)
      drawSpecies(time, cosines, sines, quality.modeCount)

      if (fieldBlend > 0.001) {
        if (!fieldRenderer) {
          fieldRenderer = createFieldRenderer(fieldCanvas)
          fieldRenderer?.resize(
            width,
            height,
            Math.min(window.devicePixelRatio || 1, quality.pixelRatio),
          )
        }
        const areaCount = Math.round((width * height * 1800) / (1920 * 1080))
        const tracerCount = Math.round(clamp(areaCount, 1200, MAX_TRACERS) * quality.tracerRatio)
        fieldRenderer?.render({
          time,
          alpha: smoothstep(fieldBlend),
          theme: themeBlend,
          modeCount: quality.modeCount,
          tracerCount,
          width,
          height,
          pointer,
          impulse: impulses[impulses.length - 1],
          obstacles,
        })
      } else {
        fieldRenderer?.render({
          time,
          alpha: 0,
          theme: themeBlend,
          modeCount: quality.modeCount,
          tracerCount: 0,
          width,
          height,
          pointer,
          impulse: undefined,
          obstacles,
        })
      }

      drawFront(time, fieldBlend > 0.001 ? deltaSeconds : 0, quality)
      while (impulses.length && time - impulses[0].startedAt > 3) impulses.shift()

      if (modeRef.current === "field" && !reducedMotionQuery.matches) {
        frameCount += 1
        if (now - frameWindowStartedAt >= 2000) {
          const fps = (frameCount * 1000) / (now - frameWindowStartedAt)
          lowFpsWindows = fps < 42 ? lowFpsWindows + 1 : 0
          frameCount = 0
          frameWindowStartedAt = now
          if (lowFpsWindows >= 3 && qualityIndex < FIELD_QUALITY.length - 1) {
            qualityIndex += 1
            lowFpsWindows = 0
            resizeCanvases()
          }
        }
      } else {
        frameCount = 0
        frameWindowStartedAt = now
        lowFpsWindows = 0
      }
    }

    const stopAnimation = () => {
      if (!animationFrame) return
      window.cancelAnimationFrame(animationFrame)
      animationFrame = 0
    }

    const animate = (now: number) => {
      renderFrame(now)
      animationFrame = window.requestAnimationFrame(animate)
    }

    const syncAnimation = () => {
      stopAnimation()
      if (!desktopQuery.matches) {
        speciesCanvas.width = 1
        fieldCanvas.width = 1
        frontCanvas.width = 1
        return
      }
      resizeCanvases()
      const now = performance.now()
      if (!lastFrame) {
        startTime = now
        lastFrame = now - NORMAL_FRAME_MS
      }
      renderFrame(now, true)
      if (document.visibilityState === "visible" && !reducedMotionQuery.matches) {
        animationFrame = window.requestAnimationFrame(animate)
      }
    }

    const handleResize = () => {
      if (!desktopQuery.matches) return
      resizeCanvases()
      renderFrame(performance.now(), true)
    }

    const handleScroll = () => {
      lastObstacleSample = -1000
    }

    const handleClick = (event: MouseEvent) => {
      if (modeRef.current === "field") {
        impulses.push({
          x: event.clientX / Math.max(width, 1),
          y: event.clientY / Math.max(height, 1),
          startedAt: (performance.now() - startTime) / 1000,
        })
        if (impulses.length > 4) impulses.shift()
      } else {
        ripples.push({
          x: event.clientX,
          y: event.clientY,
          radius: 0,
          opacity: 0.6,
          velocity: 2.5,
        })
      }
    }

    const handlePointerMove = (event: PointerEvent) => {
      pointer.x = event.clientX / Math.max(width, 1)
      pointer.y = event.clientY / Math.max(height, 1)
    }

    window.addEventListener("resize", handleResize)
    window.addEventListener("scroll", handleScroll, { passive: true })
    window.addEventListener("click", handleClick)
    window.addEventListener("pointermove", handlePointerMove, { passive: true })
    document.addEventListener("visibilitychange", syncAnimation)
    desktopQuery.addEventListener("change", syncAnimation)
    reducedMotionQuery.addEventListener("change", syncAnimation)
    syncAnimation()

    return () => {
      stopAnimation()
      fieldRenderer?.destroy()
      window.removeEventListener("resize", handleResize)
      window.removeEventListener("scroll", handleScroll)
      window.removeEventListener("click", handleClick)
      window.removeEventListener("pointermove", handlePointerMove)
      document.removeEventListener("visibilitychange", syncAnimation)
      desktopQuery.removeEventListener("change", syncAnimation)
      reducedMotionQuery.removeEventListener("change", syncAnimation)
    }
  }, [])

  return (
    <>
      <canvas
        ref={speciesCanvasRef}
        className="pointer-events-none fixed inset-0 z-[2] hidden h-full w-full md:block"
        data-field-layer="species"
        aria-hidden="true"
      />
      <canvas
        ref={fieldCanvasRef}
        className="pointer-events-none fixed inset-0 z-[3] hidden h-full w-full md:block"
        data-field-layer="back"
        aria-hidden="true"
      />
      <canvas
        ref={frontCanvasRef}
        className="pointer-events-none fixed inset-0 z-20 hidden h-full w-full md:block"
        data-field-layer="front"
        aria-hidden="true"
      />
    </>
  )
}
