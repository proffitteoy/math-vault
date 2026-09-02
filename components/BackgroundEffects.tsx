"use client"

import { useEffect, useRef } from "react"
import { siteConfig } from "../siteConfig"
import { useTheme } from "./ThemeProvider"

const FRAME_MS = 1000 / 30
const MAX_PIXEL_RATIO = 1.25
const TAU = Math.PI * 2
const PHI = (1 + Math.sqrt(5)) / 2

function hash(index: number, seed: number) {
  const value = Math.sin(index * 12.9898 + seed * 78.233) * 43758.5453
  return value - Math.floor(value)
}

function wrap(value: number, size: number) {
  return ((value % size) + size) % size
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

export default function BackgroundEffects() {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const { isDark } = useTheme()

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return

    const context = canvas.getContext("2d", { alpha: true })
    if (!context) return

    const sakura = isDark
      ? []
      : Array.from({ length: 20 }, (_, index) => ({
          x0: hash(index, 1),
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
        }))
    const fireflies = isDark
      ? Array.from({ length: 20 }, (_, index) => ({
          x0: 0.08 + hash(index, 1) * 0.84,
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
          wGlow: 0.5 + hash(index, 13) * 0.65,
          rho: hash(index, 14) * TAU,
          radius: 2.2 + hash(index, 15) * 2.4,
        }))
      : []
    const grass = Array.from({ length: 60 }, (_, index) => ({
      x: (index + 0.5 + (hash(index, 1) - 0.5) * 0.55) / 60,
      height: 30 + hash(index, 2) * 52,
      width: 1 + hash(index, 3) * 1.8,
      baseAngle: -0.07 + hash(index, 4) * 0.14,
      amplitude: 0.08 + hash(index, 5) * 0.12,
      secondaryAmplitude: 0.025 + hash(index, 6) * 0.065,
      phase: hash(index, 7) * TAU,
      opacity: 0.24 + hash(index, 8) * 0.34,
    }))
    const danmaku = siteConfig.danmakuList.length
      ? Array.from({ length: 8 }, (_, index) => ({
          text: siteConfig.danmakuList[
            Math.floor(hash(index, 1) * siteConfig.danmakuList.length)
          ],
          y: 0.12 + hash(index, 2) * 0.36,
          speed: 24 + hash(index, 3) * 18,
          phase: hash(index, 4) * 42,
        }))
      : []
    const fireflySprite = isDark ? createFireflySprite() : null
    const desktopQuery = window.matchMedia("(min-width: 768px)")
    const reducedMotionQuery = window.matchMedia("(prefers-reduced-motion: reduce)")

    let width = 0
    let height = 0
    let animationFrame = 0
    let lastFrame = 0

    const resizeCanvas = () => {
      width = window.innerWidth
      height = window.innerHeight
      const pixelRatio = Math.min(window.devicePixelRatio || 1, MAX_PIXEL_RATIO)

      canvas.width = Math.max(1, Math.floor(width * pixelRatio))
      canvas.height = Math.max(1, Math.floor(height * pixelRatio))
      canvas.style.width = width + "px"
      canvas.style.height = height + "px"
      context.setTransform(pixelRatio, 0, 0, pixelRatio, 0, 0)
    }

    const render = (time: number) => {
      context.clearRect(0, 0, width, height)

      context.font = '700 18px "Source Han Serif SC", "Noto Serif SC", serif'
      context.textBaseline = "middle"
      context.fillStyle = isDark ? "rgba(255, 255, 255, 0.1)" : "rgba(255, 255, 255, 0.3)"
      for (const item of danmaku) {
        const textWidth = context.measureText(item.text).width
        const distance = width + textWidth
        const x = width - ((item.speed * (time + item.phase)) % distance)
        context.fillText(item.text, x, height * item.y)
      }

      for (const petal of sakura) {
        const margin = petal.size * 2
        const rawX =
          petal.x0 * width +
          petal.wind * time +
          petal.a * Math.sin(petal.w * time + petal.phi) +
          petal.b * Math.sin(PHI * petal.w * time + petal.psi)
        const x = wrap(rawX + margin, width + margin * 2) - margin
        const y =
          wrap(petal.y0 * height + petal.fallSpeed * time + margin, height + margin * 2) -
          margin
        const angle =
          petal.theta0 +
          petal.spin * time +
          petal.twist * Math.sin(petal.nu * time + petal.eta)
        const squash = 0.75 + 0.25 * Math.sin(petal.mu * time + petal.xi)

        context.save()
        context.translate(x, y)
        context.rotate(angle)
        context.scale(squash, 1)
        context.fillStyle = "rgba(249, 168, 212, " + petal.opacity + ")"
        context.beginPath()
        context.moveTo(0, -petal.size * 0.65)
        context.bezierCurveTo(
          petal.size * 0.65,
          -petal.size * 0.2,
          petal.size * 0.5,
          petal.size * 0.65,
          0,
          petal.size * 0.7,
        )
        context.bezierCurveTo(
          -petal.size * 0.45,
          petal.size * 0.55,
          -petal.size * 0.55,
          -petal.size * 0.2,
          0,
          -petal.size * 0.65,
        )
        context.fill()
        context.restore()
      }

      if (fireflySprite) {
        for (const firefly of fireflies) {
          const x =
            firefly.x0 * width +
            firefly.a * Math.sin(firefly.wx * time + firefly.phi) +
            firefly.b * Math.sin(Math.SQRT2 * firefly.wx * time + firefly.psi)
          const y =
            firefly.y0 * height +
            firefly.c * Math.sin(firefly.wy * time + firefly.eta) +
            firefly.d * Math.sin(Math.sqrt(3) * firefly.wy * time + firefly.xi)
          const breathe = 0.5 + 0.5 * Math.sin(firefly.wGlow * time + firefly.rho)
          const radius = firefly.radius * (0.85 + 0.25 * breathe)
          const glowSize = radius * 9

          context.globalAlpha = 0.15 + 0.85 * breathe
          context.drawImage(
            fireflySprite,
            x - glowSize / 2,
            y - glowSize / 2,
            glowSize,
            glowSize,
          )
        }
        context.globalAlpha = 1
      }

      const windFrequency = 0.8
      const waveNumber = (TAU * 2.2) / Math.max(width, 1)
      const gust =
        0.7 +
        0.3 * Math.sin(0.17 * time) +
        0.12 * Math.sin(Math.SQRT2 * 0.17 * time)
      context.lineCap = "round"
      context.strokeStyle = isDark ? "rgb(226, 232, 240)" : "rgb(16, 185, 129)"

      for (const blade of grass) {
        const x = blade.x * width
        const wave1 = Math.sin(windFrequency * time - waveNumber * x)
        const wave2 = Math.sin(
          Math.SQRT2 * windFrequency * time - 0.63 * waveNumber * x + blade.phase,
        )
        const angle =
          blade.baseAngle +
          gust * (blade.amplitude * wave1 + blade.secondaryAmplitude * wave2)
        const tipX = x + Math.sin(angle) * blade.height
        const tipY = height - Math.cos(angle) * blade.height

        context.globalAlpha = blade.opacity
        context.lineWidth = blade.width
        context.beginPath()
        context.moveTo(x, height + 2)
        context.quadraticCurveTo(
          x + Math.sin(angle) * blade.height * 0.35,
          height - blade.height * 0.55,
          tipX,
          tipY,
        )
        context.stroke()
      }
      context.globalAlpha = 1
    }

    const stopAnimation = () => {
      if (!animationFrame) return
      window.cancelAnimationFrame(animationFrame)
      animationFrame = 0
    }

    const animate = (now: number) => {
      const elapsed = now - lastFrame
      if (elapsed >= FRAME_MS) {
        lastFrame = now - (elapsed % FRAME_MS)
        render(now / 1000)
      }
      animationFrame = window.requestAnimationFrame(animate)
    }

    const syncAnimation = () => {
      stopAnimation()
      if (!desktopQuery.matches) {
        canvas.width = 1
        canvas.height = 1
        return
      }

      resizeCanvas()
      render(performance.now() / 1000)
      if (document.visibilityState === "visible" && !reducedMotionQuery.matches) {
        lastFrame = performance.now()
        animationFrame = window.requestAnimationFrame(animate)
      }
    }

    const handleResize = () => {
      if (!desktopQuery.matches) return
      resizeCanvas()
      render(performance.now() / 1000)
    }

    window.addEventListener("resize", handleResize)
    document.addEventListener("visibilitychange", syncAnimation)
    desktopQuery.addEventListener("change", syncAnimation)
    reducedMotionQuery.addEventListener("change", syncAnimation)
    syncAnimation()

    return () => {
      stopAnimation()
      window.removeEventListener("resize", handleResize)
      document.removeEventListener("visibilitychange", syncAnimation)
      desktopQuery.removeEventListener("change", syncAnimation)
      reducedMotionQuery.removeEventListener("change", syncAnimation)
    }
  }, [isDark])

  return (
    <canvas
      ref={canvasRef}
      className="absolute inset-0 h-full w-full"
      data-effect-mode={isDark ? "night" : "day"}
      aria-hidden="true"
    />
  )
}
