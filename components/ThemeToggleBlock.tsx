"use client"

import { useTheme } from "./ThemeProvider"

export default function ThemeToggleBlock() {
  const { isDark, toggleTheme } = useTheme()

  return (
    <button
      type="button"
      onClick={toggleTheme}
      aria-pressed={isDark}
      title={isDark ? "切换到日间模式" : "切换到夜间模式"}
      className={`group relative flex h-full min-h-[132px] w-full cursor-pointer items-center overflow-hidden rounded-3xl border p-5 text-left shadow-xl backdrop-blur-md transition-all duration-500 hover:-translate-y-0.5 hover:shadow-2xl focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-500 lg:min-h-0
        ${isDark ? "bg-slate-800/40 border-slate-600/50" : "bg-white/40 border-white/60"}
      `}
    >
      <div className="relative mr-4 h-14 w-14 shrink-0 overflow-hidden rounded-2xl border border-white/35 shadow-inner">
        <div
          className={`absolute inset-0 transition-transform duration-700 ${isDark ? "-translate-y-full" : "translate-y-0"} bg-gradient-to-tr from-sky-300 to-yellow-200`}
        ></div>
        <div
          className={`absolute inset-0 transition-transform duration-700 ${isDark ? "translate-y-0" : "translate-y-full"} bg-gradient-to-tr from-indigo-900 to-slate-800`}
        ></div>

        <div
          className={`absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 transition-all duration-700 ${isDark ? "opacity-0 rotate-90 scale-50" : "opacity-100 rotate-0 scale-100"} text-2xl drop-shadow-md`}
        >
          🌸
        </div>
        <div
          className={`absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 transition-all duration-700 ${isDark ? "opacity-100 rotate-0 scale-100" : "opacity-0 -rotate-90 scale-50"} text-2xl drop-shadow-md`}
        >
          ✨
        </div>
      </div>
      <div className="relative z-10 min-w-0">
        <h3
          className={`text-lg font-black tracking-tight transition-colors duration-500 ${isDark ? "text-white" : "text-slate-800"}`}
        >
          昼夜交替
        </h3>
        <p
          className={`mt-1 text-xs font-bold tracking-wide transition-colors duration-500 ${isDark ? "text-slate-400" : "text-slate-600"}`}
        >
          {isDark ? "当前 · 夜间流萤" : "当前 · 日间落樱"}
        </p>
      </div>
    </button>
  )
}
