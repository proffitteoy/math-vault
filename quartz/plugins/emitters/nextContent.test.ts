import assert from "node:assert/strict"
import { describe, it } from "node:test"

import { getNoteRoute, getNoteSection } from "./nextContent"

describe("Next content artifact routes", () => {
  it("maps ordinary notes to readable blog routes", () => {
    assert.equal(getNoteSection("数学/Fubini-Tonelli定理"), "blog")
    assert.equal(getNoteRoute("数学/Fubini-Tonelli定理"), "/blog/数学/Fubini-Tonelli定理")
  })

  it("removes the misc prefix from chatter routes", () => {
    assert.equal(getNoteSection("misc/随笔/九月"), "chatter")
    assert.equal(getNoteRoute("misc/随笔/九月"), "/chatter/随笔/九月")
    assert.equal(getNoteRoute("misc/index"), "/chatter")
  })

  it("keeps aliases in the target section when they have no misc prefix", () => {
    assert.equal(getNoteRoute("旧标题", "chatter"), "/chatter/旧标题")
  })
})
