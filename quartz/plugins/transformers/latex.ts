import type { KatexOptions } from "katex"
import rehypeKatex from "rehype-katex"
import remarkMath from "remark-math"

import type { QuartzTransformerPlugin } from "../types"

interface Options {
  renderEngine: "katex"
  customMacros: Record<string, string>
  katexOptions: Omit<KatexOptions, "macros" | "output">
}

export const Latex: QuartzTransformerPlugin<Partial<Options>> = (options) => {
  const macros = options?.customMacros ?? {}
  return {
    name: "Latex",
    markdownPlugins() {
      return [remarkMath]
    },
    htmlPlugins() {
      return [[rehypeKatex, { output: "html", macros, ...(options?.katexOptions ?? {}) }]]
    },
  }
}
