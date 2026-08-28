import "server-only"
import { unstable_cache } from "next/cache"
import { mergeAnimeEntries, normalizeAnimeRating, sortAnimeByRating } from "./collection"

const BANGUMI_API_BASE = "https://api.bgm.tv/v0"
const BANGUMI_PAGE_SIZE = 50
const CACHE_SECONDS = 30 * 60
export const ANIME_PAGE_SIZE = 24

export type AnimeShelfStatus = "watching" | "watched"

type BangumiImages = {
  large?: string
  common?: string
  medium?: string
  small?: string
  grid?: string
}

type BangumiSubject = {
  id: number
  name: string
  name_cn: string
  images?: BangumiImages
}

type BangumiCollection = {
  subject_id: number
  rate?: number
  subject?: BangumiSubject
}

type BangumiCollectionPage = {
  total: number
  limit: number
  offset: number
  data: BangumiCollection[]
}

type BangumiUser = {
  username: string
}

export type AnimeEntry = {
  id: number
  title: string
  cover: string | null
  rating: number | null
}

export type AnimeCollectionSlice = {
  items: AnimeEntry[]
  total: number
  nextOffset: number
}

export type AnimeShelfState =
  | {
      status: "ready"
      username: string
      watching: AnimeCollectionSlice
      watched: AnimeCollectionSlice
    }
  | {
      status: "error"
      reason: "missing-token" | "request-failed"
    }

class MissingBangumiTokenError extends Error {}

function getToken() {
  const token = process.env.BANGUMI_ACCESS_TOKEN?.trim()
  if (!token) throw new MissingBangumiTokenError("BANGUMI_ACCESS_TOKEN is missing")
  return token
}

async function bangumiFetch<T>(path: string, token: string): Promise<T> {
  const response = await fetch(`${BANGUMI_API_BASE}${path}`, {
    headers: {
      Accept: "application/json",
      Authorization: `Bearer ${token}`,
      "User-Agent": "nothing-new.icu/1.0 (https://nothing-new.icu)",
    },
    next: {
      revalidate: CACHE_SECONDS,
      tags: ["bangumi-anime-api"],
    },
  })

  if (!response.ok) {
    throw new Error(`Bangumi API request failed with status ${response.status}`)
  }

  return (await response.json()) as T
}

function normalizeCover(images?: BangumiImages) {
  const cover = images?.large || images?.common || images?.medium || images?.grid
  return cover ? cover.replace(/^http:\/\//, "https://") : null
}

function toAnimeEntry(collection: BangumiCollection): AnimeEntry | null {
  const { subject } = collection
  if (!subject) return null

  const title = subject.name_cn.trim() || subject.name.trim()
  if (!title) return null

  return {
    id: subject.id || collection.subject_id,
    title,
    cover: normalizeCover(subject.images),
    rating: normalizeAnimeRating(collection.rate),
  }
}

function getCollectionType(status: AnimeShelfStatus): 2 | 3 {
  return status === "watching" ? 3 : 2
}

async function getUsername(token: string) {
  const user = await bangumiFetch<BangumiUser>("/me", token)
  return user.username
}

async function fetchAnimeCollectionPage(
  token: string,
  username: string,
  status: AnimeShelfStatus,
  offset = 0,
  limit = BANGUMI_PAGE_SIZE,
) {
  const params = new URLSearchParams({
    subject_type: "2",
    type: String(getCollectionType(status)),
    limit: String(limit),
    offset: String(offset),
  })
  return bangumiFetch<BangumiCollectionPage>(
    `/users/${encodeURIComponent(username)}/collections?${params}`,
    token,
  )
}

async function getFullAnimeCollection(token: string, username: string, status: AnimeShelfStatus) {
  const firstPage = await fetchAnimeCollectionPage(token, username, status)
  const remainingOffsets = Array.from(
    {
      length: Math.max(0, Math.ceil((firstPage.total - firstPage.data.length) / BANGUMI_PAGE_SIZE)),
    },
    (_, index) => BANGUMI_PAGE_SIZE * (index + 1),
  )
  const remainingPages = await Promise.all(
    remainingOffsets.map((offset) => fetchAnimeCollectionPage(token, username, status, offset)),
  )
  const entries = [firstPage, ...remainingPages]
    .flatMap((page) => page.data)
    .map(toAnimeEntry)
    .filter((entry): entry is AnimeEntry => entry !== null)

  const uniqueEntries = mergeAnimeEntries([], entries)
  return status === "watched" ? sortAnimeByRating(uniqueEntries) : uniqueEntries
}

async function loadFullShelf() {
  const token = getToken()
  const username = await getUsername(token)
  const [watching, watched] = await Promise.all([
    getFullAnimeCollection(token, username, "watching"),
    getFullAnimeCollection(token, username, "watched"),
  ])

  return { username, watching, watched }
}

const getCachedFullShelf = unstable_cache(loadFullShelf, ["bangumi-anime-full-shelf-v3"], {
  revalidate: CACHE_SECONDS,
  tags: ["bangumi-anime-full-shelf"],
})

export async function getAnimeCollectionPage(
  status: AnimeShelfStatus,
  offset = 0,
  limit = ANIME_PAGE_SIZE,
): Promise<AnimeCollectionSlice> {
  const shelf = await getCachedFullShelf()
  const items = shelf[status]
  const safeOffset = Math.max(0, Math.floor(offset))
  const safeLimit = Math.min(BANGUMI_PAGE_SIZE, Math.max(1, Math.floor(limit)))
  const nextOffset = Math.min(items.length, safeOffset + safeLimit)

  return {
    items: items.slice(safeOffset, nextOffset),
    total: items.length,
    nextOffset,
  }
}

async function loadFirstScreen() {
  const shelf = await getCachedFullShelf()
  const toFirstPage = (items: AnimeEntry[]): AnimeCollectionSlice => ({
    items: items.slice(0, ANIME_PAGE_SIZE),
    total: items.length,
    nextOffset: Math.min(items.length, ANIME_PAGE_SIZE),
  })

  return {
    status: "ready" as const,
    username: shelf.username,
    watching: toFirstPage(shelf.watching),
    watched: toFirstPage(shelf.watched),
  }
}

const getCachedFirstScreen = unstable_cache(loadFirstScreen, ["bangumi-anime-first-screen-v3"], {
  revalidate: CACHE_SECONDS,
  tags: ["bangumi-anime-first-screen"],
})

export async function getAnimeShelf(): Promise<AnimeShelfState> {
  try {
    return await getCachedFirstScreen()
  } catch (error) {
    if (error instanceof MissingBangumiTokenError) {
      return { status: "error", reason: "missing-token" }
    }

    console.error(
      "[Bangumi] failed to load anime collections:",
      error instanceof Error ? error.message : "unknown error",
    )
    return { status: "error", reason: "request-failed" }
  }
}
