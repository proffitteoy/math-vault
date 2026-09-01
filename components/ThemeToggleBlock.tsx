"use client"

import { Moon, Sun } from "lucide-react"
import { useTheme } from "./ThemeProvider"

export default function ThemeToggleBlock({ compact = false }: { compact?: boolean }) {
  const { isDark, toggleTheme } = useTheme()

  if (compact) {
    const Icon = isDark ? Sun : Moon

    return (
      <button
        type="button"
        onClick={toggleTheme}
        aria-pressed={isDark}
        aria-label={isDark ? "切换到日间模式" : "切换到夜间模式"}
        title={isDark ? "切换到日间模式" : "切换到夜间模式"}
        className="inline-flex h-10 items-center gap-2 rounded-full border border-white/55 bg-white/70 px-3.5 text-xs font-bold tracking-wide text-slate-700 shadow-sm backdrop-blur-xl transition-colors hover:bg-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-500 dark:border-white/10 dark:bg-slate-950/55 dark:text-slate-200 dark:hover:bg-slate-900"
      >
        <Icon className="h-4 w-4" aria-hidden="true" />
        {isDark ? "日间" : "夜间"}
      </button>
    )
  }

  return (
    <button
      type="button"
      onClick={toggleTheme}
      aria-pressed={isDark}
      title={isDark ? "切换到日间模式" : "切换到夜间模式"}
      // 【核心修复】：移除了定高限制 (h-[180px] md:h-auto)，换成了统一的 h-full w-full
      className={`h-full w-full rounded-3xl backdrop-blur-md border shadow-xl p-6 flex flex-col justify-center items-center transition-all duration-500 hover:scale-[1.05] cursor-pointer group relative overflow-hidden
        ${isDark ? "bg-slate-800/40 border-slate-600/50" : "bg-white/40 border-white/60"}
      `}
    >
      {/* 日夜交替动画图标 */}
      <div className="relative w-20 h-20 rounded-full overflow-hidden mb-3 shadow-inner flex-shrink-0">
        <div
          className={`absolute inset-0 transition-transform duration-700 ${isDark ? "-translate-y-full" : "translate-y-0"} bg-gradient-to-tr from-sky-300 to-yellow-200`}
        ></div>
        <div
          className={`absolute inset-0 transition-transform duration-700 ${isDark ? "translate-y-0" : "translate-y-full"} bg-gradient-to-tr from-indigo-900 to-slate-800`}
        ></div>

        <div
          className={`absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 transition-all duration-700 ${isDark ? "opacity-0 rotate-90 scale-50" : "opacity-100 rotate-0 scale-100"} text-3xl drop-shadow-md`}
        >
          🌸
        </div>
        <div
          className={`absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 transition-all duration-700 ${isDark ? "opacity-100 rotate-0 scale-100" : "opacity-0 -rotate-90 scale-50"} text-3xl drop-shadow-md`}
        >
          ✨
        </div>
      </div>
      <div className="text-center z-10 mt-auto">
        <h3
          className={`text-xl font-bold transition-colors duration-500 ${isDark ? "text-white" : "text-slate-800"}`}
        >
          {isDark ? "夜间模式" : "日间模式"}
        </h3>
        <p
          className={`text-sm font-medium mt-1 transition-colors duration-500 ${isDark ? "text-slate-400" : "text-slate-600"}`}
        >
          {isDark ? "流萤飞舞的深空" : "落樱漫舞的清晨"}
        </p>
      </div>
    </button>
  )
}
