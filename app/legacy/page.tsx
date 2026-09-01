import Navbar from "../../components/Navbar"
import PageTransition from "../../components/PageTransition"
import QuartzFrame from "../../components/QuartzFrame"
import { siteConfig } from "@/siteConfig"

export const metadata = {
  title: "旧版笔记 | " + siteConfig.title,
  description: "原有笔记文章",
}

export default function LegacyBlogPage() {
  return (
    <div className="h-screen relative overflow-hidden">
      <Navbar />
      <PageTransition>
        <QuartzFrame src="/blog/index.html" title="Quartz 旧版笔记" />
      </PageTransition>
    </div>
  )
}
