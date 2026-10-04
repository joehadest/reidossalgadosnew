import assert from "node:assert/strict"
import { test } from "node:test"
import { NextRequest } from "next/server"
import type { PrismaClient } from "@prisma/client"
import { storeHandlers } from "../lib/store-handlers"
import {
  getBrazilState,
  normalizeStoreInstagram,
  normalizeStoreWhatsapp,
  storeInfoSchema,
  storeProfileSchema,
  storeUpdateSchema,
} from "../lib/store-info-validation"

const profile = {
  name: "Loja",
  about: "Descrição",
  address: "Rua 1, 10",
  city: "Cidade",
  state: "RN",
  phone: "84999999999",
  whatsapp: "84999999999",
  instagram: "@loja",
  pixKey: "key@example.com",
}
test("local Brazilian numbers receive country code once; international numbers retain their code", () => {
  assert.equal(normalizeStoreWhatsapp("(84) 99999-9999"), "5584999999999")
  assert.equal(normalizeStoreWhatsapp("+55 84 99999-9999"), "5584999999999")
  assert.equal(normalizeStoreWhatsapp("+1 415 555 1234"), "14155551234")
  const parsed = storeInfoSchema.parse(profile)
  assert.equal(parsed.phone, "(84) 99999-9999")
  assert.equal(parsed.state, "Rio Grande do Norte")
  for (const value of ["123", "99999999", "letters", "+00000000000"]) {
    assert.equal(storeInfoSchema.safeParse({ ...profile, whatsapp: value }).success, false)
  }
  assert.equal(storeInfoSchema.safeParse({ ...profile, phone: "99999999" }).success, false)
})
test("Instagram accepts handles and real profile URLs but rejects unrelated destinations and post links", () => {
  for (const value of ["loja", "@loja", "https://www.instagram.com/loja/?utm_source=test"])
    assert.equal(normalizeStoreInstagram(value), "@loja")
  for (const value of [
    "https://evil.example/loja",
    "https://instagram.com.evil.example/loja",
    "https://instagram.com/p/post",
    "https://user@instagram.com/loja",
    "javascript:alert(1)",
    "@@loja",
  ])
    assert.equal(normalizeStoreInstagram(value), null)
  assert.equal(normalizeStoreInstagram(""), "")
})
test("state aliases and optional fields work while required fields and excessive input are rejected", () => {
  assert.equal(getBrazilState(" sao paulo ")?.[0], "SP")
  assert.equal(getBrazilState("rn")?.[1], "Rio Grande do Norte")
  assert.equal(storeInfoSchema.safeParse({ ...profile, state: "unknown" }).success, false)
  assert.equal(storeInfoSchema.safeParse({ ...profile, name: " ", address: " " }).success, false)
  assert.equal(storeInfoSchema.safeParse({ ...profile, about: "x".repeat(1001) }).success, false)
  assert.equal(
    storeProfileSchema(false).safeParse({ ...profile, about: "", instagram: "", pixKey: "" }).success,
    true,
  )
  assert.equal(storeProfileSchema(true).safeParse({ ...profile, pixKey: " " }).success, false)
})

function setup(options: { missing?: boolean; key?: string; failFees?: boolean } = {}) {
  let saved = { id: "store", ...profile, pixKey: options.key ?? profile.pixKey, adminPasswordHash: "PRIVATE" }
  let payments = ["Pix", "Dinheiro"]
  let hours: unknown[] = [{ day: "Segunda", open: "15:00", close: "20:00" }]
  let fees: unknown[] = [{ neighborhood: "Centro", fee: 2 }]
  const calls: string[] = []
  const tx = {
    $queryRaw: async () => {
      calls.push("lock-store")
      return [{ id: saved.id }]
    },
    store: {
      findFirst: async () =>
        options.missing ? null : { ...saved, paymentMethods: payments.map((name) => ({ name })) },
      findUnique: async () => ({ ...saved, paymentMethods: payments.map((name) => ({ name })) }),
      update: async ({ data }: any) => {
        calls.push("store-update")
        saved = { ...saved, ...data }
        return saved
      },
    },
    paymentMethod: {
      deleteMany: async () => {
        calls.push("payment-delete")
        payments = []
      },
      createMany: async ({ data }: any) => {
        payments = data.map((method: any) => method.name)
      },
    },
    storeHour: {
      deleteMany: async () => {
        calls.push("hours-delete")
        hours = []
      },
      createMany: async ({ data }: any) => {
        hours = data
      },
    },
    deliveryFee: {
      deleteMany: async () => {
        calls.push("fees-delete")
        fees = []
      },
      createMany: async ({ data }: any) => {
        if (options.failFees) throw new Error("Simulated database failure")
        fees = data
      },
    },
  }
  const prisma = {
    $transaction: async (callback: any) => {
      calls.push("transaction")
      const snapshot = { saved: { ...saved }, payments: [...payments], hours: [...hours], fees: [...fees] }
      try {
        return await callback(tx)
      } catch (error) {
        saved = snapshot.saved
        payments = snapshot.payments
        hours = snapshot.hours
        fees = snapshot.fees
        throw error
      }
    },
  } as unknown as PrismaClient
  return { ...storeHandlers(prisma), calls, values: () => ({ saved, payments, hours, fees }) }
}
const request = (body: unknown) =>
  new NextRequest("http://localhost/api/store", { method: "PATCH", body: JSON.stringify(body) })

test("profile edits update only provided fields and return canonical public data without changing related settings", async () => {
  const api = setup()
  const previous = api.values()
  const response = await api.PATCH(
    request({ name: " Novo nome ", instagram: "https://instagram.com/nova_loja/" }),
  )
  assert.equal(response.status, 200)
  const data = await response.json()
  assert.equal(data.store.name, "Novo nome")
  assert.equal(data.store.instagram, "@nova_loja")
  assert.equal("adminPasswordHash" in data.store, false)
  assert.equal("id" in data.store, false)
  assert.equal(api.values().saved.address, previous.saved.address)
  assert.deepEqual(api.values().payments, previous.payments)
  assert.deepEqual(api.values().hours, previous.hours)
  assert.deepEqual(api.values().fees, previous.fees)
  assert.deepEqual(api.calls, ["transaction", "lock-store", "store-update"])
})
test("invalid payloads fail before persistence and missing stores return a useful error", async () => {
  const api = setup()
  for (const body of [
    {},
    null,
    { name: "" },
    { state: "no" },
    { adminPasswordHash: "do-not-change" },
    { whatsapp: "letters" },
    { deliveryFees: [{ neighborhood: "Centro", fee: -1 }] },
  ])
    assert.equal((await api.PATCH(request(body))).status, 400)
  assert.deepEqual(api.calls, [])
  assert.equal(
    (await api.PATCH(new NextRequest("http://localhost/api/store", { method: "PATCH", body: "{" }))).status,
    400,
  )
  assert.equal((await setup({ missing: true }).PATCH(request({ name: "Loja" }))).status, 404)
})
test("Pix keys cannot be cleared while Pix is enabled; disabling Pix or saving unrelated fields remains possible", async () => {
  const api = setup()
  assert.equal((await api.PATCH(request({ pixKey: " " }))).status, 400)
  assert.equal(api.calls.includes("store-update"), false)
  assert.equal((await api.PATCH(request({ paymentMethods: ["Dinheiro"], pixKey: "" }))).status, 200)
  assert.equal(api.values().saved.pixKey, "")
  assert.deepEqual(api.values().payments, ["Dinheiro"])
  const withoutKey = setup({ key: "" })
  assert.equal((await withoutKey.PATCH(request({ name: "Loja nova" }))).status, 200)
  assert.equal((await withoutKey.PATCH(request({ paymentMethods: ["Pix"] }))).status, 400)
})
test("shared settings still normalize the week and reject duplicate methods, neighborhoods and days", async () => {
  assert.equal(storeUpdateSchema.safeParse({ paymentMethods: ["Pix", " PIX "] }).success, false)
  assert.equal(
    storeUpdateSchema.safeParse({
      deliveryFees: [
        { neighborhood: "Centro", fee: 1 },
        { neighborhood: "centro", fee: 2 },
      ],
    }).success,
    false,
  )
  assert.equal(
    storeUpdateSchema.safeParse({ hours: [{ day: "Segunda" }, { day: "Segunda" }] }).success,
    false,
  )
  const api = setup()
  const response = await api.PATCH(
    request({
      hours: [
        { day: "Segunda", open: "09:00", close: "18:00", closed: false },
        { day: "Domingo", open: "", close: "", closed: true },
      ],
      deliveryFees: [{ neighborhood: " Bairro ", fee: 0 }],
    }),
  )
  assert.equal(response.status, 200)
  assert.equal(api.values().hours.length, 7)
  assert.equal((api.values().hours[6] as { closed: boolean }).closed, true)
  assert.equal((await response.json()).store.deliveryFees[0].neighborhood, "Bairro")
  assert.equal(api.calls.includes("payment-delete"), false)
  assert.equal(api.calls.includes("store-update"), false)
})
test("failures roll back both profile edits and related replacements without leaking internal errors", async (context) => {
  const api = setup({ failFees: true })
  const previous = structuredClone(api.values())
  context.mock.method(console, "error", () => {})
  const response = await api.PATCH(
    request({ name: "Changed", deliveryFees: [{ neighborhood: "Bairro", fee: 3 }] }),
  )
  assert.equal(response.status, 500)
  assert.deepEqual(api.values(), previous)
  assert.doesNotMatch(JSON.stringify(await response.json()), /Simulated|PRIVATE|stack/)
})
