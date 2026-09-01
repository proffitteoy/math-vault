"use client"

import { siteConfig } from "../siteConfig"

export default function BackgroundSlider() {
  return (
    <div className="absolute inset-0 overflow-hidden" aria-hidden="true">
      <div
        className="absolute inset-0 scale-[1.01] bg-cover bg-center opacity-100 transition-opacity duration-1000"
        style={{ backgroundImage: `url(${siteConfig.backgroundImage})` }}
      />
    </div>
  )
}
