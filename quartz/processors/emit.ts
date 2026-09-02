import { styleText } from "node:util"

import type { ProcessedContent } from "../plugins/vfile"
import type { BuildCtx } from "../util/ctx"
import { QuartzLogger } from "../util/log"
import { PerfTimer } from "../util/perf"
import { trace } from "../util/trace"

export async function emitContent(ctx: BuildCtx, content: ProcessedContent[]) {
  const perf = new PerfTimer()
  const log = new QuartzLogger(ctx.argv.verbose)

  log.start("Emitting files")
  let emittedFiles = 0

  await Promise.all(
    ctx.cfg.plugins.emitters.map(async (emitter) => {
      try {
        const emitted = await emitter.emit(ctx, content)
        if (Symbol.asyncIterator in emitted) {
          for await (const file of emitted) {
            emittedFiles++
            if (ctx.argv.verbose) console.log(`[emit:${emitter.name}] ${file}`)
            else log.updateText(`${emitter.name} -> ${styleText("gray", file)}`)
          }
        } else {
          emittedFiles += emitted.length
        }
      } catch (error) {
        trace(`Failed to emit from plugin \`${emitter.name}\``, error as Error)
      }
    }),
  )

  log.end(`Emitted ${emittedFiles} files in ${perf.timeSince()}`)
}
