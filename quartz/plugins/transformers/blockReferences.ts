import { Element } from "hast"

const headingTagRegex = /^h[1-6]$/

export function attachBlockReference(element: Element, block: string) {
  if (headingTagRegex.test(element.tagName)) {
    element.children.unshift({
      type: "element",
      tagName: "span",
      properties: {
        id: block,
        ariaHidden: "true",
      },
      children: [],
    })
    return
  }

  element.properties = {
    ...element.properties,
    id: block,
  }
}
