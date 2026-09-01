import type { Metadata } from "next"
import { notFound, redirect } from "next/navigation"

import { getSectionNotes } from "@/lib/notes/server"
import { siteConfig } from "@/siteConfig"

export const metadata: Metadata = {
  title: `博客 | ${siteConfig.title}`,
  description: "数学、拓扑数据分析、编程与长期研究笔记。",
}

export default async function BlogPage() {
  const notes = await getSectionNotes("blog")
  const firstNote = notes[0]
  if (!firstNote) notFound()
  redirect(encodeURI(firstNote.route))
}
