import assert from "node:assert/strict"
import { test } from "node:test"
import { NextRequest } from "next/server"
import type { PrismaClient } from "@prisma/client"
import { categoryHandlers } from "../lib/category-handlers"
import { categorySchema, normalizeCategoryName } from "../lib/category-validation"

const initial = [
  { id: "savory", name: "Salgados", icon: "flame", sortOrder: 0 },
  { id: "sweet", name: "Sobremesas", icon: "cookie", sortOrder: 1 },
]
const request = (method: string, body?: unknown) =>
  new NextRequest("http://localhost/api/categories/test", {
    method,
    ...(body !== undefined ? { body: JSON.stringify(body) } : {}),
    headers: { "Content-Type": "application/json" },
  })
const params = (id: string) => ({ params: Promise.resolve({ id }) })

// Isolated persistence: no credentials, database connection or store data are used by these tests.
function setup(productCount = 0, current = initial) {
  let records = current.map((cat) => ({ ...cat }))
  const calls: string[] = []
  const tx = {
    $executeRaw: async () => {
      calls.push("lock-list")
      return 1
    },
    $queryRaw: async (_query: unknown, id: string) => {
      calls.push("lock-row")
      return records.filter((cat) => cat.id === id).map(({ id }) => ({ id }))
    },
    category: {
      findMany: async () =>
        [...records].sort((a, b) => a.sortOrder - b.sortOrder || a.id.localeCompare(b.id)),
      findUnique: async ({ where }: any) => {
        calls.push("count-products")
        return records.some((cat) => cat.id === where.id) ? { _count: { menuItems: productCount } } : null
      },
      create: async ({ data }: any) => {
        calls.push("create")
        records.push(data)
        return data
      },
      update: async ({ where, data }: any) => {
        calls.push("update")
        records = records.map((cat) => (cat.id === where.id ? { ...cat, ...data } : cat))
        return records.find((cat) => cat.id === where.id)
      },
      delete: async ({ where }: any) => {
        calls.push("delete")
        records = records.filter((cat) => cat.id !== where.id)
      },
    },
  }
  const prisma = {
    $transaction: async (callback: any) => {
      const snapshot = records.map((cat) => ({ ...cat }))
      try {
        return await callback(tx)
      } catch (error) {
        records = snapshot
        throw error
      }
    },
  } as unknown as PrismaClient
  return { ...categoryHandlers(prisma), calls, records: () => records }
}

test("category names normalize accents, case and repeated spaces; fields validate allowed icons", () => {
  assert.equal(normalizeCategoryName("  PORÇÕES   Especiais "), "porcoes especiais")
  assert.equal(categorySchema.safeParse({ name: " ", icon: "flame" }).success, false)
  assert.equal(categorySchema.safeParse({ name: "A".repeat(61), icon: "flame" }).success, false)
  assert.equal(categorySchema.safeParse({ name: "Porções", icon: "unknown" }).success, false)
  assert.equal(categorySchema.parse({ name: "  Porções  ", icon: "package" }).name, "Porções")
})

test("creation trims the name, appends to the order and prevents duplicate normalized names", async () => {
  const api = setup()
  const response = await api.POST(request("POST", { id: "drinks", name: " Bebidas ", icon: "cup-soda" }))
  assert.equal(response.status, 201)
  assert.equal((await response.json()).sortOrder, 2)
  assert.equal(api.records()[2].name, "Bebidas")
  const duplicate = await api.POST(request("POST", { id: "different", name: " SALGÁDOS ", icon: "flame" }))
  assert.equal(duplicate.status, 409)
  assert.equal(api.records().length, 3)
  assert.equal(api.calls.filter((call) => call === "create").length, 1)
})

test("invalid creation and malformed JSON are rejected before persistence", async () => {
  const api = setup()
  assert.equal((await api.POST(request("POST", { id: "test", name: "", icon: "flame" }))).status, 400)
  assert.equal(
    (await api.POST(new NextRequest("http://localhost/api/categories", { method: "POST", body: "{" })))
      .status,
    400,
  )
  assert.deepEqual(api.calls, [])
})

test("renaming retains the category identity and order; rejects duplicate names and direct order edits", async () => {
  const api = setup()
  const response = await api.PATCH(request("PATCH", { name: " Doces ", icon: "cookie" }), params("sweet"))
  assert.equal(response.status, 200)
  assert.deepEqual(await response.json(), { id: "sweet", name: "Doces", icon: "cookie", sortOrder: 1 })
  assert.equal((await api.PATCH(request("PATCH", { name: "salgados" }), params("sweet"))).status, 409)
  assert.equal((await api.PATCH(request("PATCH", { sortOrder: -1 }), params("sweet"))).status, 400)
  assert.equal((await api.PATCH(request("PATCH", {}), params("sweet"))).status, 400)
  assert.equal((await api.PATCH(request("PATCH", { name: "Bebidas" }), params("missing"))).status, 404)
  assert.equal(api.calls.filter((call) => call === "update").length, 1)
})

test("nonempty categories cannot be deleted; the parent row is locked before checking products", async () => {
  const api = setup(3)
  const response = await api.DELETE(request("DELETE"), params("savory"))
  assert.equal(response.status, 409)
  assert.match((await response.json()).error, /Mova os produtos/)
  assert.deepEqual(api.calls, ["lock-list", "lock-row", "count-products"])
  assert.equal(api.records().length, 2)
})

test("only empty existing categories are deleted", async () => {
  const api = setup()
  assert.equal((await api.DELETE(request("DELETE"), params("missing"))).status, 404)
  assert.equal((await api.DELETE(request("DELETE"), params("sweet"))).status, 200)
  assert.deepEqual(
    api.records().map((cat) => cat.id),
    ["savory"],
  )
  assert.deepEqual(api.calls.slice(-4), ["lock-list", "lock-row", "count-products", "delete"])
})

test("reordering requires an exact permutation and detects changes from another session", async () => {
  const api = setup()
  for (const ids of [["savory", "savory"], ["sweet"], ["savory", "missing"], ["savory", 123], []]) {
    const response = await api.REORDER(request("PATCH", { ids }))
    assert.ok(response.status === 400 || response.status === 409)
  }
  assert.equal(
    (await api.REORDER(request("PATCH", { ids: ["sweet", "savory"], previousIds: ["sweet", "savory"] })))
      .status,
    409,
  )
  assert.equal(api.calls.includes("update"), false)
  assert.deepEqual(api.records(), initial)
})

test("reordering returns the complete canonical sequence with contiguous positions", async () => {
  const api = setup()
  const response = await api.REORDER(
    request("PATCH", { ids: ["sweet", "savory"], previousIds: ["savory", "sweet"] }),
  )
  assert.equal(response.status, 200)
  const data = await response.json()
  assert.deepEqual(
    data.categories.map((cat: any) => [cat.id, cat.sortOrder]),
    [
      ["sweet", 0],
      ["savory", 1],
    ],
  )
  assert.equal(api.calls[0], "lock-list")
  assert.equal(api.calls.filter((call) => call === "update").length, 2)
})
