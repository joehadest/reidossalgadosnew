import assert from "node:assert/strict"
import { test } from "node:test"
import { NextRequest } from "next/server"
import type { PrismaClient } from "@prisma/client"
import { deliveryFeeHandlers } from "../lib/delivery-fee-handlers"
import {
  deliveryFeeSchema,
  filterDeliveryFees,
  normalizeNeighborhood,
  parseDeliveryFee,
} from "../lib/delivery-fees"
import { storeUpdateSchema } from "../lib/store-info-validation"

test("explicit zero is free; blank, negative, fractional cents and malformed amounts are invalid", () => {
  for (const value of ["0", "0,00", " 0.00 "]) assert.equal(parseDeliveryFee(value), 0)
  assert.equal(parseDeliveryFee("2,50"), 2.5)
  assert.equal(parseDeliveryFee("100000.00"), 100000)
  for (const value of ["", " ", "-1", "2,555", "1.000,00", "Infinity", "NaN", "1e2", "100000,01", "2x"])
    assert.equal(parseDeliveryFee(value), null)
  for (const fee of [-1, 1.001, Infinity, NaN, 100000.01])
    assert.equal(deliveryFeeSchema.safeParse({ neighborhood: "Centro", fee }).success, false)
  assert.equal(deliveryFeeSchema.safeParse({ neighborhood: "Centro", fee: 0.29 }).success, true)
})
test("names normalize whitespace and duplicates are rejected even through the bulk store endpoint", () => {
  assert.equal(normalizeNeighborhood("  JARDIM   América  "), "jardim america")
  assert.equal(
    deliveryFeeSchema.parse({ neighborhood: " Jardim   América ", fee: 0 }).neighborhood,
    "Jardim América",
  )
  assert.equal(
    storeUpdateSchema.safeParse({
      deliveryFees: [
        { neighborhood: "São José", fee: 2 },
        { neighborhood: " sao  jose ", fee: 3 },
      ],
    }).success,
    false,
  )
  assert.equal(
    storeUpdateSchema.safeParse({ deliveryFees: [{ neighborhood: "Centro", fee: 2.555 }] }).success,
    false,
  )
  assert.equal(deliveryFeeSchema.safeParse({ neighborhood: " ", fee: 0 }).success, false)
})
test("search is accent insensitive, filters distinguish free fees and sorting leaves source order intact", () => {
  const fees = [
    { neighborhood: "São José", fee: 5 },
    { neighborhood: "Centro", fee: 2 },
    { neighborhood: "Jardim América", fee: 0 },
  ]
  assert.deepEqual(filterDeliveryFees(fees, "  JOSE SAO ", "all", "name"), [fees[0]])
  assert.deepEqual(filterDeliveryFees(fees, "", "free", "name"), [fees[2]])
  assert.deepEqual(filterDeliveryFees(fees, "", "paid", "fee"), [fees[1], fees[0]])
  assert.deepEqual(filterDeliveryFees(fees, "", "all", "fee-desc"), [fees[0], fees[1], fees[2]])
  assert.equal(fees[0].neighborhood, "São José")
  assert.deepEqual(filterDeliveryFees([], "", "all", "name"), [])
})

function setup(
  options: { missing?: boolean; fail?: boolean; initial?: { neighborhood: string; fee: number }[] } = {},
) {
  let sequence = 0
  let fees = (
    options.initial ?? [
      { neighborhood: "Centro", fee: 2 },
      { neighborhood: "Tabatinga", fee: 5 },
    ]
  ).map((fee) => ({ id: String(++sequence), storeId: "store", ...fee }))
  const calls: string[] = []
  const tx = {
    store: { findFirst: async () => (options.missing ? null : { id: "store" }) },
    $queryRaw: async () => {
      calls.push("lock")
      return [{ id: "store" }]
    },
    deliveryFee: {
      findMany: async ({ select }: any) => {
        calls.push("read")
        return fees.map((fee) => (select ? { neighborhood: fee.neighborhood, fee: fee.fee } : { ...fee }))
      },
      create: async ({ data }: any) => {
        calls.push("create")
        fees.push({ id: String(++sequence), ...data })
        if (options.fail) throw new Error("PRIVATE_DATABASE_ERROR")
      },
      update: async ({ where, data }: any) => {
        calls.push("update")
        fees = fees.map((fee) => (fee.id === where.id ? { ...fee, ...data } : fee))
      },
      delete: async ({ where }: any) => {
        calls.push("delete")
        fees = fees.filter((fee) => fee.id !== where.id)
      },
    },
  }
  const prisma = {
    $transaction: async (callback: any) => {
      const before = fees.map((fee) => ({ ...fee }))
      try {
        return await callback(tx)
      } catch (error) {
        fees = before
        throw error
      }
    },
  } as unknown as PrismaClient
  const handlers = deliveryFeeHandlers(prisma)
  return {
    calls,
    read: () => fees.map(({ neighborhood, fee }) => ({ neighborhood, fee })),
    request: (method: keyof typeof handlers, body: unknown) =>
      handlers[method](
        new NextRequest("http://localhost/api/store/delivery-fees", { method, body: JSON.stringify(body) }),
      ),
    handlers,
  }
}
test("creation returns canonical public data, retains existing neighborhoods and locks before reading", async () => {
  const api = setup()
  const response = await api.request("POST", { neighborhood: " Jardim   América ", fee: 0 })
  assert.equal(response.status, 201)
  assert.deepEqual((await response.json()).deliveryFees, [
    { neighborhood: "Centro", fee: 2 },
    { neighborhood: "Tabatinga", fee: 5 },
    { neighborhood: "Jardim América", fee: 0 },
  ])
  assert.deepEqual(api.calls, ["lock", "read", "create", "read"])
})
test("rename and delete target a single neighborhood and preserve additions from other sessions", async () => {
  const api = setup()
  const previous = { neighborhood: "Centro", fee: 2 }
  await api.request("POST", { neighborhood: "Novo", fee: 3 })
  const updated = await api.request("PATCH", { previous, data: { neighborhood: "Centro Novo", fee: 0 } })
  assert.equal(updated.status, 200)
  assert.deepEqual(api.read(), [
    { neighborhood: "Centro Novo", fee: 0 },
    { neighborhood: "Tabatinga", fee: 5 },
    { neighborhood: "Novo", fee: 3 },
  ])
  const deleted = await api.request("DELETE", { previous: { neighborhood: "Centro Novo", fee: 0 } })
  assert.equal(deleted.status, 200)
  assert.deepEqual(api.read(), [
    { neighborhood: "Tabatinga", fee: 5 },
    { neighborhood: "Novo", fee: 3 },
  ])
})
test("stale fee edits and deletes cannot overwrite a change made in another session", async () => {
  const api = setup()
  const previous = { neighborhood: "Centro", fee: 2 }
  await api.request("PATCH", { previous, data: { neighborhood: "Centro", fee: 4 } })
  for (const method of ["PATCH", "DELETE"] as const) {
    const response = await api.request(method, {
      previous,
      ...(method === "PATCH" ? { data: { neighborhood: "Centro", fee: 6 } } : {}),
    })
    assert.equal(response.status, 409)
    assert.match((await response.json()).error, /outra sessão/)
  }
  assert.equal(api.read()[0].fee, 4)
  assert.equal(
    (
      await api.request("PATCH", {
        previous: { neighborhood: "Missing", fee: 0 },
        data: { neighborhood: "Novo", fee: 1 },
      })
    ).status,
    409,
  )
})
test("duplicates, invalid amounts and empty names leave all fees unchanged", async () => {
  const api = setup()
  const before = api.read()
  assert.equal((await api.request("POST", { neighborhood: "  Céntro ", fee: 0 })).status, 409)
  assert.equal(
    (
      await api.request("PATCH", {
        previous: { neighborhood: "Tabatinga", fee: 5 },
        data: { neighborhood: "CENTRO", fee: 1 },
      })
    ).status,
    409,
  )
  for (const body of [
    { neighborhood: " ", fee: 2 },
    { neighborhood: "New", fee: "" },
    { neighborhood: "New", fee: 1.001 },
    { neighborhood: "New", fee: 0, unknown: true },
  ])
    assert.equal((await api.request("POST", body)).status, 400)
  assert.deepEqual(api.read(), before)
  assert.equal(api.calls.includes("create"), false)
})
test("capacity limit blocks creation but still permits editing an existing area", async () => {
  const api = setup({
    initial: Array.from({ length: 500 }, (_, index) => ({ neighborhood: `Bairro ${index}`, fee: 2 })),
  })
  assert.equal((await api.request("POST", { neighborhood: "Extra", fee: 0 })).status, 400)
  assert.equal(
    (
      await api.request("PATCH", {
        previous: { neighborhood: "Bairro 0", fee: 2 },
        data: { neighborhood: "Bairro 0", fee: 0 },
      })
    ).status,
    200,
  )
  assert.equal(api.read().length, 500)
})
test("missing store and malformed JSON return useful errors without changes", async () => {
  const api = setup({ missing: true })
  assert.equal((await api.request("POST", { neighborhood: "Novo", fee: 2 })).status, 404)
  const result = await api.handlers.POST(
    new NextRequest("http://localhost/api/store/delivery-fees", { method: "POST", body: "{" }),
  )
  assert.equal(result.status, 400)
  assert.deepEqual(api.calls, [])
})

test("persistence failures roll back changes and keep internal database details out of responses", async () => {
  const api = setup({ fail: true })
  const before = api.read()
  const original = console.error
  console.error = () => {}
  try {
    const response = await api.request("POST", { neighborhood: "Novo", fee: 2 })
    assert.equal(response.status, 500)
    assert.equal(JSON.stringify(await response.json()).includes("PRIVATE_DATABASE_ERROR"), false)
    assert.deepEqual(api.read(), before)
  } finally {
    console.error = original
  }
})
