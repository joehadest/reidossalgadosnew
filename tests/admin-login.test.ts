import assert from "node:assert/strict"
import { test } from "node:test"
import { hash } from "bcryptjs"
import type { PrismaClient } from "@prisma/client"
import { adminLoginHandler } from "../lib/admin-login-handler"
import { adminLoginSchema } from "../lib/admin-password"

function setup(options: { passwordHash?: string; missing?: boolean; fail?: boolean } = {}) {
  let reads = 0
  const POST = adminLoginHandler({
    store: {
      findFirst: async () => {
        reads++
        if (options.fail) throw new Error("PRIVATE_DATABASE_ERROR")
        return options.missing ? null : { adminPasswordHash: options.passwordHash ?? null }
      },
    },
  } as unknown as PrismaClient)
  return { POST, reads: () => reads }
}
const request = (body: unknown) =>
  new Request("http://localhost/api/admin/login", { method: "POST", body: JSON.stringify(body) })

test("login trims surrounding whitespace, bounds legacy inputs and rejects malformed payloads", async () => {
  assert.deepEqual(adminLoginSchema.parse({ password: " admin123 " }), { password: "admin123" })
  assert.equal(adminLoginSchema.safeParse({ password: "a".repeat(1024) }).success, true)
  const { POST, reads } = setup()
  for (const body of [
    null,
    {},
    { password: 123 },
    { password: "   " },
    { password: "a".repeat(1025) },
    { password: "admin123", unexpected: true },
  ]) {
    const response = await POST(request(body))
    assert.equal(response.status, 400)
    assert.equal((await response.json()).ok, undefined)
  }
  const malformed = await POST(
    new Request("http://localhost/api/admin/login", { method: "POST", body: "{" }),
  )
  assert.equal(malformed.status, 400)
  assert.equal(reads(), 0)
})
test("default login accepts only the initial password for an existing configured store", async () => {
  const { POST } = setup()
  const valid = await POST(request({ password: " admin123 " }))
  assert.equal(valid.status, 200)
  assert.deepEqual(await valid.json(), { ok: true })
  assert.equal(valid.headers.get("cache-control"), "no-store")
  for (const password of ["wrong-password", "Admin123", "admin123-extra"]) {
    const response = await POST(request({ password }))
    assert.equal(response.status, 401)
    assert.match((await response.json()).error, /Senha incorreta/)
  }
})
test("a personalized password disables default access and supports Unicode and internal spaces", async () => {
  const secret = "Equipe São João 2026!"
  const passwordHash = await hash(secret, 4)
  const { POST } = setup({ passwordHash })
  for (const password of ["admin123", "wrong-password", "Equipe Sao Joao 2026!"]) {
    const response = await POST(request({ password }))
    assert.equal(response.status, 401)
  }
  const response = await POST(request({ password: ` ${secret} ` }))
  assert.equal(response.status, 200)
  assert.deepEqual(await response.json(), { ok: true })
})
test("missing store and unavailable database never authenticate with the default or expose internals", async () => {
  for (const options of [{ missing: true }, { fail: true }]) {
    const response = await setup(options).POST(request({ password: "admin123" }))
    assert.equal(response.status, 503)
    const body = await response.json()
    assert.equal(body.ok, undefined)
    assert.equal(JSON.stringify(body).includes("PRIVATE_DATABASE_ERROR"), false)
    assert.equal(JSON.stringify(body).includes("admin123"), false)
  }
})
