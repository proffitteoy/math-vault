import assert from "node:assert"
import { describe, test } from "node:test"
import { Element } from "hast"
import rehypeSlug from "rehype-slug"
import { unified } from "unified"
import { attachBlockReference } from "./blockReferences"

describe("Obsidian block references", () => {
  test("preserves a heading slug while adding a block anchor", async () => {
    const heading: Element = {
      type: "element",
      tagName: "h3",
      properties: {},
      children: [{ type: "text", value: "1. 群上的第一同构定理" }],
    }
    const tree = { type: "root" as const, children: [heading] }

    attachBlockReference(heading, "14f179")
    await unified().use(rehypeSlug).run(tree)

    assert.strictEqual(heading.properties.id, "1-群上的第一同构定理")
    assert.deepStrictEqual(heading.children[0], {
      type: "element",
      tagName: "span",
      properties: {
        id: "14f179",
        ariaHidden: "true",
      },
      children: [],
    })
  })

  test("keeps block references on non-heading elements unchanged", () => {
    const paragraph: Element = {
      type: "element",
      tagName: "p",
      properties: {},
      children: [{ type: "text", value: "正文" }],
    }

    attachBlockReference(paragraph, "d22522")

    assert.strictEqual(paragraph.properties.id, "d22522")
    assert.strictEqual(paragraph.children.length, 1)
  })
})
