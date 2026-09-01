"use client"

import { usePathname } from "next/navigation"

import { siteConfig } from "../siteConfig"

export default function BackgroundSlider() {
  const pathname = usePathname()
  const isBlogRoute =
    pathname === "/blog" ||
    pathname.startsWith("/blog/") ||
    pathname === "/chatter" ||
    pathname.startsWith("/chatter/")

  return (
    <div className="absolute inset-0 overflow-hidden" aria-hidden="true">
      <div
        className={`absolute inset-0 scale-[1.01] bg-cover bg-center transition-opacity duration-1000 ${isBlogRoute ? "opacity-0" : "opacity-100"}`}
        style={{ backgroundImage: `url(${siteConfig.mainBackgroundImage})` }}
      />
      <div
        className={`absolute inset-0 scale-[1.01] bg-cover bg-center transition-opacity duration-1000 ${isBlogRoute ? "opacity-100" : "opacity-0"}`}
        style={{ backgroundImage: `url(${siteConfig.blogBackgroundImage})` }}
      />
    </div>
  )
}
