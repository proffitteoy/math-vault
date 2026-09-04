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
const FIELD_MODE_PHASES = [0.31, 2.17, 4.02, 5.41, 1.24, 3.52] as const
const ORBIT_AMPLITUDES = [0.42, 0.36, 0.3, 0.25, 0.2, 0.16] as const
const FIELD_TRACER_COUNT = 600
const TRACER_COVER_SECONDS = 180
const TRAIL_SAMPLES = 16
const TRAIL_SEGMENTS = TRAIL_SAMPLES - 1
const MAX_OBSTACLES = 8
const EFFECT_COUNTS = {
  sakura: 40,
  fireflies: 50,
  grass: 150,
  danmaku: 15,
  foregroundTracer: 90,
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

type Ripple = {
  x: number
  y: number
  radius: number
  opacity: number
  velocity: number
}

type OrbitTracer = {
  seed: number
  timeJitter: number
  brightness: number
  trailDuration: number
  widthScale: number
}

type FieldQuality = {
  foregroundCount: number
  tracerRatio: number
  pixelRatio: number
  modeCount: number
  frameMs: number
}

const FIELD_QUALITY: FieldQuality[] = [
  { foregroundCount: 90, tracerRatio: 1, pixelRatio: 1.5, modeCount: 6, frameMs: 1000 / 60 },
  { foregroundCount: 48, tracerRatio: 1, pixelRatio: 1.5, modeCount: 6, frameMs: 1000 / 60 },
  { foregroundCount: 48, tracerRatio: 0.68, pixelRatio: 1.5, modeCount: 6, frameMs: 1000 / 60 },
  { foregroundCount: 48, tracerRatio: 0.68, pixelRatio: 1, modeCount: 6, frameMs: 1000 / 60 },
  { foregroundCount: 48, tracerRatio: 0.68, pixelRatio: 1, modeCount: 4, frameMs: 1000 / 45 },
  { foregroundCount: 32, tracerRatio: 0.55, pixelRatio: 1, modeCount: 4, frameMs: 1000 / 30 },
]

const SPECTRAL_ORBIT_GLSL = String.raw`
uniform float uTime;
uniform float uModeCount;
uniform float uLambda[6];
uniform vec2 uResolution;
uniform float uTracerCount;

const float MODE_AMPLITUDES[6] = float[6](0.42, 0.36, 0.30, 0.25, 0.20, 0.16);
const float MODE_PHASES[6] = float[6](0.31, 2.17, 4.02, 5.41, 1.24, 3.52);

float hash11(float value) {
  return fract(sin(value * 127.1) * 43758.5453123);
}

vec2 spectralOrbit(float time) {
  vec2 value = vec2(0.0);
  float amplitudeSum = 0.0;

  for (int index = 0; index < 6; index++) {
    if (float(index) >= uModeCount) {
      continue;
    }
    float amplitude = MODE_AMPLITUDES[index];
    float theta = uLambda[index] * time + MODE_PHASES[index];
    value += amplitude * vec2(cos(theta), sin(theta));
    amplitudeSum += amplitude;
  }
  return value / max(amplitudeSum, 0.0001);
}

vec2 orbitPoint(float time) {
  vec2 normalized = spectralOrbit(time);
  return vec2(
    (0.5 + 0.5 * normalized.x) * uResolution.x,
    (0.5 - 0.5 * normalized.y) * uResolution.y
  );
}
`

const RENDER_VERTEX_SHADER = String.raw`#version 300 es
precision highp float;

uniform float uAlpha;
uniform float uTheme;
uniform vec4 uObstacles[8];
uniform int uObstacleCount;
uniform float uPass;

${SPECTRAL_ORBIT_GLSL}

out float vAlpha;
out float vTheme;
out float vShade;

void main() {
  float seed = float(gl_InstanceID + 1);
  float spacing = ${TRACER_COVER_SECONDS}.0 / max(uTracerCount, 1.0);
  float timeOffset =
    ((seed - 0.5) / max(uTracerCount, 1.0)) * ${TRACER_COVER_SECONDS}.0 +
    (hash11(seed * 4.17 + 2.3) - 0.5) * spacing * 0.35;
  float trailDuration = mix(0.25, 0.40, hash11(seed * 7.13 + 1.9));
  int segment = gl_VertexID / 6;
  int corner = gl_VertexID - segment * 6;
  float segmentStart = float(segment) / float(${TRAIL_SEGMENTS});
  float segmentEnd = float(segment + 1) / float(${TRAIL_SEGMENTS});
  float startTime = uTime + timeOffset - segmentStart * trailDuration;
  float endTime = uTime + timeOffset - segmentEnd * trailDuration;
  vec2 start = orbitPoint(startTime);
  vec2 end = orbitPoint(endTime);
  bool useStart = corner == 0 || corner == 3 || corner == 5;
  float side = corner == 0 || corner == 1 || corner == 3 ? -1.0 : 1.0;
  vec2 position = useStart ? start : end;
  vec2 direction = normalize(start - end + vec2(0.0001));
  vec2 normal = vec2(-direction.y, direction.x);
  float coreWidth = mix(
    mix(2.8, 3.8, hash11(seed * 8.73)),
    mix(2.5, 3.5, hash11(seed * 8.73)),
    uTheme
  );
  float glowWidth = mix(8.0, 12.0, hash11(seed * 9.91));
  float width = mix(coreWidth, glowWidth, uPass);
  if (segment == 0 && useStart && uPass < 0.5) {
    width = mix(4.0, 6.0, hash11(seed * 3.57));
  }
  position += normal * side * width * 0.5;
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
    obstacleShade *= inside ? 0.11 : 1.0;
  }

  float flowAlpha = pow(1.0 - segmentStart, 1.25);
  float brightness = hash11(seed * 6.41);
  float coreAlpha = mix(
    mix(0.65, 0.85, brightness),
    mix(0.80, 0.95, brightness),
    uTheme
  );
  float glowAlpha = mix(
    mix(0.08, 0.14, brightness),
    mix(0.14, 0.22, brightness),
    uTheme
  );
  float passAlpha = mix(
    coreAlpha,
    glowAlpha,
    uPass
  );
  vec2 clip = vec2(
    position.x * 2.0 / uResolution.x - 1.0,
    1.0 - position.y * 2.0 / uResolution.y
  );
  gl_Position = vec4(clip, 0.0, 1.0);
  vAlpha =
    passAlpha *
    flowAlpha *
    uAlpha *
    obstacleShade;
  vTheme = uTheme;
  vShade = hash11(seed * 5.73);
}
`

const FRAGMENT_SHADER = String.raw`#version 300 es
precision mediump float;

in float vAlpha;
in float vTheme;
in float vShade;
out vec4 outColor;

void main() {
  vec3 daylight = mix(vec3(0.192, 0.353, 0.659), vec3(0.408, 0.275, 0.722), vShade);
  vec3 night = mix(vec3(0.624, 0.847, 1.0), vec3(0.769, 0.710, 0.992), vShade);
  outColor = vec4(mix(daylight, night, vTheme), vAlpha);
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

function createOrbitTracer(seed: number): OrbitTracer {
  return {
    seed,
    timeJitter: hash(seed, 7) - 0.5,
    brightness: 0.84 + hash(seed, 10) * 0.16,
    trailDuration: 0.25 + hash(seed, 11) * 0.15,
    widthScale: 0.88 + hash(seed, 12) * 0.24,
  }
}

function sampleOrbitPoint(time: number, width: number, height: number, modeCount: number) {
  let real = 0
  let imaginary = 0
  let amplitudeSum = 0
  for (let mode = 0; mode < Math.min(modeCount, MODE_INDICES.length); mode++) {
    const amplitude = ORBIT_AMPLITUDES[mode]
    const theta = LAMBDAS[mode] * time + FIELD_MODE_PHASES[mode]
    real += amplitude * Math.cos(theta)
    imaginary += amplitude * Math.sin(theta)
    amplitudeSum += amplitude
  }
  const scale = Math.max(amplitudeSum, 0.0001)
  return {
    x: (0.5 + 0.5 * (real / scale)) * width,
    y: (0.5 - 0.5 * (imaginary / scale)) * height,
  }
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

function createProgram(gl: WebGL2RenderingContext, vertexSource: string, fragmentSource: string) {
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

  const renderProgram = createProgram(gl, RENDER_VERTEX_SHADER, FRAGMENT_SHADER)
  const vertexArray = gl.createVertexArray()
  if (!renderProgram || !vertexArray) {
    if (renderProgram) gl.deleteProgram(renderProgram)
    if (vertexArray) gl.deleteVertexArray(vertexArray)
    return null
  }

  gl.bindVertexArray(null)

  const renderUniforms = {
    time: gl.getUniformLocation(renderProgram, "uTime"),
    alpha: gl.getUniformLocation(renderProgram, "uAlpha"),
    theme: gl.getUniformLocation(renderProgram, "uTheme"),
    modeCount: gl.getUniformLocation(renderProgram, "uModeCount"),
    resolution: gl.getUniformLocation(renderProgram, "uResolution"),
    tracerCount: gl.getUniformLocation(renderProgram, "uTracerCount"),
    lambda: gl.getUniformLocation(renderProgram, "uLambda[0]"),
    obstacles: gl.getUniformLocation(renderProgram, "uObstacles[0]"),
    obstacleCount: gl.getUniformLocation(renderProgram, "uObstacleCount"),
    pass: gl.getUniformLocation(renderProgram, "uPass"),
  }

  gl.enable(gl.BLEND)

  const resize = (width: number, height: number, pixelRatio: number) => {
    canvas.width = Math.max(1, Math.floor(width * pixelRatio))
    canvas.height = Math.max(1, Math.floor(height * pixelRatio))
    canvas.style.width = width + "px"
    canvas.style.height = height + "px"
    gl.viewport(0, 0, canvas.width, canvas.height)
  }

  const setOrbitUniforms = (
    time: number,
    modeCount: number,
    width: number,
    height: number,
    tracerCount: number,
  ) => {
    gl.uniform1f(renderUniforms.time, time)
    gl.uniform1f(renderUniforms.modeCount, modeCount)
    gl.uniform1f(renderUniforms.tracerCount, tracerCount)
    gl.uniform1fv(renderUniforms.lambda, LAMBDAS)
    gl.uniform2f(renderUniforms.resolution, width, height)
  }

  const render = ({
    time,
    alpha,
    theme,
    modeCount,
    tracerCount,
    totalTracerCount,
    width,
    height,
    obstacles,
  }: {
    time: number
    alpha: number
    theme: number
    modeCount: number
    tracerCount: number
    totalTracerCount: number
    width: number
    height: number
    obstacles: Obstacle[]
  }) => {
    gl.clearColor(0, 0, 0, 0)
    gl.clear(gl.COLOR_BUFFER_BIT)

    const activeCount = Math.min(tracerCount, FIELD_TRACER_COUNT)
    if (alpha <= 0.001 || activeCount <= 0) return

    const obstacleData = new Float32Array(MAX_OBSTACLES * 4)
    obstacles.slice(0, MAX_OBSTACLES).forEach((obstacle, index) => {
      obstacleData.set([obstacle.left, obstacle.top, obstacle.right, obstacle.bottom], index * 4)
    })

    gl.useProgram(renderProgram)
    setOrbitUniforms(time, modeCount, width, height, totalTracerCount)
    gl.uniform1f(renderUniforms.alpha, alpha)
    gl.uniform1f(renderUniforms.theme, theme)
    gl.uniform4fv(renderUniforms.obstacles, obstacleData)
    gl.uniform1i(renderUniforms.obstacleCount, Math.min(obstacles.length, MAX_OBSTACLES))
    gl.bindVertexArray(vertexArray)
    gl.blendFunc(gl.SRC_ALPHA, gl.ONE)
    gl.uniform1f(renderUniforms.pass, 1)
    gl.drawArraysInstanced(gl.TRIANGLES, 0, TRAIL_SEGMENTS * 6, activeCount)
    gl.blendFunc(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA)
    gl.uniform1f(renderUniforms.pass, 0)
    gl.drawArraysInstanced(gl.TRIANGLES, 0, TRAIL_SEGMENTS * 6, activeCount)
    gl.bindVertexArray(null)
  }

  const destroy = () => {
    gl.deleteVertexArray(vertexArray)
    gl.deleteProgram(renderProgram)
    gl.getExtension("WEBGL_lose_context")?.loseContext()
  }

  return { resize, render, destroy }
}
function pointShade(x: number, y: number, obstacles: Obstacle[]) {
  for (const obstacle of obstacles) {
    if (x >= obstacle.left && x <= obstacle.right && y >= obstacle.top && y <= obstacle.bottom) {
      return 0.62
    }
  }
  return 1
}

function tracerColor(shade: number, theme: number) {
  const palettes = [
    [
      [49, 90, 168],
      [104, 70, 184],
    ],
    [
      [159, 216, 255],
      [196, 181, 253],
    ],
  ]
  const samplePalette = (palette: number[][]) => {
    return palette[0].map((channel, index) =>
      Math.round(channel + (palette[1][index] - channel) * shade),
    )
  }
  const daylight = samplePalette(palettes[0])
  const night = samplePalette(palettes[1])
  return daylight.map((channel, index) => Math.round(channel + (night[index] - channel) * theme))
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
    const foregroundTracers = Array.from({ length: EFFECT_COUNTS.foregroundTracer }, (_, index) =>
      createOrbitTracer(index + 10001),
    )
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

    const drawFront = (
      time: number,
      quality: FieldQuality,
      backgroundCount: number,
      totalTracerCount: number,
    ) => {
      frontContext.clearRect(0, 0, width, height)

      const frontAlpha = smoothstep((fieldBlend - 0.58) / 0.42)
      if (frontAlpha > 0.001) {
        frontContext.lineCap = "round"
        const trails: Array<{
          tracer: OrbitTracer
          points: Array<{ x: number; y: number }>
          color: number[]
          alpha: number
        }> = []
        const foregroundCount = Math.min(
          quality.foregroundCount,
          Math.max(0, totalTracerCount - backgroundCount),
        )
        const timeSpacing = TRACER_COVER_SECONDS / Math.max(totalTracerCount, 1)
        for (let index = 0; index < foregroundCount; index++) {
          const tracer = foregroundTracers[index]
          const points = []
          const globalIndex = backgroundCount + index
          const timeOffset =
            ((globalIndex + 0.5) / Math.max(totalTracerCount, 1)) * TRACER_COVER_SECONDS +
            tracer.timeJitter * timeSpacing * 0.35
          for (let sample = 0; sample < TRAIL_SAMPLES; sample++) {
            points.push(
              sampleOrbitPoint(
                time + timeOffset - (sample / TRAIL_SEGMENTS) * tracer.trailDuration,
                width,
                height,
                quality.modeCount,
              ),
            )
          }
          const head = points[0]
          trails.push({
            tracer,
            points,
            color: tracerColor(hash(tracer.seed, 13), themeBlend),
            alpha: frontAlpha * pointShade(head.x, head.y, obstacles),
          })
        }

        const drawTrails = (glow: boolean) => {
          frontContext.globalCompositeOperation = glow ? "lighter" : "source-over"
          for (const { tracer, points, color, alpha } of trails) {
            const width =
              (glow
                ? 8 + hash(tracer.seed, 14) * 4
                : (2.8 + hash(tracer.seed, 15)) * (1 - themeBlend) +
                  (2.5 + hash(tracer.seed, 15)) * themeBlend) * tracer.widthScale
            for (let segment = 0; segment < points.length - 1; segment++) {
              const flowAlpha = Math.pow(1 - segment / TRAIL_SEGMENTS, 1.25)
              const brightness = (tracer.brightness - 0.84) / 0.16
              const passAlpha = glow
                ? (0.08 + brightness * 0.06) * (1 - themeBlend) +
                  (0.14 + brightness * 0.08) * themeBlend
                : (0.65 + brightness * 0.2) * (1 - themeBlend) +
                  (0.8 + brightness * 0.15) * themeBlend
              frontContext.globalAlpha = alpha * flowAlpha * passAlpha
              frontContext.strokeStyle = "rgb(" + color[0] + ", " + color[1] + ", " + color[2] + ")"
              frontContext.lineWidth = width
              frontContext.beginPath()
              frontContext.moveTo(points[segment].x, points[segment].y)
              frontContext.lineTo(points[segment + 1].x, points[segment + 1].y)
              frontContext.stroke()
            }
            if (!glow) {
              const brightness = (tracer.brightness - 0.84) / 0.16
              const headWidth = 4 + hash(tracer.seed, 16) * 2
              frontContext.globalAlpha =
                alpha *
                ((0.65 + brightness * 0.2) * (1 - themeBlend) +
                  (0.8 + brightness * 0.15) * themeBlend)
              frontContext.fillStyle = "rgb(" + color[0] + ", " + color[1] + ", " + color[2] + ")"
              frontContext.beginPath()
              frontContext.arc(points[0].x, points[0].y, headWidth * 0.5, 0, TAU)
              frontContext.fill()
            }
          }
        }

        drawTrails(true)
        drawTrails(false)
      }
      frontContext.globalCompositeOperation = "source-over"
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

      const totalTracerCount = Math.round(FIELD_TRACER_COUNT * quality.tracerRatio)
      const foregroundCount = Math.min(quality.foregroundCount, totalTracerCount)
      const tracerCount = Math.max(0, totalTracerCount - foregroundCount)
      if (fieldBlend > 0.001) {
        if (!fieldRenderer) {
          fieldRenderer = createFieldRenderer(fieldCanvas)
          fieldRenderer?.resize(
            width,
            height,
            Math.min(window.devicePixelRatio || 1, quality.pixelRatio),
          )
        }
        fieldRenderer?.render({
          time,
          alpha: smoothstep(fieldBlend),
          theme: themeBlend,
          modeCount: quality.modeCount,
          tracerCount,
          totalTracerCount,
          width,
          height,
          obstacles,
        })
      } else {
        fieldRenderer?.render({
          time,
          alpha: 0,
          theme: themeBlend,
          modeCount: quality.modeCount,
          tracerCount: 0,
          totalTracerCount,
          width,
          height,
          obstacles,
        })
      }

      drawFront(time, quality, tracerCount, totalTracerCount)

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
      if (modeRef.current !== "field") {
        ripples.push({
          x: event.clientX,
          y: event.clientY,
          radius: 0,
          opacity: 0.6,
          velocity: 2.5,
        })
      }
    }

    window.addEventListener("resize", handleResize)
    window.addEventListener("scroll", handleScroll, { passive: true })
    window.addEventListener("click", handleClick)
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
