import Image from "next/image"
import Link from "next/link"
import { ArrowUpRight, Clapperboard, FolderGit2 } from "lucide-react"

import type { AnimeShelfState } from "../app/anime/bangumi"
import ThemeToggleBlock from "./ThemeToggleBlock"

const projectHighlights = [
  { name: "early-rumor-propagation-tda", kind: "TDA · Research" },
  { name: "Iris-Terminal", kind: "AI4MATH · Local-first" },
  { name: "ai-data-competitions-ui", kind: "Next.js · React" },
  { name: "topp", kind: "TDA · Python" },
]

export default function HomeStoryBoard({ animeShelf }: { animeShelf: AnimeShelfState }) {
  const animeReady = animeShelf.status === "ready"
  const watching = animeReady ? animeShelf.watching : null
  const totalAnime = animeReady ? animeShelf.watching.total + animeShelf.watched.total : null
  const covers = watching?.items.filter((anime) => anime.cover).slice(0, 4) ?? []

  return (
    <section className="grid grid-cols-1 gap-5 lg:grid-cols-12" aria-label="近况与作品">
      <figure className="group relative overflow-hidden rounded-[2rem] border border-white/55 bg-white/45 shadow-[0_24px_70px_-36px_rgba(15,23,42,0.65)] backdrop-blur-xl lg:col-span-7 lg:row-span-2 dark:border-white/10 dark:bg-slate-900/45">
        <Image
          src="/profile-studio.png"
          alt="proffitteoy 的工作照"
          width={1672}
          height={941}
          priority
          className="aspect-[16/9] h-full min-h-[300px] w-full object-cover transition-transform duration-700 ease-out group-hover:scale-[1.015] lg:min-h-[390px]"
          sizes="(min-width: 1024px) 58vw, 100vw"
        />
        <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-slate-950/70 via-slate-950/5 to-transparent" />
        <figcaption className="absolute inset-x-0 bottom-0 flex items-end justify-between gap-4 p-5 sm:p-7">
          <div className="max-w-lg text-white">
            <p className="text-[10px] font-black uppercase tracking-[0.32em] text-sky-200/90">
              Working Notes · 2026
            </p>
            <h2 className="mt-2 text-2xl font-black tracking-tight sm:text-3xl">
              研究、构建，也持续记录。
            </h2>
          </div>
          <div className="pointer-events-auto shrink-0">
            <ThemeToggleBlock compact />
          </div>
        </figcaption>
      </figure>

      <article className="relative overflow-hidden rounded-[2rem] border border-white/55 bg-white/55 p-5 shadow-[0_20px_60px_-38px_rgba(15,23,42,0.7)] backdrop-blur-xl sm:p-6 lg:col-span-5 dark:border-white/10 dark:bg-slate-900/55">
        <div className="absolute -right-20 -top-24 h-48 w-48 rounded-full bg-sky-300/20 blur-3xl dark:bg-sky-500/10" />
        <div className="relative">
          <div className="flex items-start justify-between gap-4">
            <div>
              <p className="flex items-center gap-2 text-[10px] font-black uppercase tracking-[0.28em] text-sky-700 dark:text-sky-300">
                <FolderGit2 className="h-4 w-4" aria-hidden="true" />
                Selected Work
              </p>
              <h2 className="mt-2 text-xl font-black text-slate-900 dark:text-white">
                正在维护的作品
              </h2>
            </div>
            <Link
              href="/projects"
              className="inline-flex items-center gap-1.5 rounded-full border border-slate-200/80 bg-white/65 px-3 py-2 text-xs font-bold text-slate-700 transition-colors hover:border-sky-300 hover:text-sky-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-500 dark:border-white/10 dark:bg-slate-950/40 dark:text-slate-200 dark:hover:border-sky-400/40 dark:hover:text-sky-300"
            >
              查看全部
              <ArrowUpRight className="h-3.5 w-3.5" aria-hidden="true" />
            </Link>
          </div>

          <div className="mt-5 grid gap-2 sm:grid-cols-2">
            {projectHighlights.map((project, index) => (
              <div
                key={project.name}
                className="rounded-2xl border border-slate-200/70 bg-white/45 px-3.5 py-3 dark:border-white/10 dark:bg-slate-950/25"
              >
                <div className="text-[10px] font-black tabular-nums text-slate-400">
                  0{index + 1}
                </div>
                <h3 className="mt-1 break-words text-sm font-black leading-snug text-slate-800 dark:text-slate-100">
                  {project.name}
                </h3>
                <p className="mt-1 text-[10px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                  {project.kind}
                </p>
              </div>
            ))}
          </div>
        </div>
      </article>

      <Link
        href="/anime"
        className="group relative overflow-hidden rounded-[2rem] border border-white/55 bg-slate-950/85 p-5 text-white shadow-[0_20px_60px_-36px_rgba(15,23,42,0.85)] backdrop-blur-xl focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-400 sm:p-6 lg:col-span-5 dark:border-white/10"
      >
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_85%_10%,rgba(56,189,248,0.22),transparent_45%)]" />
        <div className="relative flex min-h-[180px] flex-col justify-between gap-5">
          <div className="flex items-start justify-between gap-4">
            <div>
              <p className="flex items-center gap-2 text-[10px] font-black uppercase tracking-[0.28em] text-sky-200">
                <Clapperboard className="h-4 w-4" aria-hidden="true" />
                Anime Log
              </p>
              <h2 className="mt-2 text-xl font-black">{animeReady ? "现在正在看" : "番剧档案"}</h2>
            </div>
            <ArrowUpRight
              className="h-5 w-5 text-sky-200 transition-transform duration-300 group-hover:-translate-y-0.5 group-hover:translate-x-0.5"
              aria-hidden="true"
            />
          </div>

          {animeReady ? (
            <div className="flex items-end justify-between gap-5">
              <div>
                <div className="text-4xl font-black tabular-nums">{watching?.total ?? 0}</div>
                <p className="mt-1 text-xs font-medium text-slate-300">
                  部在看 · 共记录 {totalAnime} 部
                </p>
              </div>
              {covers.length > 0 && (
                <div className="flex -space-x-3" aria-label="正在看的部分番剧封面">
                  {covers.map((anime) => (
                    <div
                      key={anime.id}
                      className="relative h-16 w-12 overflow-hidden rounded-xl border-2 border-slate-900 bg-slate-800 shadow-lg transition-transform duration-300 group-hover:-translate-y-1"
                    >
                      <Image
                        src={anime.cover!}
                        alt={anime.title + "封面"}
                        fill
                        className="object-cover"
                        sizes="48px"
                      />
                    </div>
                  ))}
                </div>
              )}
            </div>
          ) : (
            <div>
              <p className="max-w-sm text-sm leading-6 text-slate-300">
                番剧数据暂时离线，完整收藏仍可从番剧页重新载入。
              </p>
              <span className="mt-3 inline-block text-xs font-bold text-sky-200">打开番剧页</span>
            </div>
          )}
        </div>
      </Link>
    </section>
  )
}
