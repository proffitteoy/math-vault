import assert from "node:assert/strict"
import { describe, it } from "node:test"
import type { Root } from "hast"

import { getNoteDescription, getNoteRoute, getNoteSection } from "./nextContent"

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

describe("Next content artifact descriptions", () => {
  it("automatically uses only the first meaningful content block", () => {
    const tree: Root = {
      type: "root",
      children: [
        {
          type: "element",
          tagName: "h1",
          properties: {},
          children: [{ type: "text", value: "重复标题" }],
        },
        {
          type: "element",
          tagName: "blockquote",
          properties: {},
          children: [{ type: "text", value: "定理：如果 f ≥ 0，并且是可积的。" }],
        },
        {
          type: "element",
          tagName: "p",
          properties: {},
          children: [{ type: "text", value: "这段后续正文不应出现在摘要里。" }],
        },
      ],
    }

    assert.equal(getNoteDescription(tree), "定理：如果 f ≥ 0，并且是可积的。")
  })

  it("limits a long opening block without requiring frontmatter", () => {
    const tree: Root = {
      type: "root",
      children: [
        {
          type: "element",
          tagName: "p",
          properties: {},
          children: [{ type: "text", value: "开头内容".repeat(50) }],
        },
      ],
    }

    const description = getNoteDescription(tree)
    assert.ok(description.endsWith("…"))
    assert.ok(description.length <= 161)
  })
})
