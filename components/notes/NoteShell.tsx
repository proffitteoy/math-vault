import Link from "next/link"
import { ArrowLeft, CalendarDays, CornerUpLeft, Hash, Link2 } from "lucide-react"

import type { NoteArtifact } from "@/lib/notes/types"
import Navbar from "../Navbar"
import PageTransition from "../PageTransition"

function formatDate(value?: string) {
  if (!value) return null
  return new Intl.DateTimeFormat("zh-CN", {
    year: "numeric",
    month: "short",
    day: "numeric",
  }).format(new Date(value))
}

export default function NoteShell({ note }: { note: NoteArtifact }) {
  const sectionTitle = note.section === "blog" ? "博客" : "杂谈"
  const sectionRoute = `/${note.section}`
  const displayDate = formatDate(note.dates.modified ?? note.dates.created)

  return (
    <div className="relative min-h-screen pb-20">
      <link rel="stylesheet" href="/quartz-assets/note.css" precedence="default" />
      <Navbar />
      <PageTransition>
        <main className="mx-auto grid w-full max-w-[92rem] grid-cols-1 gap-6 px-4 pt-24 sm:px-6 lg:grid-cols-[14rem_minmax(0,50rem)] lg:px-8 xl:grid-cols-[15rem_minmax(0,52rem)_15rem]">
          <aside className="hidden lg:block" aria-label={`${sectionTitle}导航`}>
            <div className="sticky top-24 rounded-3xl border border-white/50 bg-white/45 p-5 shadow-lg backdrop-blur-xl dark:border-white/10 dark:bg-slate-900/50">
              <Link
                href={sectionRoute}
                className="inline-flex items-center gap-2 text-sm font-black text-sky-700 transition-colors hover:text-sky-500 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-500 dark:text-sky-300"
              >
                <ArrowLeft className="h-4 w-4" aria-hidden="true" />
                返回{sectionTitle}
              </Link>
              <p className="mt-5 text-[10px] font-black tracking-[0.24em] text-slate-400">
                NOTE FIRST
              </p>
              <p className="mt-2 text-sm font-medium leading-6 text-slate-600 dark:text-slate-300">
                正文由 Quartz 完成增强，页面导航与生命周期由主站接管。
              </p>
            </div>
          </aside>

          <section className="min-w-0">
            <header className="mb-5 rounded-[2rem] border border-white/55 bg-white/55 p-6 shadow-[0_24px_70px_-46px_rgba(15,23,42,0.55)] backdrop-blur-xl dark:border-white/10 dark:bg-slate-900/55 sm:p-8">
              <div className="flex flex-wrap items-center gap-2 text-[11px] font-bold text-slate-500 dark:text-slate-400">
                <Link
                  href={sectionRoute}
                  className="rounded-full bg-sky-500/10 px-3 py-1.5 text-sky-700 hover:bg-sky-500/15 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-500 dark:text-sky-300"
                >
                  {sectionTitle}
                </Link>
                {displayDate && (
                  <span className="inline-flex items-center gap-1.5">
                    <CalendarDays className="h-3.5 w-3.5" aria-hidden="true" />
                    {displayDate}
                  </span>
                )}
              </div>
              <h1 className="mt-5 break-words text-3xl font-black leading-tight tracking-[-0.045em] text-slate-950 dark:text-white sm:text-4xl">
                {note.title}
              </h1>
              {note.description && (
                <p className="mt-4 max-w-3xl text-sm font-medium leading-7 text-slate-600 dark:text-slate-300">
                  {note.description}
                </p>
              )}
              {note.tags.length > 0 && (
                <ul className="mt-5 flex flex-wrap gap-2" aria-label="笔记标签">
                  {note.tags.map((tag) => (
                    <li
                      key={tag}
                      className="inline-flex items-center gap-1 rounded-full border border-slate-200/80 bg-white/65 px-3 py-1.5 text-[11px] font-bold text-slate-600 dark:border-white/10 dark:bg-slate-950/45 dark:text-slate-300"
                    >
                      <Hash className="h-3 w-3" aria-hidden="true" />
                      {tag}
                    </li>
                  ))}
                </ul>
              )}
            </header>

            {note.toc.length > 0 && (
              <details className="mb-5 rounded-2xl border border-white/50 bg-white/45 p-4 text-sm shadow-sm backdrop-blur lg:hidden dark:border-white/10 dark:bg-slate-900/45">
                <summary className="cursor-pointer font-black text-slate-800 dark:text-slate-100">
                  本页目录
                </summary>
                <ol className="mt-3 space-y-2 pl-4">
                  {note.toc.map((entry) => (
                    <li
                      key={`${entry.slug}-${entry.depth}`}
                      style={{ paddingLeft: entry.depth * 12 }}
                    >
                      <a
                        className="text-slate-600 hover:text-sky-600 dark:text-slate-300"
                        href={`#${entry.slug}`}
                      >
                        {entry.text}
                      </a>
                    </li>
                  ))}
                </ol>
              </details>
            )}

            <div className="quartz-note page rounded-[2rem] border border-white/55 bg-white/70 p-5 shadow-[0_30px_80px_-52px_rgba(15,23,42,0.6)] backdrop-blur-xl dark:border-white/10 dark:bg-slate-900/70 sm:p-8 md:p-10">
              <article
                id="main-content"
                className="popover-hint"
                dangerouslySetInnerHTML={{ __html: note.html }}
              />
            </div>

            {note.backlinks.length > 0 && (
              <section className="mt-5 rounded-3xl border border-white/50 bg-white/45 p-5 backdrop-blur-xl xl:hidden dark:border-white/10 dark:bg-slate-900/45">
                <h2 className="flex items-center gap-2 text-sm font-black text-slate-900 dark:text-white">
                  <CornerUpLeft className="h-4 w-4 text-sky-500" aria-hidden="true" />
                  反向链接
                </h2>
                <ul className="mt-3 space-y-2">
                  {note.backlinks.map((backlink) => (
                    <li key={backlink.route}>
                      <Link
                        className="text-sm text-slate-600 hover:text-sky-600 dark:text-slate-300"
                        href={backlink.route}
                      >
                        {backlink.title}
                      </Link>
                    </li>
                  ))}
                </ul>
              </section>
            )}
          </section>

          <aside className="hidden xl:block" aria-label="笔记辅助信息">
            <div className="sticky top-24 space-y-4">
              {note.toc.length > 0 && (
                <nav className="rounded-3xl border border-white/50 bg-white/45 p-5 shadow-lg backdrop-blur-xl dark:border-white/10 dark:bg-slate-900/50">
                  <h2 className="flex items-center gap-2 text-sm font-black text-slate-900 dark:text-white">
                    <Link2 className="h-4 w-4 text-sky-500" aria-hidden="true" />
                    本页目录
                  </h2>
                  <ol className="mt-4 max-h-[45vh] space-y-2 overflow-y-auto pr-1">
                    {note.toc.map((entry) => (
                      <li
                        key={`${entry.slug}-${entry.depth}`}
                        style={{ paddingLeft: entry.depth * 10 }}
                      >
                        <a
                          className="text-xs leading-5 text-slate-500 hover:text-sky-600 dark:text-slate-400"
                          href={`#${entry.slug}`}
                        >
                          {entry.text}
                        </a>
                      </li>
                    ))}
                  </ol>
                </nav>
              )}

              <section className="rounded-3xl border border-white/50 bg-white/45 p-5 shadow-lg backdrop-blur-xl dark:border-white/10 dark:bg-slate-900/50">
                <h2 className="flex items-center gap-2 text-sm font-black text-slate-900 dark:text-white">
                  <CornerUpLeft className="h-4 w-4 text-sky-500" aria-hidden="true" />
                  反向链接
                </h2>
                {note.backlinks.length > 0 ? (
                  <ul className="mt-4 space-y-2.5">
                    {note.backlinks.map((backlink) => (
                      <li key={backlink.route}>
                        <Link
                          className="text-xs leading-5 text-slate-500 hover:text-sky-600 dark:text-slate-400"
                          href={backlink.route}
                        >
                          {backlink.title}
                        </Link>
                      </li>
                    ))}
                  </ul>
                ) : (
                  <p className="mt-3 text-xs leading-5 text-slate-400">暂无其他笔记链接到这里。</p>
                )}
              </section>
            </div>
          </aside>
        </main>
      </PageTransition>
    </div>
  )
}
