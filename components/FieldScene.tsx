"use client"

import { useEffect, useRef } from "react"
import { siteConfig } from "../siteConfig"
import { useFieldMode } from "./FieldModeProvider"
import { useTheme } from "./ThemeProvider"
import {
  SPECTRAL_TRACER_FOREGROUND,
  SPECTRAL_TRACER_MAX_OBSTACLES,
  SPECTRAL_TRACER_TARGET,
  SpectralTracerLayer,
  createSpectralTracerController,
  type TracerObstacle,
} from "./field/SpectralTracerLayer"
import { ORBIT_LAMBDAS } from "./field/spectralOrbit"

const TAU = Math.PI * 2
const PHI = (1 + Math.sqrt(5)) / 2
const NORMAL_FRAME_MS = 1000 / 30
const NORMAL_PIXEL_RATIO = 1.25
const LAMBDAS = ORBIT_LAMBDAS
const EFFECT_COUNTS = {
  sakura: 40,
  fireflies: 50,
  grass: 150,
  danmaku: 15,
} as const

type Spectrum = {
  amplitudes: number[]
  cosPhases: number[]
  sinPhases: number[]
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
  {
    foregroundCount: SPECTRAL_TRACER_FOREGROUND,
    tracerRatio: 1,
    pixelRatio: 1.5,
    modeCount: 6,
    frameMs: 1000 / 60,
  },
  { foregroundCount: 48, tracerRatio: 1, pixelRatio: 1.5, modeCount: 6, frameMs: 1000 / 60 },
  { foregroundCount: 48, tracerRatio: 0.68, pixelRatio: 1.5, modeCount: 6, frameMs: 1000 / 60 },
  { foregroundCount: 48, tracerRatio: 0.68, pixelRatio: 1, modeCount: 6, frameMs: 1000 / 60 },
  { foregroundCount: 48, tracerRatio: 0.68, pixelRatio: 1, modeCount: 4, frameMs: 1000 / 45 },
  { foregroundCount: 32, tracerRatio: 0.55, pixelRatio: 1, modeCount: 4, frameMs: 1000 / 30 },
]
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
    let obstacles: TracerObstacle[] = []
    let lastObstacleSample = -1000
    let tracerController: ReturnType<typeof createSpectralTracerController> = null
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
      tracerController?.resize(width, height, fieldRatio)
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
        .slice(0, SPECTRAL_TRACER_MAX_OBSTACLES)
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

    const drawInteractions = () => {
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

      const totalTracerCount = Math.round(SPECTRAL_TRACER_TARGET * quality.tracerRatio)
      const foregroundCount = Math.min(quality.foregroundCount, totalTracerCount)
      if (fieldBlend > 0.001 && !tracerController) {
        tracerController = createSpectralTracerController(fieldCanvas, frontCanvas)
        tracerController?.resize(
          width,
          height,
          Math.min(window.devicePixelRatio || 1, quality.pixelRatio),
        )
      }
      if (tracerController) {
        tracerController.render({
          deltaSeconds,
          alpha: smoothstep(fieldBlend),
          theme: themeBlend,
          totalCount: totalTracerCount,
          foregroundCount,
          width,
          height,
          obstacles,
        })
      } else {
        frontContext.clearRect(0, 0, width, height)
      }

      drawInteractions()

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
      tracerController?.destroy()
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
      <SpectralTracerLayer backCanvasRef={fieldCanvasRef} frontCanvasRef={frontCanvasRef} />
    </>
  )
}
