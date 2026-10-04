import assert from "node:assert/strict"
import { test } from "node:test"
import { NextRequest } from "next/server"
import type { PrismaClient } from "@prisma/client"
import { menuHandlers } from "../lib/menu-handlers"

// All persistence is replaced before invoking a handler; these tests never write to the store.
function loadApi() {
  const prisma = {
    menuItem: {
      create: async () => {
        throw new Error("Unexpected persistence call")
      },
    },
    $transaction: async () => {
      throw new Error("Unexpected transaction")
    },
  } as unknown as PrismaClient
  return { prisma, ...menuHandlers(prisma) }
}
const request = (method: string, body: unknown) =>
  new NextRequest("http://localhost/api/menu/test", {
    method,
    body: JSON.stringify(body),
    headers: { "Content-Type": "application/json" },
  })
const body = {
  name: "Produto",
  description: "Descrição",
  price: 5,
  image: "",
  category: "salgados",
  available: false,
  variants: [{ name: "Frango", price: 5, available: true }],
}

test("creation persists paused status and options together and rejects invalid prices before persistence", async (context) => {
  const { prisma, POST } = await loadApi()
  let captured: any
  const create = context.mock.method(prisma.menuItem, "create", async (args: any) => {
    captured = args
    return {
      ...args.data,
      id: "created",
      categoryId: "salgados",
      variants: args.data.variants.create.map((variant: any) => ({ ...variant, id: "new-option" })),
    }
  })
  const response = await POST(request("POST", body))
  assert.equal(response.status, 201)
  const created = await response.json()
  assert.equal(created.available, false)
  assert.equal(created.variants[0].id, "new-option")
  assert.equal(captured.data.available, false)
  assert.equal(captured.data.variants.create.length, 1)
  assert.equal(create.mock.callCount(), 1)
  assert.equal((await POST(request("POST", { ...body, price: -1 }))).status, 400)
  assert.equal(create.mock.callCount(), 1)
})

test("editing retains existing option identities and rejects options belonging to other products", async (context) => {
  const { prisma, PATCH } = await loadApi()
  let updates = 0
  let captured: any
  context.mock.method(prisma, "$transaction", async (callback: any) =>
    callback({
      menuItem: {
        findUnique: async () => ({ variants: [{ id: "existing" }, { id: "removed" }] }),
        update: async (args: any) => {
          updates++
          captured = args.data
          return {
            id: "test",
            ...body,
            categoryId: "salgados",
            variants: [
              { id: "existing", name: "Frango", price: 6, available: true },
              { id: "generated", name: "Carne", price: 7, available: false },
            ],
          }
        },
      },
    }),
  )
  const params = { params: Promise.resolve({ id: "test" }) }
  const response = await PATCH(
    request("PATCH", {
      ...body,
      variants: [
        { id: "existing", name: "Frango", price: 6, available: true },
        { id: "", name: "Carne", price: 7, available: false },
      ],
    }),
    params,
  )
  assert.equal(response.status, 200)
  assert.equal((await response.json()).variants[0].id, "existing")
  assert.deepEqual(captured.variants.deleteMany.id.notIn, ["existing"])
  assert.equal(captured.variants.update[0].where.id, "existing")
  assert.equal(captured.variants.create[0].name, "Carne")
  assert.equal(captured.price, 6)
  assert.equal(updates, 1)
  const invalid = await PATCH(
    request("PATCH", { variants: [{ id: "other-product-option", name: "Outro", price: 5 }] }),
    params,
  )
  assert.equal(invalid.status, 400)
  assert.equal(updates, 1)
})
