import { Translation, CalloutTranslation } from "./locales/definition"
import zh from "./locales/zh-CN"

export const TRANSLATIONS = {
  "zh-CN": zh,
} as const

export const defaultTranslation = "zh-CN"
export const i18n = (locale: ValidLocale): Translation => TRANSLATIONS[locale ?? defaultTranslation]
export type ValidLocale = keyof typeof TRANSLATIONS
export type ValidCallout = keyof CalloutTranslation
