import "katex/dist/katex.min.css"
import type { Metadata } from "next"
import "./globals.css"
import { ThemeProvider } from "../components/ThemeProvider"
import BackgroundEffects from "../components/BackgroundEffects"
import { MusicProvider } from "../components/MusicProvider"
import FloatingPlayer from "../components/FloatingPlayer"
import { siteConfig } from "../siteConfig"
import ClickEffect from "../components/ClickEffect"
import BackgroundSlider from "../components/BackgroundSlider"
import SplashScreen from "../components/SplashScreen"
import DanmakuBackground from "../components/DanmakuBackground"

import MobileBackButton from "../components/MobileBackButton"

export const metadata: Metadata = {
  title: siteConfig.title,
  description: siteConfig.bio,
  icons: {
    icon: siteConfig.faviconUrl,
    apple: siteConfig.faviconUrl,
  },
}

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="zh-CN" className="h-full antialiased" suppressHydrationWarning>
      <head>
        <style
          suppressHydrationWarning
          dangerouslySetInnerHTML={{
            __html: `
              #app-mount-root { opacity: 0; visibility: hidden; pointer-events: none; }
              html.splash-seen #app-mount-root { opacity: 1 !important; visibility: visible !important; pointer-events: auto !important; }
            `,
          }}
        />
        <script
          suppressHydrationWarning
          dangerouslySetInnerHTML={{
            __html: `
              try {
                if (sessionStorage.getItem('hasSeenSplash') === 'true') {
                  document.documentElement.classList.add('splash-seen');
                }
              } catch (e) {}
            `,
          }}
        />
        <script
          suppressHydrationWarning
          dangerouslySetInnerHTML={{
            __html: `
              try {
                var themeNow = new Date();
                var savedTheme = localStorage.getItem('blog-theme');
                var overrideUntil = Number(localStorage.getItem('blog-theme-override-until'));
                var scheduledDark = themeNow.getHours() >= 18 || themeNow.getHours() < 6;
                var hasThemeOverride = (savedTheme === 'dark' || savedTheme === 'light') && overrideUntil > themeNow.getTime();
                if (hasThemeOverride ? savedTheme === 'dark' : scheduledDark) {
                  document.documentElement.classList.add('dark');
                }
              } catch (e) {}
            `,
          }}
        />
      </head>

      <body className="w-screen overflow-x-hidden min-h-full flex flex-col relative transition-colors duration-1000 bg-slate-50 dark:bg-slate-950 font-serif">
        <ThemeProvider>
          <SplashScreen />

          <MusicProvider>
            <div
              id="app-mount-root"
              className="flex-1 flex flex-col transition-opacity duration-1000"
            >
              <div className="pointer-events-none fixed inset-0 z-0 overflow-hidden">
                {!siteConfig.useGradient && <BackgroundSlider />}
                <div className="absolute inset-0 z-[1] bg-white/[0.12] backdrop-blur-[1.5px] transition-colors duration-1000 dark:bg-slate-950/25"></div>

                <div
                  className="absolute inset-0 z-[2] transform-gpu opacity-25 mix-blend-soft-light transition-opacity duration-1000 dark:opacity-10"
                  style={{
                    background: `linear-gradient(-45deg, ${siteConfig.themeColors.join(", ")})`,
                    backgroundSize: "400% 400%",
                    animation: "gradientMove 15s ease infinite", // 🌟 全端保留渐变流动
                  }}
                ></div>

                {/* 👇 🌟 优化：手机端去掉了 mix-blend-overlay，但保留了 blur 模糊光晕，确保视觉不打折 */}
                <div className="absolute left-[-10%] top-[-10%] z-[3] h-[40%] w-[40%] rounded-full bg-white/25 blur-[100px] dark:bg-indigo-900/15 md:mix-blend-overlay"></div>
                <div className="absolute bottom-[-10%] right-[-10%] z-[3] h-[40%] w-[40%] rounded-full bg-indigo-400/20 blur-[100px] dark:bg-purple-900/20 md:mix-blend-overlay"></div>

                {/* 隐藏手机端高负载粒子特效 */}
                <div className="absolute inset-0 z-[4] hidden h-full w-full md:block">
                  <BackgroundEffects />
                </div>
              </div>

              {/* 隐藏手机端弹幕 */}
              <div className="hidden md:block">
                <DanmakuBackground />
              </div>

              <div className="relative z-10 flex-1 flex flex-col">{children}</div>

              <div className="hidden md:block">
                <FloatingPlayer />
              </div>

              <div className="md:hidden block">
                <MobileBackButton />
              </div>

              {/* 隐藏手机端点击粒子 */}
              <div className="hidden md:block">
                <ClickEffect />
              </div>
            </div>

            <style
              suppressHydrationWarning
              dangerouslySetInnerHTML={{
                __html: `
              @keyframes gradientMove { 
                0% { background-position: 0% 50%; } 
                50% { background-position: 100% 50%; } 
                100% { background-position: 0% 50%; } 
              }
            `,
              }}
            />
          </MusicProvider>
        </ThemeProvider>
      </body>
    </html>
  )
}
