"use client"

import Link from "next/link"
import { useMemo, useState } from "react"
import { AnimatePresence, motion } from "framer-motion"
import { Search } from "lucide-react"

type ChatterCard = {
  route: string
  title: string
  description: string
  searchText: string
  date?: string
  tags: string[]
  cover?: string
}

function formatDate(value?: string) {
  if (!value) return "未标日期"
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return "未标日期"
  return new Intl.DateTimeFormat("zh-CN", {
    year: "numeric",
    month: "short",
    day: "numeric",
  }).format(date)
}

export default function ChatterBoard({ chatters }: { chatters: ChatterCard[] }) {
  const [searchQuery, setSearchQuery] = useState("")
  const [activeTag, setActiveTag] = useState("全部")

  const allTags = useMemo(() => {
    const tags = new Set<string>()
    chatters.forEach((chatter) => chatter.tags.forEach((tag) => tags.add(tag)))
    return ["全部", ...tags]
  }, [chatters])

  const filteredChatters = useMemo(() => {
    const query = searchQuery.trim().toLocaleLowerCase("zh-CN")
    return chatters.filter((chatter) => {
      const matchesSearch =
        !query ||
        chatter.title.toLocaleLowerCase("zh-CN").includes(query) ||
        chatter.searchText.toLocaleLowerCase("zh-CN").includes(query)
      const matchesTag = activeTag === "全部" || chatter.tags.includes(activeTag)
      return matchesSearch && matchesTag
    })
  }, [activeTag, chatters, searchQuery])

  return (
    <div className="relative z-10 mx-auto w-full max-w-7xl px-3 pb-16 pt-24 sm:px-6 md:pt-28 lg:px-10">
      <header className="mb-8 text-center md:mb-14">
        <p className="text-[10px] font-black tracking-[0.3em] text-indigo-600 dark:text-indigo-300">
          FIELD NOTES
        </p>
        <h1 className="mt-3 text-4xl font-black tracking-[-0.05em] text-slate-950 dark:text-white md:text-5xl">
          杂谈
        </h1>
        <p className="mx-auto mt-4 max-w-2xl text-sm font-medium leading-7 text-slate-600 dark:text-slate-300 sm:text-base">
          零散想法、开发记录与日常观察，按原始笔记继续展开。
        </p>
      </header>

      <div className="mb-8 flex flex-col items-center gap-5 md:mb-12 md:gap-7">
        <label className="group relative block w-full max-w-lg">
          <span className="sr-only">搜索杂谈</span>
          <Search
            className="absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400 transition-colors group-focus-within:text-indigo-500 md:left-5 md:h-5 md:w-5"
            aria-hidden="true"
          />
          <input
            type="search"
            placeholder="搜寻被遗忘的思绪……"
            value={searchQuery}
            onChange={(event) => setSearchQuery(event.target.value)}
            className="w-full rounded-2xl border border-white/50 bg-white/50 py-3 pl-11 pr-4 text-sm font-medium text-slate-800 shadow-xl backdrop-blur-xl transition focus:outline-none focus:ring-2 focus:ring-indigo-500/50 dark:border-white/10 dark:bg-slate-900/50 dark:text-white md:py-4 md:pl-14 md:text-base"
          />
        </label>

        <div
          className="flex flex-wrap justify-center gap-1.5 md:gap-2"
          aria-label="按标签筛选杂谈"
        >
          {allTags.map((tag) => (
            <button
              key={tag}
              type="button"
              onClick={() => setActiveTag(tag)}
              aria-pressed={activeTag === tag}
              className={
                "rounded-xl border px-3 py-1.5 text-[10px] font-black transition-all duration-300 md:px-5 md:py-2 md:text-xs " +
                (activeTag === tag
                  ? "scale-105 border-indigo-500 bg-indigo-500 text-white shadow-lg shadow-indigo-500/25"
                  : "border-white/40 bg-white/35 text-slate-600 hover:bg-white/60 dark:border-white/10 dark:bg-slate-900/35 dark:text-slate-300 dark:hover:bg-slate-800/60")
              }
            >
              {tag === "全部" ? tag : "# " + tag}
            </button>
          ))}
        </div>
      </div>

      {filteredChatters.length > 0 ? (
        <motion.div
          layout
          className="columns-2 gap-3 space-y-3 md:gap-6 md:space-y-6 lg:columns-3"
        >
          <AnimatePresence mode="popLayout">
            {filteredChatters.map((chatter) => (
              <motion.article
                layout
                initial={{ opacity: 0, scale: 0.96 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.96 }}
                transition={{ duration: 0.22 }}
                key={chatter.route}
                className="break-inside-avoid"
              >
                <Link
                  href={chatter.route}
                  className="group relative block overflow-hidden rounded-2xl border border-white/55 bg-white/50 shadow-md backdrop-blur-xl transition-all duration-500 hover:-translate-y-1 hover:border-indigo-300/70 hover:shadow-2xl focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 motion-reduce:transform-none dark:border-white/10 dark:bg-slate-900/50 md:rounded-[2rem]"
                >
                  {chatter.cover && (
                    <div className="relative h-28 w-full overflow-hidden md:h-52">
                      <img
                        src={chatter.cover}
                        alt={chatter.title + "封面"}
                        loading="lazy"
                        className="h-full w-full object-cover transition-transform duration-1000 group-hover:scale-110"
                      />
                      <div className="absolute inset-0 bg-gradient-to-t from-slate-950/55 via-transparent to-transparent" />
                    </div>
                  )}

                  <div className="p-3 md:p-7">
                    <time className="inline-flex rounded-lg border border-indigo-500/10 bg-indigo-500/5 px-1.5 py-0.5 text-[8px] font-black tracking-wide text-indigo-600 dark:text-indigo-300 md:px-3 md:py-1 md:text-[10px]">
                      {formatDate(chatter.date)}
                    </time>
                    <h2 className="mt-2 line-clamp-2 break-words text-sm font-black leading-tight text-slate-900 transition-colors group-hover:text-indigo-600 dark:text-white dark:group-hover:text-indigo-300 md:mt-4 md:text-xl">
                      {chatter.title}
                    </h2>
                    <p className="mt-2 line-clamp-4 text-[10px] font-medium leading-relaxed text-slate-600 dark:text-slate-300 md:mt-4 md:line-clamp-5 md:text-sm">
                      {chatter.description}
                    </p>
                    {chatter.tags.length > 0 && (
                      <ul
                        className="mt-3 flex flex-wrap gap-1 md:mt-6 md:gap-2"
                        aria-label={chatter.title + "标签"}
                      >
                        {chatter.tags.slice(0, 4).map((tag) => (
                          <li
                            key={tag}
                            className="rounded-md border border-slate-500/10 bg-slate-500/5 px-1.5 py-0.5 text-[8px] font-black text-slate-500 transition-colors group-hover:text-indigo-500 dark:border-white/5 dark:bg-white/5 dark:text-slate-400 md:px-2.5 md:py-1 md:text-[9px]"
                          >
                            #{tag}
                          </li>
                        ))}
                      </ul>
                    )}
                  </div>
                </Link>
              </motion.article>
            ))}
          </AnimatePresence>
        </motion.div>
      ) : (
        <div className="rounded-3xl border border-dashed border-white/60 bg-white/35 p-10 text-center text-sm font-medium text-slate-500 backdrop-blur-xl dark:border-white/10 dark:bg-slate-900/35 dark:text-slate-400">
          没有找到符合当前搜索和标签的杂谈。
        </div>
      )}
    </div>
  )
}
