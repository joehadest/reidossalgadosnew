import assert from "node:assert/strict"
import { test } from "node:test"
import { NextRequest } from "next/server"
import type { PrismaClient } from "@prisma/client"
import {
  counterAdd,
  counterAvailable,
  counterCash,
  counterLineId,
  counterOrderSchema,
  counterProducts,
  counterQuantity,
  counterTotal,
} from "../lib/counter"
import { counterHandlers } from "../lib/counter-handlers"
import type { MenuItem } from "../lib/store-data"

const product: MenuItem = {
  id: "coxinha",
  name: "Coxinha",
  description: "Crocante",
  category: "salgados",
  image: "",
  price: 4,
  available: true,
  variants: [
    { id: "frango", name: "Frango", price: 4, available: true },
    { id: "carne", name: "Carne", price: 5, available: true },
    { id: "queijo", name: "Queijo", price: 6, available: false },
  ],
}
const simple: MenuItem = { ...product, id: "torta", name: "Torta", variants: [] }
const categoryList = [{ id: "salgados", name: "Salgados", icon: "flame" }]

test("counter search ignores accents, searches active options and excludes paused products or all-paused variants", () => {
  const paused = { ...product, id: "paused", available: false }
  const noOptions = {
    ...product,
    id: "empty",
    variants: product.variants!.map((variant) => ({ ...variant, available: false })),
  }
  assert.equal(counterAvailable(noOptions), false)
  assert.deepEqual(
    counterProducts([product, paused, noOptions, simple], categoryList, " FRÁNGO  crocante ", ""),
    [product],
  )
  assert.deepEqual(counterProducts([product], categoryList, "queijo", ""), [])
  assert.deepEqual(counterProducts([product, simple], categoryList, "salgados", "salgados"), [
    product,
    simple,
  ])
  assert.deepEqual(counterProducts([product], categoryList, "", "other"), [])
})
test("cart keeps options separate, merges the same selection, respects quantity limits and does not mutate input", () => {
  const first = counterAdd([], product, product.variants![0])
  const second = counterAdd(first, product, product.variants![1])
  const third = counterAdd(second, product, product.variants![0])
  assert.equal(first[0].quantity, 1)
  assert.deepEqual(
    third.map(({ quantity, price }) => ({ quantity, price })),
    [
      { quantity: 2, price: 4 },
      { quantity: 1, price: 5 },
    ],
  )
  assert.equal(counterTotal(third), 13)
  assert.equal(counterQuantity(first, first[0].id, -1).length, 0)
  const max = [{ ...first[0], quantity: 99 }]
  assert.equal(counterAdd(max, product, product.variants![0]), max)
  assert.equal(counterQuantity(max, max[0].id, 1)[0].quantity, 99)
  assert.equal(counterAdd(first, product, product.variants![2]), first)
  assert.equal(counterAdd(first, product), first)
  assert.equal(counterAdd(first, { ...simple, available: false }), first)
  const full = Array.from({ length: 50 }, (_, index) => ({
    ...first[0],
    id: counterLineId(String(index)),
    itemId: String(index),
  }))
  assert.equal(counterAdd(full, simple), full)
  assert.notEqual(counterLineId("a-b", "c"), counterLineId("a", "b-c"))
})
test("money totals use cents; cash accepts decimal comma and rejects malformed amounts", () => {
  assert.equal(
    counterTotal([
      { price: 0.1, quantity: 3 },
      { price: 0.2, quantity: 1 },
    ]),
    0.5,
  )
  assert.equal(counterCash("10,50"), 10.5)
  assert.equal(counterCash("0"), 0)
  for (const value of ["", " ", "-1", "1,999", "1e2", "100001", "1.000,00"])
    assert.equal(counterCash(value), null)
})
const requestId = "52b0b428-4aa1-4f96-a8f0-51635a78d131"
const payload = {
  requestId,
  name: "",
  paymentMethod: "Dinheiro",
  changeFor: "10.00",
  items: [{ itemId: "coxinha", variantId: "frango", price: 4, quantity: 2 }],
}
function setup(options: { fail?: boolean; race?: boolean; missing?: boolean } = {}) {
  let orders: any[] = []
  let raceOrder: any = null
  let methods = ["Dinheiro", "PIX", "Cartao de Credito"]
  const products = [structuredClone(product), structuredClone(simple)]
  const createOrder = (data: any) => ({
    ...data,
    status: "recebido",
    createdAt: new Date("2026-10-04T13:00:00Z"),
    items: data.items.create.map((line: any, index: number) => ({ id: String(index), ...line })),
  })
  const tx = {
    order: {
      findUnique: async ({ where }: any) => orders.find((order) => order.id === where.id) ?? null,
      create: async ({ data }: any) => {
        const order = createOrder(data)
        if (options.race) {
          raceOrder = order
          throw Object.assign(new Error("UNIQUE_CONSTRAINT"), { code: "P2002" })
        }
        orders.push(order)
        if (options.fail) throw new Error("PRIVATE_DATABASE_ERROR")
        return order
      },
    },
    store: {
      findFirst: async () => (options.missing ? null : { paymentMethods: methods.map((name) => ({ name })) }),
    },
    menuItem: { findMany: async () => products },
  }
  const prisma = {
    order: {
      findUnique: async ({ where }: any) =>
        raceOrder?.id === where.id ? raceOrder : (orders.find((order) => order.id === where.id) ?? null),
    },
    $transaction: async (callback: any) => {
      const before = [...orders]
      try {
        return await callback(tx)
      } catch (error) {
        orders = before
        throw error
      }
    },
  } as unknown as PrismaClient
  const handlers = counterHandlers(prisma)
  return {
    handlers,
    products,
    read: () => orders,
    setMethods: (names: string[]) => {
      methods = names
    },
    request: (body: unknown = payload) =>
      handlers.POST(
        new NextRequest("http://localhost/api/orders/balcao", { method: "POST", body: JSON.stringify(body) }),
      ),
  }
}
test("counter registration stores authoritative names, prices, no delivery fee and a canonical change amount", async () => {
  const api = setup()
  const response = await api.request()
  assert.equal(response.status, 201)
  const order = await response.json()
  assert.equal(order.id, `balcao-${requestId}`)
  assert.equal(order.name, "Cliente")
  assert.equal(order.address, "Balcão")
  assert.equal(order.total, 8)
  assert.equal(order.subtotal, 8)
  assert.equal(order.deliveryFee, 0)
  assert.equal(order.changeFor, "10,00")
  assert.equal(order.items[0].name, "Coxinha")
  assert.equal(order.items[0].variantName, "Frango")
})
test("retry after a lost response returns the same order even if catalog or payment options have since changed", async () => {
  const api = setup()
  assert.equal((await api.request()).status, 201)
  api.products[0].available = false
  api.setMethods([])
  const replay = await api.request()
  assert.equal(replay.status, 200)
  assert.equal((await replay.json()).id, `balcao-${requestId}`)
  assert.equal(api.read().length, 1)
  assert.equal((await api.request({ ...payload, name: "Outro cliente" })).status, 409)
  assert.equal((await api.request({ ...payload, items: [{ ...payload.items[0], quantity: 3 }] })).status, 409)
})
test("concurrent duplicate requests resolve the unique order rather than creating a second record", async () => {
  const api = setup({ race: true })
  const response = await api.request()
  assert.equal(response.status, 200)
  assert.equal((await response.json()).id, `balcao-${requestId}`)
})
test("current availability, option ownership and changed prices are checked before order persistence", async () => {
  const changed = setup()
  changed.products[0].variants![0].price = 4.5
  const changedResponse = await changed.request()
  assert.equal(changedResponse.status, 409)
  assert.match((await changedResponse.json()).error, /preço/)
  assert.equal(changed.read().length, 0)
  for (const line of [
    { ...payload.items[0], variantId: "queijo" },
    { ...payload.items[0], variantId: "other-product-option" },
    { itemId: "coxinha", price: 4, quantity: 2 },
  ]) {
    const api = setup()
    assert.equal((await api.request({ ...payload, items: [line] })).status, 409)
    assert.equal(api.read().length, 0)
  }
  const paused = setup()
  paused.products[0].available = false
  assert.equal((await paused.request()).status, 409)
  const missing = setup()
  assert.equal(
    (await missing.request({ ...payload, items: [{ itemId: "missing", price: 4, quantity: 1 }] })).status,
    409,
  )
})
test("simple products work without options; unavailable payment methods and insufficient cash are rejected", async () => {
  const api = setup()
  assert.equal(
    (await api.request({ ...payload, changeFor: null, items: [{ itemId: "torta", price: 4, quantity: 1 }] }))
      .status,
    201,
  )
  const missingMethod = setup()
  missingMethod.setMethods(["PIX"])
  assert.equal((await missingMethod.request()).status, 409)
  const small = setup()
  assert.equal((await small.request({ ...payload, changeFor: "7,99" })).status, 400)
  assert.equal(small.read().length, 0)
  assert.equal((await small.request({ ...payload, changeFor: "8,00" })).status, 201)
})
test("invalid quantities, client totals, duplicate lines and malformed JSON fail before registration", async () => {
  for (const body of [
    { ...payload, total: 1 },
    { ...payload, requestId: "invalid" },
    { ...payload, items: [] },
    { ...payload, items: [payload.items[0], payload.items[0]] },
    { ...payload, items: [{ ...payload.items[0], quantity: 1.5 }] },
    { ...payload, items: [{ ...payload.items[0], quantity: 100 }] },
    { ...payload, items: [{ ...payload.items[0], price: -1 }] },
    { ...payload, name: "x".repeat(101) },
    { ...payload, paymentMethod: "PIX", changeFor: "10" },
  ]) {
    const api = setup()
    assert.equal((await api.request(body)).status, 400)
    assert.equal(api.read().length, 0)
  }
  assert.equal(counterOrderSchema.safeParse({ ...payload, changeFor: "1.001" }).success, false)
  assert.equal(
    (
      await setup().handlers.POST(
        new NextRequest("http://localhost/api/orders/balcao", { method: "POST", body: "{" }),
      )
    ).status,
    400,
  )
  assert.equal((await setup({ missing: true }).request()).status, 404)
})
test("database failures preserve the draft for retry and never expose internal database errors", async () => {
  const options = { fail: true }
  const api = setup(options)
  const original = console.error
  console.error = () => {}
  try {
    const response = await api.request()
    assert.equal(response.status, 500)
    assert.equal(JSON.stringify(await response.json()).includes("PRIVATE_DATABASE_ERROR"), false)
    assert.equal(api.read().length, 0)
    options.fail = false
    assert.equal((await api.request()).status, 201)
    assert.equal(api.read().length, 1)
  } finally {
    console.error = original
  }
})
