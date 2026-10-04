import assert from "node:assert/strict"
import { test } from "node:test"
import { NextRequest } from "next/server"
import type { PrismaClient } from "@prisma/client"
import { paymentHandlers } from "../lib/payment-handlers"
import { acceptsPix, paymentIdentity, paymentKind, paymentMethodSchema } from "../lib/payment-methods"
import { storeUpdateSchema } from "../lib/store-info-validation"

test("checkout recognizes Pix, cash and card aliases without changing the selected order label", () => {
  assert.equal(paymentKind("  PiX  "), "pix")
  assert.equal(paymentKind("DINHEIRO"), "cash")
  assert.equal(paymentKind(" Cartão   de CRÉDITO "), "credit")
  assert.equal(paymentKind("Débito"), "debit")
  assert.equal(paymentKind("Vale-refeição"), "other")
  assert.equal(paymentKind("Pix parcelado"), "other")
  assert.equal(acceptsPix(["Cartão", "pIx"]), true)
  assert.equal(paymentIdentity(" Crédito "), paymentIdentity("Cartao de Credito"))
  assert.equal(paymentMethodSchema.parse("  cartão   de crédito  "), "Cartão de Crédito")
  assert.equal(paymentMethodSchema.parse(" Vale   da loja "), "Vale da loja")
})
test("bulk settings also reject whitespace/accent/card alias duplicates", () => {
  for (const names of [
    ["PIX", " Pix "],
    ["Cartao de Credito", "Crédito"],
    ["Vale da loja", "Vále   da loja"],
  ])
    assert.equal(storeUpdateSchema.safeParse({ paymentMethods: names }).success, false)
  assert.equal(storeUpdateSchema.safeParse({ paymentMethods: ["  "] }).success, false)
})
function setup(options: { names?: string[]; key?: string; missing?: boolean; fail?: boolean } = {}) {
  let sequence = 0
  let methods = (options.names ?? ["Cartao de Credito", "Dinheiro"]).map((name) => ({
    id: String(++sequence),
    name,
    storeId: "store",
  }))
  let pixKey = options.key ?? ""
  const calls: string[] = []
  const tx = {
    $queryRaw: async () => {
      calls.push("lock")
      return [{ id: "store" }]
    },
    store: {
      findFirst: async () => (options.missing ? null : { id: "store" }),
      findUnique: async () => {
        calls.push("read")
        return { pixKey, paymentMethods: methods.map((entry) => ({ ...entry })) }
      },
      update: async ({ data }: any) => {
        pixKey = data.pixKey
        calls.push("key")
      },
    },
    paymentMethod: {
      create: async ({ data }: any) => {
        calls.push("create")
        methods.push({ id: String(++sequence), ...data })
        if (options.fail) throw new Error("PRIVATE_ERROR")
      },
      update: async ({ where, data }: any) => {
        methods = methods.map((entry) => (entry.id === where.id ? { ...entry, ...data } : entry))
      },
      delete: async ({ where }: any) => {
        methods = methods.filter((entry) => entry.id !== where.id)
      },
      findMany: async () => methods.map(({ name }) => ({ name })),
    },
  }
  const prisma = {
    $transaction: async (callback: any) => {
      const before = methods.map((entry) => ({ ...entry }))
      const beforeKey = pixKey
      try {
        return await callback(tx)
      } catch (error) {
        methods = before
        pixKey = beforeKey
        throw error
      }
    },
  } as unknown as PrismaClient
  const handlers = paymentHandlers(prisma)
  return {
    calls,
    handlers,
    read: () => ({ paymentMethods: methods.map(({ name }) => name), pixKey }),
    request: (method: keyof typeof handlers, body: unknown) =>
      handlers[method](
        new NextRequest("http://localhost/api/store/payments", { method, body: JSON.stringify(body) }),
      ),
  }
}
test("create, rename and delete preserve methods added by another session and return only public settings", async () => {
  const api = setup()
  assert.equal((await api.request("POST", { name: " Vale   refeição " })).status, 201)
  assert.deepEqual(api.calls, ["lock", "read", "create"])
  const response = await api.request("PATCH", {
    action: "rename",
    previousName: "Cartao de Credito",
    name: "Crédito",
  })
  assert.equal(response.status, 200)
  assert.deepEqual(await response.json(), {
    paymentMethods: ["Cartão de Crédito", "Dinheiro", "Vale refeição"],
    pixKey: "",
  })
  assert.equal((await api.request("DELETE", { name: "Dinheiro" })).status, 200)
  assert.deepEqual(api.read().paymentMethods, ["Cartão de Crédito", "Vale refeição"])
})
test("Pix requires a key and first method plus key are saved atomically", async () => {
  const api = setup()
  const before = api.read()
  assert.equal((await api.request("POST", { name: "pix" })).status, 400)
  assert.deepEqual(api.read(), before)
  assert.equal((await api.request("POST", { name: "pix", pixKey: " key@example.test " })).status, 400)
  assert.equal(
    (await api.request("POST", { name: "pix", pixKey: " key@example.test ", previousPixKey: "" })).status,
    201,
  )
  assert.deepEqual(api.read(), {
    paymentMethods: [...before.paymentMethods, "PIX"],
    pixKey: "key@example.test",
  })
  const rename = setup()
  assert.equal(
    (await rename.request("PATCH", { action: "rename", previousName: "Dinheiro", name: "Pix" })).status,
    400,
  )
  assert.equal(
    (
      await rename.request("PATCH", {
        action: "rename",
        previousName: "Dinheiro",
        name: "Pix",
        pixKey: "random-key",
        previousPixKey: "",
      })
    ).status,
    200,
  )
  assert.deepEqual(rename.read(), { paymentMethods: ["Cartao de Credito", "PIX"], pixKey: "random-key" })
})
test("key edits preserve methods, reject stale sessions and prevent clearing an active Pix", async () => {
  const api = setup({ names: ["PIX", "Dinheiro"], key: "old-key" })
  assert.equal(
    (await api.request("PATCH", { action: "pix", pixKey: "new-key", previousPixKey: "old-key" })).status,
    200,
  )
  assert.equal(
    (await api.request("PATCH", { action: "pix", pixKey: "other-key", previousPixKey: "old-key" })).status,
    409,
  )
  assert.equal(
    (await api.request("PATCH", { action: "pix", pixKey: " ", previousPixKey: "new-key" })).status,
    400,
  )
  assert.deepEqual(api.read(), { paymentMethods: ["PIX", "Dinheiro"], pixKey: "new-key" })
  assert.equal((await api.request("DELETE", { name: "PIX" })).status, 200)
  assert.equal(api.read().pixKey, "new-key")
  assert.equal(
    (await api.request("PATCH", { action: "pix", pixKey: "", previousPixKey: "new-key" })).status,
    200,
  )
})
test("duplicates and outdated method names cannot alter current settings", async () => {
  const api = setup()
  const before = api.read()
  assert.equal((await api.request("POST", { name: "CRÉDITO" })).status, 409)
  assert.equal(
    (await api.request("PATCH", { action: "rename", previousName: "Dinheiro", name: "cartao   de credito" }))
      .status,
    409,
  )
  assert.equal(
    (await api.request("PATCH", { action: "rename", previousName: "Removed", name: "Novo" })).status,
    409,
  )
  assert.equal((await api.request("DELETE", { name: "Removed" })).status, 409)
  assert.deepEqual(api.read(), before)
})
test("last method can be removed; capacity limit still allows edits and deletions", async () => {
  const last = setup({ names: ["Dinheiro"] })
  assert.equal((await last.request("DELETE", { name: "Dinheiro" })).status, 200)
  assert.deepEqual(last.read().paymentMethods, [])
  const api = setup({ names: Array.from({ length: 30 }, (_, index) => `Forma ${index}`) })
  assert.equal((await api.request("POST", { name: "Extra" })).status, 400)
  assert.equal(
    (await api.request("PATCH", { action: "rename", previousName: "Forma 0", name: "Nova" })).status,
    200,
  )
  assert.equal(api.read().paymentMethods.length, 30)
})
test("invalid input, oversized fields, malformed JSON and missing store return useful errors", async () => {
  const api = setup()
  for (const body of [
    { name: " " },
    { name: "a".repeat(61) },
    { name: "Nova", unexpected: true },
    { name: "PIX", pixKey: "x".repeat(141), previousPixKey: "" },
  ])
    assert.equal((await api.request("POST", body)).status, 400)
  assert.equal(
    (
      await api.handlers.POST(
        new NextRequest("http://localhost/api/store/payments", { method: "POST", body: "{" }),
      )
    ).status,
    400,
  )
  assert.deepEqual(api.calls, [])
  assert.equal((await setup({ missing: true }).request("POST", { name: "Nova" })).status, 404)
})
test("failed persistence rolls back both Pix key and method without leaking database errors", async () => {
  const api = setup({ fail: true })
  const before = api.read()
  const original = console.error
  console.error = () => {}
  try {
    const response = await api.request("POST", { name: "PIX", pixKey: "new-key", previousPixKey: "" })
    assert.equal(response.status, 500)
    assert.equal(JSON.stringify(await response.json()).includes("PRIVATE_ERROR"), false)
    assert.deepEqual(api.read(), before)
  } finally {
    console.error = original
  }
})
