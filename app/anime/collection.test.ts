import assert from "node:assert"
import { describe, test } from "node:test"
import {
  groupAnimeByRating,
  mergeAnimeEntries,
  normalizeAnimeRating,
  sortAnimeByRating,
} from "./collection"

type Fixture = {
  id: number
  rating: number | null
}

describe("anime collection helpers", () => {
  test("normalizes zero and invalid ratings as unrated", () => {
    assert.strictEqual(normalizeAnimeRating(10), 10)
    assert.strictEqual(normalizeAnimeRating(1), 1)
    assert.strictEqual(normalizeAnimeRating(0), null)
    assert.strictEqual(normalizeAnimeRating(11), null)
    assert.strictEqual(normalizeAnimeRating(undefined), null)
  })

  test("sorts ratings from high to low while preserving equal-score order", () => {
    const fixtures: Fixture[] = [
      { id: 1, rating: 8 },
      { id: 2, rating: null },
      { id: 3, rating: 10 },
      { id: 4, rating: 8 },
    ]

    assert.deepStrictEqual(
      sortAnimeByRating(fixtures).map((anime) => anime.id),
      [3, 1, 4, 2],
    )
  })

  test("groups exact scores in descending order and puts unrated last", () => {
    const fixtures: Fixture[] = [
      { id: 1, rating: 7 },
      { id: 2, rating: null },
      { id: 3, rating: 10 },
      { id: 4, rating: 7 },
    ]

    assert.deepStrictEqual(
      groupAnimeByRating(fixtures).map((group) => ({
        rating: group.rating,
        ids: group.items.map((anime) => anime.id),
      })),
      [
        { rating: 10, ids: [3] },
        { rating: 7, ids: [1, 4] },
        { rating: null, ids: [2] },
      ],
    )
  })

  test("merges pages without duplicating existing subjects", () => {
    const firstPage: Fixture[] = [
      { id: 1, rating: 10 },
      { id: 2, rating: 9 },
    ]
    const nextPage: Fixture[] = [
      { id: 2, rating: 9 },
      { id: 3, rating: 8 },
      { id: 3, rating: 8 },
    ]

    assert.deepStrictEqual(
      mergeAnimeEntries(firstPage, nextPage).map((anime) => anime.id),
      [1, 2, 3],
    )
  })
})
