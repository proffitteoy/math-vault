"use client"

import { createContext, useContext, useEffect, useMemo, useState } from "react"

export type PerformanceMode = "normal" | "field"

const STORAGE_KEY = "blog-performance-mode"

const FieldModeContext = createContext({
  performanceMode: "normal" as PerformanceMode,
  togglePerformanceMode: () => {},
})

export function FieldModeProvider({ children }: { children: React.ReactNode }) {
  const [performanceMode, setPerformanceMode] = useState<PerformanceMode>("normal")

  useEffect(() => {
    const initializationTimer = window.setTimeout(() => {
      if (localStorage.getItem(STORAGE_KEY) === "field") {
        setPerformanceMode("field")
      }
    }, 0)

    return () => window.clearTimeout(initializationTimer)
  }, [])

  const value = useMemo(
    () => ({
      performanceMode,
      togglePerformanceMode: () => {
        setPerformanceMode((currentMode) => {
          const nextMode = currentMode === "normal" ? "field" : "normal"
          localStorage.setItem(STORAGE_KEY, nextMode)
          return nextMode
        })
      },
    }),
    [performanceMode],
  )

  return <FieldModeContext.Provider value={value}>{children}</FieldModeContext.Provider>
}

export const useFieldMode = () => useContext(FieldModeContext)
