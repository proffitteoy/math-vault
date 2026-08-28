"use client"

import { type RefObject, useCallback, useEffect, useMemo, useRef, useState } from "react"
import {
  ChevronDown,
  Clapperboard,
  LoaderCircle,
  Play,
  RotateCcw,
  Sparkles,
  Star,
} from "lucide-react"
import Image from "next/image"
import BackButton from "../../components/BackButton"
import { groupAnimeByRating, mergeAnimeEntries } from "./collection"
import type { AnimeCollectionSlice, AnimeEntry, AnimeShelfStatus } from "./bangumi"

type AnimeShelfProps = {
  username: string
  watching: AnimeCollectionSlice
  watched: AnimeCollectionSlice
}

const initialStatusState = {
  watching: false,
  watched: false,
} satisfies Record<AnimeShelfStatus, boolean>

export default function AnimeShelf({ username, watching, watched }: AnimeShelfProps) {
  const [collections, setCollections] = useState({ watching, watched })
  const [loading, setLoading] = useState(initialStatusState)
  const [loadError, setLoadError] = useState(initialStatusState)
  const watchingLoadMoreRef = useRef<HTMLDivElement>(null)
  const watchedLoadMoreRef = useRef<HTMLDivElement>(null)

  const loadMore = useCallback(
    async (status: AnimeShelfStatus) => {
      const collection = collections[status]
      if (loading[status] || collection.nextOffset >= collection.total) return

      setLoading((current) => ({ ...current, [status]: true }))
      setLoadError((current) => ({ ...current, [status]: false }))

      try {
        const params = new URLSearchParams({
          status,
          offset: String(collection.nextOffset),
        })
        const response = await fetch("/api/anime?" + params)
        if (!response.ok) {
          throw new Error("request failed with status " + response.status)
        }

        const page = (await response.json()) as AnimeCollectionSlice
        setCollections((current) => ({
          ...current,
          [status]: {
            items: mergeAnimeEntries(current[status].items, page.items),
            total: page.total,
            nextOffset: page.nextOffset,
          },
        }))
      } catch (error) {
        console.error(
          "[AnimeShelf] failed to load more anime:",
          error instanceof Error ? error.message : "unknown error",
        )
        setLoadError((current) => ({ ...current, [status]: true }))
      } finally {
        setLoading((current) => ({ ...current, [status]: false }))
      }
    },
    [collections, loading],
  )

  useEffect(() => {
    const targets = [
      {
        status: "watching" as const,
        element: watchingLoadMoreRef.current,
        collection: collections.watching,
      },
      {
        status: "watched" as const,
        element: watchedLoadMoreRef.current,
        collection: collections.watched,
      },
    ]
    const observers: IntersectionObserver[] = []

    for (const { status, element, collection } of targets) {
      if (!element || loading[status] || collection.nextOffset >= collection.total) continue

      const observer = new IntersectionObserver(
        ([entry]) => {
          if (entry.isIntersecting) void loadMore(status)
        },
        { rootMargin: "240px 0px" },
      )
      observer.observe(element)
      observers.push(observer)
    }

    return () => observers.forEach((observer) => observer.disconnect())
  }, [collections, loadMore, loading])

  const watchedGroups = useMemo(
    () => groupAnimeByRating(collections.watched.items),
    [collections.watched.items],
  )

  return (
    <main className="relative z-10 mx-auto w-full max-w-6xl px-4 pb-24 pt-20 sm:px-6 lg:px-10">
      <BackButton />

      <header className="relative mt-3 overflow-hidden rounded-[1.75rem] border border-white/55 bg-white/45 px-4 py-4 shadow-xl backdrop-blur-xl dark:border-white/10 dark:bg-slate-900/45 sm:flex sm:items-center sm:justify-between sm:gap-6 sm:px-6">
        <div className="pointer-events-none absolute -right-10 -top-16 h-40 w-40 rounded-full bg-pink-300/20 blur-3xl dark:bg-pink-500/10" />
        <div className="relative flex items-center justify-between gap-4 sm:justify-start">
          <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl border border-white/70 bg-white/65 text-indigo-600 shadow-sm dark:border-white/10 dark:bg-slate-950/35 dark:text-indigo-300">
            <Clapperboard className="h-5 w-5" aria-hidden="true" />
          </div>
          <div>
            <p className="text-[9px] font-black tracking-[0.24em] text-indigo-600 dark:text-indigo-300">
              ANIME INDEX
            </p>
            <div className="mt-0.5 flex items-baseline gap-3">
              <h1 className="text-2xl font-black tracking-tight text-slate-950 dark:text-white">
                番剧
              </h1>
              <a
                href={"https://bgm.tv/user/" + encodeURIComponent(username)}
                target="_blank"
                rel="noopener noreferrer"
                className="text-[10px] font-black text-slate-500 transition hover:text-indigo-600 dark:text-slate-400 dark:hover:text-indigo-300"
              >
                @{username}
              </a>
            </div>
          </div>
        </div>

        <nav
          aria-label="番剧分区"
          className="relative mt-4 grid grid-cols-2 gap-2 sm:mt-0 sm:w-[22rem]"
        >
          <a
            href="#watching"
            className="group flex min-w-0 items-center gap-2 rounded-2xl border border-indigo-200/70 bg-indigo-50/65 px-3 py-2.5 text-indigo-700 shadow-sm transition hover:-translate-y-0.5 hover:border-indigo-300 hover:bg-indigo-100/70 dark:border-indigo-400/15 dark:bg-indigo-500/10 dark:text-indigo-200 dark:hover:bg-indigo-500/15"
          >
            <span className="text-[9px] font-black tracking-[0.16em] opacity-55">01</span>
            <Play className="h-3.5 w-3.5 shrink-0 fill-current" aria-hidden="true" />
            <span className="truncate text-xs font-black">正在看</span>
            <span className="ml-auto rounded-full bg-indigo-600/10 px-1.5 py-0.5 text-[9px] font-black dark:bg-white/10">
              {collections.watching.total}
            </span>
          </a>
          <a
            href="#watched"
            className="group flex min-w-0 items-center gap-2 rounded-2xl border border-amber-200/70 bg-amber-50/65 px-3 py-2.5 text-amber-800 shadow-sm transition hover:-translate-y-0.5 hover:border-amber-300 hover:bg-amber-100/70 dark:border-amber-300/15 dark:bg-amber-400/10 dark:text-amber-200 dark:hover:bg-amber-400/15"
          >
            <span className="text-[9px] font-black tracking-[0.16em] opacity-55">02</span>
            <Star className="h-3.5 w-3.5 shrink-0 fill-current" aria-hidden="true" />
            <span className="truncate text-xs font-black">看过</span>
            <span className="ml-auto rounded-full bg-amber-600/10 px-1.5 py-0.5 text-[9px] font-black dark:bg-white/10">
              {collections.watched.total}
            </span>
          </a>
        </nav>
      </header>

      <section id="watching" aria-labelledby="watching-title" className="mt-10 scroll-mt-24">
        <SectionHeading
          id="watching-title"
          eyebrow="NOW SHOWING"
          title="正在看"
          description="故事还在继续，下一集仍亮着灯。"
          icon="play"
        />

        {collections.watching.items.length > 0 ? (
          <AnimeGrid items={collections.watching.items} />
        ) : (
          <EmptyShelf message="这里暂时没有正在看的故事" />
        )}

        <LoadMoreControl
          containerRef={watchingLoadMoreRef}
          remaining={Math.max(0, collections.watching.total - collections.watching.nextOffset)}
          loading={loading.watching}
          error={loadError.watching}
          onLoadMore={() => void loadMore("watching")}
        />
      </section>

      <section id="watched" aria-labelledby="watched-title" className="mt-16 scroll-mt-24">
        <SectionHeading
          id="watched-title"
          eyebrow="RATED ARCHIVE"
          title="看过"
          description="按我的 Bangumi 评分，从高到低归档。"
          icon="star"
        />

        {watchedGroups.length > 0 ? (
          <div className="space-y-12">
            {watchedGroups.map((group) => {
              const groupId =
                group.rating === null ? "anime-unrated" : "anime-rating-" + group.rating

              return (
                <section key={groupId} aria-labelledby={groupId}>
                  <div className="mb-4 flex items-center gap-3">
                    <span
                      className={
                        "flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl border text-lg font-black shadow-sm " +
                        (group.rating === null
                          ? "border-slate-200/70 bg-white/55 text-slate-500 dark:border-white/10 dark:bg-slate-900/55 dark:text-slate-300"
                          : "border-amber-200/70 bg-amber-50/75 text-amber-700 dark:border-amber-300/15 dark:bg-amber-400/10 dark:text-amber-200")
                      }
                    >
                      {group.rating ?? "—"}
                    </span>
                    <div>
                      <p className="text-[9px] font-black tracking-[0.2em] text-slate-400 dark:text-slate-500">
                        MY SCORE
                      </p>
                      <h3
                        id={groupId}
                        className="mt-0.5 text-lg font-black text-slate-900 dark:text-white"
                      >
                        {group.rating === null ? "未评分" : group.rating + " 分"}
                      </h3>
                    </div>
                    <span className="h-px flex-1 bg-gradient-to-r from-slate-300/70 to-transparent dark:from-white/15" />
                  </div>
                  <AnimeGrid items={group.items} showRating />
                </section>
              )
            })}
          </div>
        ) : (
          <EmptyShelf message="这里暂时没有已经看过的故事" />
        )}

        <LoadMoreControl
          containerRef={watchedLoadMoreRef}
          remaining={Math.max(0, collections.watched.total - collections.watched.nextOffset)}
          loading={loading.watched}
          error={loadError.watched}
          onLoadMore={() => void loadMore("watched")}
        />
      </section>
    </main>
  )
}

function SectionHeading({
  id,
  eyebrow,
  title,
  description,
  icon,
}: {
  id: string
  eyebrow: string
  title: string
  description: string
  icon: "play" | "star"
}) {
  const Icon = icon === "play" ? Sparkles : Star

  return (
    <div className="mb-5 flex items-end justify-between gap-5 px-1">
      <div>
        <div className="flex items-center gap-2 text-[10px] font-black tracking-[0.22em] text-indigo-600 dark:text-indigo-300">
          <Icon className="h-3.5 w-3.5" aria-hidden="true" />
          {eyebrow}
        </div>
        <h2 id={id} className="mt-2 text-2xl font-black text-slate-950 dark:text-white">
          {title}
        </h2>
        <p className="mt-1 text-xs font-medium text-slate-500 dark:text-slate-400 sm:text-sm">
          {description}
        </p>
      </div>
    </div>
  )
}

function AnimeGrid({ items, showRating = false }: { items: AnimeEntry[]; showRating?: boolean }) {
  return (
    <div className="grid grid-cols-4 gap-x-2 gap-y-5 sm:grid-cols-5 sm:gap-x-3 sm:gap-y-6 lg:grid-cols-6 lg:gap-x-4 lg:gap-y-8">
      {items.map((anime) => (
        <a
          key={anime.id}
          href={"https://bgm.tv/subject/" + anime.id}
          target="_blank"
          rel="noopener noreferrer"
          className="group min-w-0"
        >
          <span className="relative block aspect-[3/4] overflow-hidden rounded-xl border border-white/55 bg-slate-200/70 shadow-md transition duration-500 group-hover:-translate-y-1 group-hover:rotate-[0.35deg] group-hover:shadow-xl dark:border-white/10 dark:bg-slate-800/70 sm:rounded-2xl">
            {anime.cover ? (
              <Image
                src={anime.cover}
                alt={anime.title + "封面"}
                fill
                sizes="(max-width: 639px) 24vw, (max-width: 1023px) 19vw, 170px"
                loading="lazy"
                decoding="async"
                referrerPolicy="no-referrer"
                className="h-full w-full object-cover transition duration-700 ease-out group-hover:scale-[1.045]"
              />
            ) : (
              <span className="flex h-full w-full items-center justify-center bg-gradient-to-br from-indigo-200/80 via-white/60 to-pink-200/80 px-2 text-center text-[8px] font-black tracking-[0.14em] text-indigo-700 dark:from-indigo-950 dark:via-slate-900 dark:to-pink-950 dark:text-indigo-200 sm:text-[9px]">
                NO COVER
              </span>
            )}
            <span className="pointer-events-none absolute inset-0 bg-gradient-to-t from-slate-950/20 via-transparent to-white/20 opacity-70 transition-opacity group-hover:opacity-40" />
            <span className="pointer-events-none absolute inset-0 rounded-xl ring-1 ring-inset ring-white/20 sm:rounded-2xl" />
            {showRating && (
              <span
                className={
                  "absolute right-1.5 top-1.5 rounded-full border px-1.5 py-0.5 text-[8px] font-black shadow-sm backdrop-blur-md sm:right-2 sm:top-2 sm:text-[9px] " +
                  (anime.rating === null
                    ? "border-white/40 bg-slate-900/55 text-white"
                    : "border-amber-100/70 bg-amber-400/90 text-amber-950")
                }
              >
                {anime.rating === null ? "未评" : anime.rating + " 分"}
              </span>
            )}
          </span>
          <span className="mt-2 block line-clamp-2 text-center text-[10px] font-black leading-4 text-slate-800 transition-colors group-hover:text-indigo-600 dark:text-slate-100 dark:group-hover:text-indigo-300 sm:mt-2.5 sm:text-xs sm:leading-5">
            {anime.title}
          </span>
        </a>
      ))}
    </div>
  )
}

function EmptyShelf({ message }: { message: string }) {
  return (
    <div className="rounded-[1.75rem] border border-dashed border-white/60 bg-white/35 px-6 py-14 text-center shadow-lg backdrop-blur-xl dark:border-white/10 dark:bg-slate-900/35">
      <Clapperboard className="mx-auto h-8 w-8 text-indigo-400" aria-hidden="true" />
      <p className="mt-4 text-sm font-black text-slate-700 dark:text-slate-200">{message}</p>
    </div>
  )
}

function LoadMoreControl({
  containerRef,
  remaining,
  loading,
  error,
  onLoadMore,
}: {
  containerRef: RefObject<HTMLDivElement | null>
  remaining: number
  loading: boolean
  error: boolean
  onLoadMore: () => void
}) {
  if (remaining <= 0) return null

  return (
    <div ref={containerRef} className="relative mt-8 flex flex-col items-center pt-8">
      <div className="pointer-events-none absolute inset-x-0 -top-20 h-28 bg-gradient-to-b from-transparent to-white/20 dark:to-slate-950/15" />
      <button
        type="button"
        disabled={loading}
        aria-busy={loading}
        onClick={onLoadMore}
        className="relative inline-flex items-center gap-2 rounded-full border border-white/60 bg-white/55 px-5 py-3 text-xs font-black text-slate-700 shadow-lg backdrop-blur-xl transition hover:-translate-y-0.5 hover:border-indigo-300 hover:text-indigo-600 disabled:cursor-wait disabled:opacity-70 dark:border-white/10 dark:bg-slate-900/55 dark:text-slate-200 dark:hover:text-indigo-300"
      >
        {loading ? (
          <LoaderCircle className="h-4 w-4 animate-spin" aria-hidden="true" />
        ) : error ? (
          <RotateCcw className="h-4 w-4" aria-hidden="true" />
        ) : (
          <ChevronDown className="h-4 w-4 animate-bounce" aria-hidden="true" />
        )}
        {loading
          ? "正在接续下一卷…"
          : error
            ? "加载失败，点击重试"
            : "继续展开 · 还有 " + remaining + " 部"}
      </button>
    </div>
  )
}
