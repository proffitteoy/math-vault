"use client"

import type { RefObject } from "react"
import {
  ORBIT_LAMBDAS,
  ORBIT_PLAYBACK_SPEED,
  SPECTRAL_ORBIT_GLSL,
  VISIBLE_INTERVALS,
  sampleOrbit,
  sampleVisibleTime,
  viewportTransform,
  visibleIntervalAt,
  type OrbitPoint,
} from "./spectralOrbit"

export const SPECTRAL_TRACER_TARGET = 600
export const SPECTRAL_TRACER_CAPACITY = 1200
export const SPECTRAL_TRACER_FOREGROUND = 90
export const SPECTRAL_TRACER_MAX_OBSTACLES = 8

const TRAIL_SAMPLES = 12
const TRAIL_SEGMENTS = TRAIL_SAMPLES - 1

export type TracerObstacle = {
  left: number
  top: number
  right: number
  bottom: number
}

type TracerPhase = "visible" | "fade-out" | "fade-in"

type TracerState = {
  seed: number
  generation: number
  intervalIndex: number
  orbitTime: number
  opacity: number
  phase: TracerPhase
  phaseAge: number
  phaseDuration: number
  phaseStartOpacity: number
  trailDuration: number
}

export type SpectralTracerFrame = {
  deltaSeconds: number
  alpha: number
  theme: number
  totalCount: number
  foregroundCount: number
  width: number
  height: number
  obstacles: TracerObstacle[]
}

export type SpectralTracerController = {
  resize: (width: number, height: number, pixelRatio: number) => void
  render: (frame: SpectralTracerFrame) => void
  destroy: () => void
}

type SpectralTracerLayerProps = {
  backCanvasRef: RefObject<HTMLCanvasElement | null>
  frontCanvasRef: RefObject<HTMLCanvasElement | null>
}

const VERTEX_SHADER = String.raw`#version 300 es
precision highp float;

layout(location = 0) in vec2 aState;

uniform float uAlpha;
uniform float uTheme;
uniform vec4 uObstacles[8];
uniform int uObstacleCount;
uniform float uPass;
uniform float uLambda[6];
uniform vec2 uResolution;

${SPECTRAL_ORBIT_GLSL}

out float vAlpha;
out float vTheme;
out float vColorIndex;

float hash11(float value) {
  return fract(sin(value * 127.1) * 43758.5453123);
}

void main() {
  float seed = float(gl_InstanceID + 1);
  float trailDuration = mix(0.10, 0.18, hash11(seed * 7.13 + 1.9));
  int segment = gl_VertexID / 6;
  int corner = gl_VertexID - segment * 6;
  float segmentStart = float(segment) / float(${TRAIL_SEGMENTS});
  float segmentEnd = float(segment + 1) / float(${TRAIL_SEGMENTS});
  vec2 start = viewportOrbitPoint(aState.x - segmentStart * trailDuration);
  vec2 end = viewportOrbitPoint(aState.x - segmentEnd * trailDuration);
  bool useStart = corner == 0 || corner == 3 || corner == 5;
  float side = corner == 0 || corner == 1 || corner == 3 ? -1.0 : 1.0;
  vec2 position = useStart ? start : end;
  vec2 direction = normalize(start - end + vec2(0.0001));
  vec2 normal = vec2(-direction.y, direction.x);
  float styleRoll = hash11(seed * 5.73);
  float widthRoll = hash11(seed * 8.73);
  bool bright = styleRoll >= 0.80;
  bool highlight = styleRoll >= 0.95;
  float dayCore = bright ? mix(2.4, 3.0, widthRoll) : mix(1.5, 2.2, widthRoll);
  float nightCore = bright ? mix(2.2, 2.8, widthRoll) : mix(1.4, 2.0, widthRoll);
  float coreWidth = mix(dayCore, nightCore, uTheme);
  if (highlight) coreWidth = mix(3.0, 2.8, uTheme);
  float glowWidth = mix(mix(3.5, 5.5, widthRoll), mix(4.0, 6.0, widthRoll), uTheme);
  float width = mix(coreWidth, glowWidth, uPass);
  position += normal * side * width * 0.5;

  float obstacleShade = 1.0;
  for (int index = 0; index < 8; index++) {
    if (index >= uObstacleCount) break;
    vec4 obstacle = uObstacles[index];
    bool inside =
      position.x > obstacle.x &&
      position.x < obstacle.z &&
      position.y > obstacle.y &&
      position.y < obstacle.w;
    obstacleShade *= inside ? 0.20 : 1.0;
  }

  float alphaRoll = highlight ? 1.0 : hash11(seed * 6.41);
  float coreAlpha = mix(mix(0.38, 0.58, alphaRoll), mix(0.48, 0.68, alphaRoll), uTheme);
  float glowAlpha = mix(mix(0.04, 0.08, alphaRoll), mix(0.07, 0.12, alphaRoll), uTheme);
  float flowAlpha = pow(1.0 - segmentStart, 1.2);
  vec2 clip = vec2(
    position.x * 2.0 / uResolution.x - 1.0,
    1.0 - position.y * 2.0 / uResolution.y
  );

  gl_Position = vec4(clip, 0.0, 1.0);
  vAlpha = mix(coreAlpha, glowAlpha, uPass) * flowAlpha * aState.y * uAlpha * obstacleShade;
  vTheme = uTheme;
  vColorIndex = styleRoll < 0.80 ? 0.0 : (styleRoll < 0.95 ? 1.0 : 2.0);
}
`

const FRAGMENT_SHADER = String.raw`#version 300 es
precision mediump float;

in float vAlpha;
in float vTheme;
in float vColorIndex;
out vec4 outColor;

void main() {
  vec3 day =
    vColorIndex < 0.5
      ? vec3(0.263, 0.561, 0.816)
      : (vColorIndex < 1.5 ? vec3(0.318, 0.529, 0.816) : vec3(0.400, 0.490, 0.847));
  vec3 night =
    vColorIndex < 0.5
      ? vec3(0.525, 0.788, 1.000)
      : (vColorIndex < 1.5 ? vec3(0.639, 0.741, 1.000) : vec3(0.714, 0.682, 1.000));
  outColor = vec4(mix(day, night, vTheme), vAlpha);
}
`

function hash(index: number, seed: number) {
  const value = Math.sin(index * 12.9898 + seed * 78.233) * 43758.5453
  return value - Math.floor(value)
}

function clamp(value: number, minimum: number, maximum: number) {
  return Math.min(maximum, Math.max(minimum, value))
}

function smoothstep(value: number) {
  const bounded = clamp(value, 0, 1)
  return bounded * bounded * (3 - 2 * bounded)
}

function createTracer(index: number): TracerState {
  const seed = index + 1
  const selection =
    index < VISIBLE_INTERVALS.length
      ? { index, interval: VISIBLE_INTERVALS[index] }
      : visibleIntervalAt(hash(seed, 31))

  return {
    seed,
    generation: 0,
    intervalIndex: selection.index,
    orbitTime: sampleVisibleTime(selection.interval, hash(seed, 37)),
    opacity: 1,
    phase: "visible",
    phaseAge: 0,
    phaseDuration: 0,
    phaseStartOpacity: 1,
    trailDuration: 0.1 + hash(seed, 41) * 0.08,
  }
}

function beginFadeOut(tracer: TracerState) {
  tracer.phase = "fade-out"
  tracer.phaseAge = 0
  tracer.phaseDuration = 0.2 + hash(tracer.seed, 53 + tracer.generation) * 0.2
  tracer.phaseStartOpacity = tracer.opacity
}

function rescheduleTracer(tracer: TracerState) {
  tracer.generation += 1
  const selection = visibleIntervalAt(hash(tracer.seed, 71 + tracer.generation * 13))
  tracer.intervalIndex =
    selection.index === tracer.intervalIndex
      ? (selection.index + 1 + Math.floor(hash(tracer.seed, 73 + tracer.generation) * 7)) %
        VISIBLE_INTERVALS.length
      : selection.index
  const interval = VISIBLE_INTERVALS[tracer.intervalIndex]
  tracer.orbitTime = sampleVisibleTime(interval, hash(tracer.seed, 79 + tracer.generation * 17))
  tracer.opacity = 0
  tracer.phase = "fade-in"
  tracer.phaseAge = 0
  tracer.phaseDuration = 0.4 + hash(tracer.seed, 83 + tracer.generation) * 0.4
  tracer.phaseStartOpacity = 0
}

function advanceTracer(tracer: TracerState, deltaSeconds: number) {
  tracer.orbitTime += ORBIT_PLAYBACK_SPEED * deltaSeconds
  tracer.phaseAge += deltaSeconds

  if (tracer.phase === "visible") {
    tracer.opacity = 1
    if (tracer.orbitTime > VISIBLE_INTERVALS[tracer.intervalIndex][1]) beginFadeOut(tracer)
    return
  }

  if (tracer.phase === "fade-out") {
    tracer.opacity =
      tracer.phaseStartOpacity * (1 - smoothstep(tracer.phaseAge / tracer.phaseDuration))
    if (tracer.phaseAge >= tracer.phaseDuration) rescheduleTracer(tracer)
    return
  }

  tracer.opacity = smoothstep(tracer.phaseAge / tracer.phaseDuration)
  if (tracer.orbitTime > VISIBLE_INTERVALS[tracer.intervalIndex][1]) {
    beginFadeOut(tracer)
  } else if (tracer.phaseAge >= tracer.phaseDuration) {
    tracer.opacity = 1
    tracer.phase = "visible"
    tracer.phaseAge = 0
  }
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
    console.warn("Spectral tracer shader compilation failed:", gl.getShaderInfoLog(shader))
    gl.deleteShader(shader)
    return null
  }
  return shader
}

function createProgram(gl: WebGL2RenderingContext) {
  const vertexShader = createShader(gl, gl.VERTEX_SHADER, VERTEX_SHADER)
  const fragmentShader = createShader(gl, gl.FRAGMENT_SHADER, FRAGMENT_SHADER)
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
    console.warn("Spectral tracer program linking failed:", gl.getProgramInfoLog(program))
    gl.deleteProgram(program)
    return null
  }
  return program
}

function createBackRenderer(canvas: HTMLCanvasElement) {
  const gl = canvas.getContext("webgl2", {
    alpha: true,
    antialias: true,
    depth: false,
    powerPreference: "high-performance",
    premultipliedAlpha: false,
  })
  if (!gl) return null

  const program = createProgram(gl)
  const vertexArray = gl.createVertexArray()
  const stateBuffer = gl.createBuffer()
  if (!program || !vertexArray || !stateBuffer) {
    if (program) gl.deleteProgram(program)
    if (vertexArray) gl.deleteVertexArray(vertexArray)
    if (stateBuffer) gl.deleteBuffer(stateBuffer)
    return null
  }

  gl.bindVertexArray(vertexArray)
  gl.bindBuffer(gl.ARRAY_BUFFER, stateBuffer)
  gl.bufferData(gl.ARRAY_BUFFER, SPECTRAL_TRACER_CAPACITY * 2 * 4, gl.DYNAMIC_DRAW)
  gl.enableVertexAttribArray(0)
  gl.vertexAttribPointer(0, 2, gl.FLOAT, false, 0, 0)
  gl.vertexAttribDivisor(0, 1)
  gl.bindVertexArray(null)
  gl.enable(gl.BLEND)

  const uniforms = {
    alpha: gl.getUniformLocation(program, "uAlpha"),
    theme: gl.getUniformLocation(program, "uTheme"),
    lambda: gl.getUniformLocation(program, "uLambda[0]"),
    resolution: gl.getUniformLocation(program, "uResolution"),
    obstacles: gl.getUniformLocation(program, "uObstacles[0]"),
    obstacleCount: gl.getUniformLocation(program, "uObstacleCount"),
    pass: gl.getUniformLocation(program, "uPass"),
  }

  const resize = (width: number, height: number, pixelRatio: number) => {
    canvas.width = Math.max(1, Math.floor(width * pixelRatio))
    canvas.height = Math.max(1, Math.floor(height * pixelRatio))
    canvas.style.width = width + "px"
    canvas.style.height = height + "px"
    gl.viewport(0, 0, canvas.width, canvas.height)
  }

  const render = (
    states: TracerState[],
    backgroundCount: number,
    alpha: number,
    theme: number,
    width: number,
    height: number,
    obstacles: TracerObstacle[],
  ) => {
    gl.clearColor(0, 0, 0, 0)
    gl.clear(gl.COLOR_BUFFER_BIT)
    if (alpha <= 0.001 || backgroundCount <= 0) return

    const stateData = new Float32Array(backgroundCount * 2)
    for (let index = 0; index < backgroundCount; index++) {
      stateData[index * 2] = states[index].orbitTime
      stateData[index * 2 + 1] = states[index].opacity
    }
    const obstacleData = new Float32Array(SPECTRAL_TRACER_MAX_OBSTACLES * 4)
    obstacles.slice(0, SPECTRAL_TRACER_MAX_OBSTACLES).forEach((obstacle, index) => {
      obstacleData.set([obstacle.left, obstacle.top, obstacle.right, obstacle.bottom], index * 4)
    })

    gl.useProgram(program)
    gl.bindBuffer(gl.ARRAY_BUFFER, stateBuffer)
    gl.bufferSubData(gl.ARRAY_BUFFER, 0, stateData)
    gl.uniform1f(uniforms.alpha, alpha)
    gl.uniform1f(uniforms.theme, theme)
    gl.uniform1fv(uniforms.lambda, ORBIT_LAMBDAS)
    gl.uniform2f(uniforms.resolution, width, height)
    gl.uniform4fv(uniforms.obstacles, obstacleData)
    gl.uniform1i(uniforms.obstacleCount, Math.min(obstacles.length, SPECTRAL_TRACER_MAX_OBSTACLES))
    gl.bindVertexArray(vertexArray)
    gl.blendFunc(gl.SRC_ALPHA, gl.ONE)
    gl.uniform1f(uniforms.pass, 1)
    gl.drawArraysInstanced(gl.TRIANGLES, 0, TRAIL_SEGMENTS * 6, backgroundCount)
    gl.blendFunc(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA)
    gl.uniform1f(uniforms.pass, 0)
    gl.drawArraysInstanced(gl.TRIANGLES, 0, TRAIL_SEGMENTS * 6, backgroundCount)
    gl.bindVertexArray(null)
  }

  const destroy = () => {
    gl.deleteBuffer(stateBuffer)
    gl.deleteVertexArray(vertexArray)
    gl.deleteProgram(program)
    gl.getExtension("WEBGL_lose_context")?.loseContext()
  }

  return { resize, render, destroy }
}

function tracerStyle(seed: number, theme: number) {
  const styleRoll = hash(seed, 97)
  const widthRoll = hash(seed, 101)
  const alphaRoll = styleRoll >= 0.95 ? 1 : hash(seed, 103)
  const bright = styleRoll >= 0.8
  const dayCore = bright ? 2.4 + widthRoll * 0.6 : 1.5 + widthRoll * 0.7
  const nightCore = bright ? 2.2 + widthRoll * 0.6 : 1.4 + widthRoll * 0.6
  const colors = [
    [
      [67, 143, 208],
      [81, 135, 208],
      [102, 125, 216],
    ],
    [
      [134, 201, 255],
      [163, 189, 255],
      [182, 174, 255],
    ],
  ]
  const colorIndex = styleRoll < 0.8 ? 0 : styleRoll < 0.95 ? 1 : 2
  const day = colors[0][colorIndex]
  const night = colors[1][colorIndex]

  return {
    color: day.map((channel, index) => Math.round(channel + (night[index] - channel) * theme)),
    coreWidth: styleRoll >= 0.95 ? 3 - theme * 0.2 : dayCore + (nightCore - dayCore) * theme,
    glowWidth: 3.5 + widthRoll * 2 + theme * 0.5,
    coreAlpha: 0.38 + alphaRoll * 0.2 + theme * 0.1,
    glowAlpha: 0.04 + alphaRoll * 0.04 + theme * (0.03 + alphaRoll * 0.01),
  }
}

function obstacleShade(x: number, y: number, obstacles: TracerObstacle[]) {
  for (const obstacle of obstacles) {
    if (x >= obstacle.left && x <= obstacle.right && y >= obstacle.top && y <= obstacle.bottom) {
      return 0.72
    }
  }
  return 1
}

export function createSpectralTracerController(
  backCanvas: HTMLCanvasElement,
  frontCanvas: HTMLCanvasElement,
): SpectralTracerController | null {
  const frontContext = frontCanvas.getContext("2d", { alpha: true })
  const backRenderer = createBackRenderer(backCanvas)
  if (!frontContext && !backRenderer) return null

  const states = Array.from({ length: SPECTRAL_TRACER_CAPACITY }, (_, index) => createTracer(index))

  const resize = (width: number, height: number, pixelRatio: number) => {
    backRenderer?.resize(width, height, pixelRatio)
    if (!frontContext) return
    frontCanvas.width = Math.max(1, Math.floor(width * pixelRatio))
    frontCanvas.height = Math.max(1, Math.floor(height * pixelRatio))
    frontCanvas.style.width = width + "px"
    frontCanvas.style.height = height + "px"
    frontContext.setTransform(pixelRatio, 0, 0, pixelRatio, 0, 0)
  }

  const render = ({
    deltaSeconds,
    alpha,
    theme,
    totalCount,
    foregroundCount,
    width,
    height,
    obstacles,
  }: SpectralTracerFrame) => {
    const activeCount = Math.min(totalCount, SPECTRAL_TRACER_CAPACITY)
    const frontCount = Math.min(foregroundCount, activeCount)
    const backgroundCount = activeCount - frontCount
    for (let index = 0; index < activeCount; index++) {
      advanceTracer(states[index], deltaSeconds)
    }

    backRenderer?.render(states, backgroundCount, alpha, theme, width, height, obstacles)
    if (!frontContext) return
    frontContext.clearRect(0, 0, width, height)
    const frontAlpha = smoothstep((alpha - 0.58) / 0.42)
    if (frontAlpha <= 0.001) return

    frontContext.lineCap = "round"
    const trails: Array<{
      tracer: TracerState
      points: OrbitPoint[]
      style: ReturnType<typeof tracerStyle>
      alpha: number
    }> = []
    for (let index = backgroundCount; index < activeCount; index++) {
      const tracer = states[index]
      if (tracer.opacity <= 0.001) continue
      const points = Array.from({ length: TRAIL_SAMPLES }, (_, sample) =>
        viewportTransform(
          sampleOrbit(tracer.orbitTime - (sample / TRAIL_SEGMENTS) * tracer.trailDuration),
          width,
          height,
        ),
      )
      trails.push({
        tracer,
        points,
        style: tracerStyle(tracer.seed, theme),
        alpha: frontAlpha * tracer.opacity * obstacleShade(points[0].x, points[0].y, obstacles),
      })
    }

    const drawTrails = (glow: boolean) => {
      frontContext.globalCompositeOperation = glow ? "lighter" : "source-over"
      for (const { points, style, alpha: tracerAlpha } of trails) {
        frontContext.strokeStyle = `rgb(${style.color[0]}, ${style.color[1]}, ${style.color[2]})`
        frontContext.lineWidth = glow ? style.glowWidth : style.coreWidth
        for (let segment = 0; segment < points.length - 1; segment++) {
          const flowAlpha = Math.pow(1 - segment / TRAIL_SEGMENTS, 1.2)
          frontContext.globalAlpha =
            tracerAlpha * flowAlpha * (glow ? style.glowAlpha : style.coreAlpha)
          frontContext.beginPath()
          frontContext.moveTo(points[segment].x, points[segment].y)
          frontContext.lineTo(points[segment + 1].x, points[segment + 1].y)
          frontContext.stroke()
        }
      }
    }

    drawTrails(true)
    drawTrails(false)
    frontContext.globalCompositeOperation = "source-over"
    frontContext.globalAlpha = 1
  }

  const destroy = () => {
    backRenderer?.destroy()
    frontContext?.clearRect(0, 0, frontCanvas.width, frontCanvas.height)
  }

  return { resize, render, destroy }
}

export function SpectralTracerLayer({ backCanvasRef, frontCanvasRef }: SpectralTracerLayerProps) {
  return (
    <>
      <canvas
        ref={backCanvasRef}
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
