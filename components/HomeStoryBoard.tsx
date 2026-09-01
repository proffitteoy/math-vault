"use client"

import Image from "next/image"
import Link from "next/link"
import { useState } from "react"
import { motion, useReducedMotion } from "framer-motion"
import { ArrowUpRight, ChevronLeft, ChevronRight, Clapperboard, FolderGit2 } from "lucide-react"

import type { AnimeShelfState } from "../app/anime/bangumi"
import { siteConfig } from "../siteConfig"
import ThemeToggleBlock from "./ThemeToggleBlock"

const projectHighlights = [
  { name: "early-rumor-propagation-tda", kind: "TDA · Research" },
  { name: "Iris-Terminal", kind: "AI4MATH · Local-first" },
  { name: "ai-data-competitions-ui", kind: "Next.js · React" },
  { name: "topp", kind: "TDA · Python" },
]

const storyPhotos = [
  {
    src: "/profile-studio.png",
    alt: "灯光下的个人研究工作台",
    label: "研究工作台",
  },
  {
    src: siteConfig.photoWallImage,
    alt: "个人照片墙中的日常记录",
    label: "日常记录",
  },
  {
    src: "/about-cover.png",
    alt: "关于页面的个人主题照片",
    label: "关于我",
  },
]

export default function HomeStoryBoard({ animeShelf }: { animeShelf: AnimeShelfState }) {
  const [activePhoto, setActivePhoto] = useState(0)
  const reduceMotion = useReducedMotion()
  const animeReady = animeShelf.status === "ready"
  const watching = animeReady ? animeShelf.watching : null
  const totalAnime = animeReady ? animeShelf.watching.total + animeShelf.watched.total : null
  const covers = watching?.items.filter((anime) => anime.cover).slice(0, 12) ?? []
  const shouldScrollCovers = covers.length > 4 && !reduceMotion

  function showPreviousPhoto() {
    setActivePhoto((current) => (current - 1 + storyPhotos.length) % storyPhotos.length)
  }

  function showNextPhoto() {
    setActivePhoto((current) => (current + 1) % storyPhotos.length)
  }

  return (
    <section className="grid grid-cols-1 gap-5 lg:grid-cols-12" aria-label="近况与作品">
      <figure className="group relative min-h-[300px] overflow-hidden rounded-[2rem] border border-white/55 bg-white/45 shadow-[0_24px_70px_-36px_rgba(15,23,42,0.65)] backdrop-blur-xl lg:col-span-7 lg:row-span-2 lg:min-h-[390px] dark:border-white/10 dark:bg-slate-900/45">
        {storyPhotos.map((photo, index) => (
          <Image
            key={photo.src}
            src={photo.src}
            alt={photo.alt}
            fill
            priority={index === 0}
            className={`object-cover transition-[opacity,transform] duration-700 ease-out ${index === activePhoto ? "scale-100 opacity-100" : "scale-[1.03] opacity-0"}`}
            sizes="(min-width: 1024px) 58vw, 100vw"
          />
        ))}
        <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-slate-950/70 via-slate-950/5 to-transparent" />
        <div className="absolute left-5 top-5 z-10 sm:left-7 sm:top-7">
          <ThemeToggleBlock compact />
        </div>
        <div className="pointer-events-none absolute right-5 top-5 rounded-full border border-white/20 bg-slate-950/35 px-3 py-1.5 text-[10px] font-bold tracking-[0.18em] text-white/90 backdrop-blur-md sm:right-7 sm:top-7">
          {String(activePhoto + 1).padStart(2, "0")} / {String(storyPhotos.length).padStart(2, "0")}
        </div>
        <figcaption className="absolute inset-x-0 bottom-0 flex items-end justify-between gap-4 p-5 sm:p-7">
          <div className="max-w-lg text-white">
            <p className="text-[10px] font-black uppercase tracking-[0.32em] text-sky-200/90">
              {storyPhotos[activePhoto].label} · 2026
            </p>
            <h2 className="mt-2 text-2xl font-black tracking-tight sm:text-3xl">
              研究、构建，也持续记录。
            </h2>
          </div>
        </figcaption>
      </figure>

      <article className="relative overflow-hidden rounded-[2rem] border border-white/55 bg-white/55 p-5 shadow-[0_20px_60px_-38px_rgba(15,23,42,0.7)] backdrop-blur-xl sm:p-6 lg:col-span-5 dark:border-white/10 dark:bg-slate-900/55">
        <div className="absolute -right-20 -top-24 h-48 w-48 rounded-full bg-sky-300/20 blur-3xl dark:bg-sky-500/10" />
        <div className="relative">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div>
              <p className="flex items-center gap-2 text-[10px] font-black uppercase tracking-[0.28em] text-sky-700 dark:text-sky-300">
                <FolderGit2 className="h-4 w-4" aria-hidden="true" />
                Selected Work
              </p>
              <h2 className="mt-2 text-xl font-black text-slate-900 dark:text-white">
                正在维护的作品
              </h2>
            </div>
            <div className="flex items-center gap-2">
              <div className="flex items-center rounded-full border border-slate-200/80 bg-white/65 p-1 shadow-sm dark:border-white/10 dark:bg-slate-950/40">
                <button
                  type="button"
                  onClick={showPreviousPhoto}
                  aria-label="查看上一张左侧照片"
                  className="inline-flex h-7 w-7 items-center justify-center rounded-full text-slate-600 transition-colors hover:bg-sky-100 hover:text-sky-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-500 dark:text-slate-300 dark:hover:bg-sky-400/10 dark:hover:text-sky-300"
                >
                  <ChevronLeft className="h-4 w-4" aria-hidden="true" />
                </button>
                <span className="px-1 text-[10px] font-black tabular-nums text-slate-500 dark:text-slate-400">
                  照片 {activePhoto + 1}/{storyPhotos.length}
                </span>
                <button
                  type="button"
                  onClick={showNextPhoto}
                  aria-label="查看下一张左侧照片"
                  className="inline-flex h-7 w-7 items-center justify-center rounded-full text-slate-600 transition-colors hover:bg-sky-100 hover:text-sky-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-500 dark:text-slate-300 dark:hover:bg-sky-400/10 dark:hover:text-sky-300"
                >
                  <ChevronRight className="h-4 w-4" aria-hidden="true" />
                </button>
              </div>
              <Link
                href="/projects"
                aria-label="查看全部项目"
                className="inline-flex h-9 w-9 items-center justify-center rounded-full border border-slate-200/80 bg-white/65 text-slate-700 transition-colors hover:border-sky-300 hover:text-sky-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-500 dark:border-white/10 dark:bg-slate-950/40 dark:text-slate-200 dark:hover:border-sky-400/40 dark:hover:text-sky-300"
              >
                <ArrowUpRight className="h-4 w-4" aria-hidden="true" />
              </Link>
            </div>
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
            <div className="flex items-end gap-5">
              <div className="shrink-0">
                <div className="text-4xl font-black tabular-nums">{watching?.total ?? 0}</div>
                <p className="mt-1 text-xs font-medium text-slate-300">
                  部在看 · 共记录 {totalAnime} 部
                </p>
              </div>
              {covers.length > 0 && (
                <div
                  className="min-w-0 flex-1 overflow-hidden [mask-image:linear-gradient(to_right,transparent,black_12%,black_88%,transparent)]"
                  aria-label={`正在滚动播放：${covers.map((anime) => anime.title).join("、")}`}
                >
                  <motion.div
                    className="flex w-max"
                    animate={shouldScrollCovers ? { x: ["0%", "-50%"] } : undefined}
                    transition={
                      shouldScrollCovers
                        ? {
                            duration: Math.max(16, covers.length * 2.8),
                            ease: "linear",
                            repeat: Infinity,
                          }
                        : undefined
                    }
                  >
                    {(shouldScrollCovers ? [0, 1] : [0]).map((copy) => (
                      <div
                        key={copy}
                        className="flex shrink-0 gap-2 pr-2"
                        aria-hidden={copy === 1 ? "true" : undefined}
                      >
                        {covers.map((anime) => (
                          <div
                            key={`${copy}-${anime.id}`}
                            title={anime.title}
                            className="relative h-16 w-12 shrink-0 overflow-hidden rounded-xl border-2 border-slate-900 bg-slate-800 shadow-lg transition-transform duration-300 group-hover:-translate-y-1"
                          >
                            <Image
                              src={anime.cover!}
                              alt={copy === 0 ? anime.title + "封面" : ""}
                              fill
                              className="object-cover"
                              sizes="48px"
                            />
                          </div>
                        ))}
                      </div>
                    ))}
                  </motion.div>
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
