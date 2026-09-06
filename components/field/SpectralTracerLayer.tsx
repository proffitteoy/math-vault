"use client"

import type { RefObject } from "react"
import {
  SPECTRAL_FIELD_GLSL,
  SPECTRAL_LAMBDAS,
  SPECTRAL_PLAYBACK_RATE,
  spectralParameterAt,
} from "./spectralField"

export const SPECTRAL_TRACER_BACKGROUND = 3200
export const SPECTRAL_TRACER_FOREGROUND = 120
export const SPECTRAL_TRACER_CAPACITY = 4096
export const SPECTRAL_TRACER_MAX_OBSTACLES = 8

const MAX_TRAIL_SAMPLES = 8
const MAX_TRAIL_SEGMENTS = MAX_TRAIL_SAMPLES - 1
const STATE_COMPONENTS = 4

export type TracerObstacle = {
  left: number
  top: number
  right: number
  bottom: number
}

export type SpectralTracerFrame = {
  alpha: number
  theme: number
  time: number
  backgroundCount: number
  foregroundCount: number
  trailSamples: number
  modeCount: number
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
  interactionCanvasRef: RefObject<HTMLCanvasElement | null>
}

const VERTEX_SHADER = String.raw`#version 300 es
precision highp float;

layout(location = 0) in vec4 aState;

uniform float uAlpha;
uniform float uTheme;
uniform float uTime;
uniform float uLayer;
uniform float uGlow;
uniform float uTrailSegments;
uniform float uFieldScale;
uniform float uLambda[6];
uniform int uModeCount;
uniform vec2 uResolution;

${SPECTRAL_FIELD_GLSL}

out float vAlpha;
out float vTheme;
out float vColorIndex;
out float vLayer;
out vec2 vPosition;

float hash11(float value) {
  return fract(sin(value * 127.1) * 43758.5453123);
}

void main() {
  vec2 parameter = aState.xy;
  float opacity = aState.z;
  float styleSeed = aState.w;
  float trailDuration = mix(0.08, 0.22, hash11(styleSeed * 7.13 + 1.9));
  int segment = gl_VertexID / 6;
  int corner = gl_VertexID - segment * 6;
  float segmentStart = float(segment) / uTrailSegments;
  float segmentEnd = float(segment + 1) / uTrailSegments;
  float historyScale = ${SPECTRAL_PLAYBACK_RATE.toFixed(2)};
  vec2 start = viewportFieldPoint(
    parameter,
    uTime - segmentStart * trailDuration * historyScale
  );
  vec2 end = viewportFieldPoint(
    parameter,
    uTime - segmentEnd * trailDuration * historyScale
  );
  bool useStart = corner == 0 || corner == 3 || corner == 5;
  float side = corner == 0 || corner == 1 || corner == 3 ? -1.0 : 1.0;
  vec2 position = useStart ? start : end;
  vec2 direction = normalize(start - end + vec2(0.0001));
  vec2 normal = vec2(-direction.y, direction.x);

  float widthRoll = hash11(styleSeed * 8.73);
  float alphaRoll = hash11(styleSeed * 6.41);
  float coreWidth = mix(0.82, 1.48, widthRoll) - uTheme * 0.08;
  float glowWidth = mix(2.8, 4.8, widthRoll) + uTheme * 0.3;
  position += normal * side * mix(coreWidth, glowWidth, uGlow) * 0.5;

  float dayCoreAlpha = mix(0.10, 0.22, alphaRoll);
  float nightCoreAlpha = mix(0.16, 0.30, alphaRoll);
  float dayGlowAlpha = mix(0.015, 0.045, alphaRoll);
  float nightGlowAlpha = mix(0.03, 0.07, alphaRoll);
  float coreAlpha = mix(dayCoreAlpha, nightCoreAlpha, uTheme);
  float glowAlpha = mix(dayGlowAlpha, nightGlowAlpha, uTheme);
  float flowAlpha = pow(1.0 - segmentStart, 1.15);
  float layerAlpha = mix(1.0, 1.12, uLayer);
  vec2 clip = vec2(
    position.x * 2.0 / uResolution.x - 1.0,
    1.0 - position.y * 2.0 / uResolution.y
  );

  gl_Position = vec4(clip, 0.0, 1.0);
  vAlpha = mix(coreAlpha, glowAlpha, uGlow) * flowAlpha * opacity * uAlpha * layerAlpha;
  vPosition = position;
  vTheme = uTheme;
  vLayer = uLayer;
  vColorIndex = floor(hash11(styleSeed * 5.73) * 3.0);
}
`

const FRAGMENT_SHADER = String.raw`#version 300 es
precision highp float;

uniform vec4 uObstacles[8];
uniform int uObstacleCount;

in float vAlpha;
in float vTheme;
in float vColorIndex;
in float vLayer;
in vec2 vPosition;
out vec4 outColor;

void main() {
  vec3 day =
    vColorIndex < 0.5
      ? vec3(0.235, 0.510, 0.790)
      : (vColorIndex < 1.5 ? vec3(0.255, 0.590, 0.835) : vec3(0.405, 0.390, 0.755));
  vec3 night =
    vColorIndex < 0.5
      ? vec3(0.625, 0.850, 1.000)
      : (vColorIndex < 1.5 ? vec3(0.535, 0.760, 0.980) : vec3(0.765, 0.710, 0.980));
  float inside = 0.0;
  float backgroundMask = 1.0;

  for (int index = 0; index < 8; index++) {
    if (index >= uObstacleCount) break;
    vec4 obstacle = uObstacles[index];
    bool inRect =
      vPosition.x >= obstacle.x && vPosition.x <= obstacle.z &&
      vPosition.y >= obstacle.y && vPosition.y <= obstacle.w;
    vec2 outsideDelta = max(max(obstacle.xy - vPosition, vPosition - obstacle.zw), vec2(0.0));
    float edgeDistance = length(outsideDelta);
    float haloMask = mix(0.15, 1.0, smoothstep(0.0, 18.0, edgeDistance));
    backgroundMask = min(backgroundMask, haloMask);
    if (inRect) inside = 1.0;
  }

  vec3 fieldColor = mix(day, night, vTheme);
  vec3 gray = vec3(mix(0.50, 0.69, vTheme));
  float componentMask = vLayer < 0.5 ? backgroundMask : mix(1.0, 0.62, inside);
  outColor = vec4(mix(fieldColor, gray, inside), vAlpha * componentMask);
}
`

function hash(index: number, seed: number) {
  const value = Math.sin(index * 12.9898 + seed * 78.233) * 43758.5453
  return value - Math.floor(value)
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

function createLayerRenderer(
  canvas: HTMLCanvasElement,
  parameterOffset: number,
  capacity: number,
  layer: 0 | 1,
) {
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

  const stateData = new Float32Array(capacity * STATE_COMPONENTS)
  for (let index = 0; index < capacity; index++) {
    const parameterIndex = parameterOffset + index
    const parameter = spectralParameterAt(parameterIndex)
    const offset = index * STATE_COMPONENTS
    stateData[offset] = parameter.u
    stateData[offset + 1] = parameter.v
    stateData[offset + 2] = 1
    stateData[offset + 3] = hash(parameterIndex + 1, 41)
  }

  gl.bindVertexArray(vertexArray)
  gl.bindBuffer(gl.ARRAY_BUFFER, stateBuffer)
  gl.bufferData(gl.ARRAY_BUFFER, stateData, gl.STATIC_DRAW)
  gl.enableVertexAttribArray(0)
  gl.vertexAttribPointer(0, STATE_COMPONENTS, gl.FLOAT, false, 0, 0)
  gl.vertexAttribDivisor(0, 1)
  gl.bindVertexArray(null)
  gl.enable(gl.BLEND)

  const uniforms = {
    alpha: gl.getUniformLocation(program, "uAlpha"),
    theme: gl.getUniformLocation(program, "uTheme"),
    time: gl.getUniformLocation(program, "uTime"),
    layer: gl.getUniformLocation(program, "uLayer"),
    glow: gl.getUniformLocation(program, "uGlow"),
    trailSegments: gl.getUniformLocation(program, "uTrailSegments"),
    fieldScale: gl.getUniformLocation(program, "uFieldScale"),
    lambda: gl.getUniformLocation(program, "uLambda[0]"),
    modeCount: gl.getUniformLocation(program, "uModeCount"),
    resolution: gl.getUniformLocation(program, "uResolution"),
    obstacles: gl.getUniformLocation(program, "uObstacles[0]"),
    obstacleCount: gl.getUniformLocation(program, "uObstacleCount"),
  }

  const resize = (width: number, height: number, pixelRatio: number) => {
    canvas.width = Math.max(1, Math.floor(width * pixelRatio))
    canvas.height = Math.max(1, Math.floor(height * pixelRatio))
    canvas.style.width = width + "px"
    canvas.style.height = height + "px"
    gl.viewport(0, 0, canvas.width, canvas.height)
  }

  const render = ({
    alpha,
    theme,
    time,
    backgroundCount,
    foregroundCount,
    trailSamples,
    modeCount,
    width,
    height,
    obstacles,
  }: SpectralTracerFrame) => {
    gl.clearColor(0, 0, 0, 0)
    gl.clear(gl.COLOR_BUFFER_BIT)
    if (alpha <= 0.001) return

    const count = Math.min(layer === 0 ? backgroundCount : foregroundCount, capacity)
    const segments = Math.max(1, Math.min(MAX_TRAIL_SEGMENTS, trailSamples - 1))
    const obstacleData = new Float32Array(SPECTRAL_TRACER_MAX_OBSTACLES * 4)
    obstacles.slice(0, SPECTRAL_TRACER_MAX_OBSTACLES).forEach((obstacle, index) => {
      obstacleData.set([obstacle.left, obstacle.top, obstacle.right, obstacle.bottom], index * 4)
    })

    gl.useProgram(program)
    gl.uniform1f(uniforms.alpha, alpha)
    gl.uniform1f(uniforms.theme, theme)
    gl.uniform1f(uniforms.time, time)
    gl.uniform1f(uniforms.trailSegments, segments)
    gl.uniform1f(uniforms.fieldScale, Math.min(118, Math.max(64, Math.min(width, height) * 0.105)))
    gl.uniform1fv(uniforms.lambda, SPECTRAL_LAMBDAS)
    gl.uniform1i(uniforms.modeCount, Math.min(6, Math.max(1, modeCount)))
    gl.uniform2f(uniforms.resolution, width, height)
    gl.uniform4fv(uniforms.obstacles, obstacleData)
    gl.uniform1i(uniforms.obstacleCount, Math.min(obstacles.length, SPECTRAL_TRACER_MAX_OBSTACLES))
    gl.bindVertexArray(vertexArray)

    const drawPass = (glow: number) => {
      if (count <= 0) return
      gl.uniform1f(uniforms.layer, layer)
      gl.uniform1f(uniforms.glow, glow)
      gl.blendFunc(gl.SRC_ALPHA, glow > 0.5 ? gl.ONE : gl.ONE_MINUS_SRC_ALPHA)
      gl.drawArraysInstanced(gl.TRIANGLES, 0, segments * 6, count)
    }

    drawPass(1)
    drawPass(0)
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

export function createSpectralTracerController(
  backCanvas: HTMLCanvasElement,
  frontCanvas: HTMLCanvasElement,
): SpectralTracerController | null {
  const backRenderer = createLayerRenderer(backCanvas, 0, SPECTRAL_TRACER_BACKGROUND, 0)
  const frontCapacity = SPECTRAL_TRACER_CAPACITY - SPECTRAL_TRACER_BACKGROUND
  const frontRenderer = createLayerRenderer(
    frontCanvas,
    SPECTRAL_TRACER_BACKGROUND,
    frontCapacity,
    1,
  )
  if (!backRenderer || !frontRenderer) {
    backRenderer?.destroy()
    frontRenderer?.destroy()
    return null
  }

  return {
    resize: (width, height, pixelRatio) => {
      backRenderer.resize(width, height, pixelRatio)
      frontRenderer.resize(width, height, pixelRatio)
    },
    render: (frame) => {
      backRenderer.render(frame)
      frontRenderer.render(frame)
    },
    destroy: () => {
      backRenderer.destroy()
      frontRenderer.destroy()
    },
  }
}

export function SpectralTracerLayer({
  backCanvasRef,
  frontCanvasRef,
  interactionCanvasRef,
}: SpectralTracerLayerProps) {
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
      <canvas
        ref={interactionCanvasRef}
        className="pointer-events-none fixed inset-0 z-[21] hidden h-full w-full md:block"
        data-field-layer="interaction"
        aria-hidden="true"
      />
    </>
  )
}
