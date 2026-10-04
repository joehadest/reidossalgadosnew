import assert from "node:assert/strict"
import { test } from "node:test"
import { filterMenu, menuPrice, parseMenuPrice, validMenuImage } from "../lib/admin-menu"
import { menuCreateSchema, menuUpdateSchema } from "../lib/menu-validation"
import type { MenuItem } from "../lib/store-data"

const categories = [
  { id: "salgados", name: "Salgados", icon: "" },
  { id: "bebidas", name: "Bebidas", icon: "" },
]
const coxinha: MenuItem = {
  id: "a",
  name: "Coxinha",
  description: "Recheio crocante",
  category: "salgados",
  image: "",
  price: 2,
  variants: [
    { id: "v1", name: "Frango com requeijão", price: 6, available: true },
    { id: "v2", name: "Carne", price: 2, available: false },
  ],
}
const items: MenuItem[] = [
  coxinha,
  {
    id: "b",
    name: "Água",
    description: "Gelada",
    category: "bebidas",
    image: "",
    price: 3,
    available: false,
  },
  { id: "c", name: "Suco", description: "Laranja", category: "bebidas", image: "", price: 4 },
]

test("search ignores accents and finds category, description and variant names", () => {
  for (const query of ["REQUEIJAO", "crocan", "salgados frango", "  coxinha  frango "])
    assert.deepEqual(
      filterMenu(items, categories, query, "", "all", "name").map((item) => item.id),
      ["a"],
    )
  assert.equal(filterMenu(items, categories, "nao existe", "", "all", "name").length, 0)
})
test("combines filters and honors legacy items with omitted availability", () => {
  assert.deepEqual(
    filterMenu(items, categories, "", "bebidas", "active", "name").map((item) => item.id),
    ["c"],
  )
  assert.deepEqual(
    filterMenu(items, categories, "agua", "", "paused", "name").map((item) => item.id),
    ["b"],
  )
})
test("sorts by the purchasable variant price and never mutates the source list", () => {
  assert.equal(menuPrice(coxinha), 6)
  assert.deepEqual(
    filterMenu(items, categories, "", "", "all", "price").map((item) => item.id),
    ["b", "c", "a"],
  )
  assert.deepEqual(
    filterMenu(items, categories, "", "", "all", "price-desc").map((item) => item.id),
    ["a", "c", "b"],
  )
  assert.deepEqual(
    items.map((item) => item.id),
    ["a", "b", "c"],
  )
  assert.equal(
    menuPrice({
      ...coxinha,
      variants: coxinha.variants?.map((variant) => ({ ...variant, available: false })),
    }),
    2,
  )
})
test("price entry supports decimal comma and dot without silently rounding invalid input", () => {
  for (const [text, expected] of [
    [" 5,50 ", 5.5],
    ["10.9", 10.9],
    ["0", 0],
    ["0,00", 0],
  ] as const)
    assert.equal(parseMenuPrice(text), expected)
  for (const value of ["", "1,234", "1.000,00", "-1", "abc", "Infinity", "5.", "1e4"])
    assert.equal(parseMenuPrice(value), null)
})
test("image sources allow store paths and HTTP photos, rejecting invalid schemes", () => {
  for (const image of ["", "/images/test.jpg", "https://example.com/photo.jpg"])
    assert.equal(validMenuImage(image), true)
  for (const image of ["invalid", "//example.com/photo", "javascript:alert(1)", "data:text/html,test"])
    assert.equal(validMenuImage(image), false)
})
test("validates required fields, nonnegative finite prices and option data on the server", () => {
  assert.equal(menuCreateSchema.safeParse({ ...coxinha, available: false }).success, true)
  for (const changed of [
    { name: "   " },
    { description: "" },
    { price: -1 },
    { price: NaN },
    { price: 1.234 },
    { category: "" },
    { variants: [{ name: "", price: 5 }] },
    { variants: [{ name: "Frango", price: -1 }] },
    { available: "false" },
  ])
    assert.equal(menuCreateSchema.safeParse({ ...coxinha, ...changed }).success, false)
  assert.equal(menuUpdateSchema.safeParse({ available: false }).success, true)
  assert.equal(
    menuCreateSchema.safeParse({
      ...coxinha,
      variants: [
        { id: "same", name: "A", price: 2 },
        { id: "same", name: "B", price: 3 },
      ],
    }).success,
    false,
  )
})
