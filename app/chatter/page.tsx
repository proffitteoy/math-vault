import type { Metadata } from "next"

import ChatterBoard from "@/components/ChatterBoard"
import Navbar from "@/components/Navbar"
import PageTransition from "@/components/PageTransition"
import { getSectionNotes } from "@/lib/notes/server"
import { siteConfig } from "@/siteConfig"

export const metadata: Metadata = {
  title: `杂谈 | ${siteConfig.title}`,
  description: "零散想法、开发记录与日常观察。",
}

export default async function ChatterPage() {
  const notes = await getSectionNotes("chatter")
  const chatters = notes.map((note) => ({
    route: note.route,
    title: note.title,
    description: note.description || note.text.slice(0, 180),
    searchText: note.text,
    date: note.dates.modified ?? note.dates.created ?? note.dates.published,
    tags: note.tags,
    cover: note.cover,
  }))

  return (
    <div className="relative min-h-screen pb-10">
      <Navbar />
      <PageTransition>
        <ChatterBoard chatters={chatters} />
      </PageTransition>
    </div>
  )
}
