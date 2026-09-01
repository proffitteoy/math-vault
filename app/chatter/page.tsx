import type { Metadata } from "next"

import NoteCollectionPage from "@/components/notes/NoteCollectionPage"
import { getSectionNotes } from "@/lib/notes/server"
import { siteConfig } from "@/siteConfig"

export const metadata: Metadata = {
  title: `杂谈 | ${siteConfig.title}`,
  description: "零散想法、开发记录与日常观察。",
}

export default async function ChatterPage() {
  const notes = await getSectionNotes("chatter")
  return (
    <NoteCollectionPage
      section="chatter"
      title="杂谈"
      description="零散想法、开发记录与日常观察，保持笔记原本的上下文和增强渲染。"
      notes={notes}
    />
  )
}
