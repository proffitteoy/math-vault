export function normalizeAnimeRating(rate: number | undefined) {
  return typeof rate === "number" && rate >= 1 && rate <= 10 ? rate : null
}

export function sortAnimeByRating<T extends { rating: number | null }>(items: readonly T[]) {
  return items
    .map((item, index) => ({ item, index }))
    .sort((left, right) => {
      const ratingDifference = (right.item.rating ?? -1) - (left.item.rating ?? -1)
      return ratingDifference || left.index - right.index
    })
    .map(({ item }) => item)
}

export function groupAnimeByRating<T extends { rating: number | null }>(items: readonly T[]) {
  const groups = new Map<number | null, T[]>()

  for (const item of items) {
    const group = groups.get(item.rating)
    if (group) {
      group.push(item)
    } else {
      groups.set(item.rating, [item])
    }
  }

  return [...Array.from({ length: 10 }, (_, index) => 10 - index), null]
    .map((rating) => ({ rating, items: groups.get(rating) ?? [] }))
    .filter((group) => group.items.length > 0)
}

export function mergeAnimeEntries<T extends { id: number }>(
  current: readonly T[],
  incoming: readonly T[],
) {
  const existingIds = new Set(current.map((anime) => anime.id))
  const merged = [...current]

  for (const anime of incoming) {
    if (existingIds.has(anime.id)) continue
    existingIds.add(anime.id)
    merged.push(anime)
  }

  return merged
}
