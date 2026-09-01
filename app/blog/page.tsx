import type { Metadata } from "next"

import NoteCollectionPage from "@/components/notes/NoteCollectionPage"
import { getSectionNotes } from "@/lib/notes/server"
import { siteConfig } from "@/siteConfig"

export const metadata: Metadata = {
  title: `博客 | ${siteConfig.title}`,
  description: "数学、拓扑数据分析、编程与长期研究笔记。",
}

export default async function BlogPage() {
  const notes = await getSectionNotes("blog")
  return (
    <NoteCollectionPage
      section="blog"
      title="博客"
      description="以笔记为主体的知识库：数学、拓扑数据分析、编程与长期研究记录。"
      notes={notes}
    />
  )
}
