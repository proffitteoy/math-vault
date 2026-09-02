import type { ValidLocale } from "./i18n"
import type { PluginTypes } from "./plugins/types"
import type { Theme } from "./util/theme"

export type ValidDateType = "created" | "modified" | "published"

export type Analytics =
  | null
  | { provider: "plausible"; host?: string }
  | { provider: "google"; tagId: string }
  | { provider: "umami"; websiteId: string; host?: string }
  | { provider: "goatcounter"; websiteId: string; host?: string; scriptSrc?: string }
  | { provider: "posthog"; apiKey: string; host?: string }
  | { provider: "tinylytics"; siteId: string }
  | { provider: "cabin"; host?: string }
  | { provider: "clarity"; projectId?: string }
  | { provider: "matomo"; host: string; siteId: string }
  | { provider: "vercel" }
  | { provider: "rybbit"; siteId: string; host?: string }

export interface GlobalConfiguration {
  pageTitle: string
  pageTitleSuffix?: string
  enableSPA: boolean
  enablePopovers: boolean
  analytics: Analytics
  ignorePatterns: string[]
  defaultDateType: ValidDateType
  baseUrl?: string
  theme: Theme
  locale: ValidLocale
}

export interface QuartzConfig {
  configuration: GlobalConfiguration
  plugins: PluginTypes
}
