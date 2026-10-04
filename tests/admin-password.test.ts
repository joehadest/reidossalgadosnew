import assert from "node:assert/strict"
import { test } from "node:test"
import { compare, hash } from "bcryptjs"
import type { PrismaClient } from "@prisma/client"
import { adminPasswordHandlers } from "../lib/admin-password-handlers"
import {
  passwordBytes,
  passwordChangeSchema,
  passwordFormSchema,
  passwordSuggestions,
} from "../lib/admin-password"

const request = (body: unknown) =>
  new Request("http://localhost/api/admin/change-password", {
    method: "POST",
    body: JSON.stringify(body),
  })
function setup(
  options: {
    passwordHash?: string
    missing?: boolean
    failRead?: boolean
    failWrite?: boolean
  } = {},
) {
  let passwordHash: string | null = options.passwordHash ?? null
  const writes: unknown[] = []
  const handlers = adminPasswordHandlers({
    store: {
      findFirst: async () => {
        if (options.failRead) throw new Error("PRIVATE_DATABASE_ERROR")
        return options.missing ? null : { id: "store", adminPasswordHash: passwordHash }
      },
      updateMany: async ({ where, data }: any) => {
        if (options.failWrite) throw new Error("PRIVATE_DATABASE_ERROR")
        if (where.id !== "store" || where.adminPasswordHash !== passwordHash) return { count: 0 }
        writes.push(data)
        passwordHash = data.adminPasswordHash
        return { count: 1 }
      },
    },
  } as unknown as PrismaClient)
  return { handlers, writes, read: () => passwordHash }
}

test("password validation is consistent for confirmation, whitespace, default and repeated passwords", () => {
  const valid = {
    currentPassword: "old-secret",
    newPassword: "Nova senha 2026!",
    confirmPassword: "Nova senha 2026!",
  }
  assert.equal(passwordFormSchema.safeParse(valid).success, true)
  assert.equal(
    passwordChangeSchema.safeParse({
      currentPassword: " old-secret ",
      newPassword: valid.newPassword,
    }).success,
    true,
  )
  for (const changes of [
    { newPassword: "short" },
    { newPassword: "old-secret" },
    { newPassword: "admin123" },
    { newPassword: " trailing " },
    { currentPassword: " " },
    { confirmPassword: "different" },
    { confirmPassword: "" },
  ])
    assert.equal(passwordFormSchema.safeParse({ ...valid, ...changes }).success, false)
  assert.equal(
    passwordChangeSchema.safeParse({
      currentPassword: "old",
      newPassword: "Valid123!",
      extra: true,
    }).success,
    false,
  )
  assert.equal(passwordChangeSchema.safeParse(null).success, false)
})
test("new passwords respect bcrypt's byte limit without truncating Unicode or long ASCII inputs", () => {
  assert.equal(passwordBytes("á".repeat(36)), 72)
  for (const value of ["a".repeat(72), "á".repeat(36), "😀".repeat(18)])
    assert.equal(
      passwordChangeSchema.safeParse({
        currentPassword: "old",
        newPassword: value,
      }).success,
      true,
    )
  for (const value of ["a".repeat(73), "á".repeat(37), "😀".repeat(19)])
    assert.equal(
      passwordChangeSchema.safeParse({
        currentPassword: "old",
        newPassword: value,
      }).success,
      false,
    )
  assert.deepEqual(
    passwordSuggestions("SenhaLonga2026!").map((entry) => entry.met),
    [true, true, true],
  )
  assert.deepEqual(
    passwordSuggestions("").map((entry) => entry.met),
    [false, false, false],
  )
})
test("first change replaces the default with a hash and never returns credential data", async () => {
  const { handlers, read, writes } = setup()
  const response = await handlers.POST(
    request({
      currentPassword: "admin123",
      newPassword: "MinhaNovaSenha2026!",
    }),
  )
  assert.equal(response.status, 200)
  assert.deepEqual(await response.json(), { ok: true })
  assert.equal(writes.length, 1)
  assert.notEqual(read(), "MinhaNovaSenha2026!")
  assert.equal(await compare("MinhaNovaSenha2026!", read()!), true)
  assert.equal(await compare("admin123", read()!), false)
  const status = await handlers.GET()
  assert.deepEqual(await status.json(), { usingDefaultPassword: false })
  assert.equal(status.headers.get("cache-control"), "no-store")
})
test("custom password changes require the correct current password and do not accept the default", async () => {
  const previous = await hash("Equipe2026!", 4)
  const { handlers, read, writes } = setup({ passwordHash: previous })
  for (const currentPassword of ["wrong", "admin123"]) {
    const response = await handlers.POST(
      request({ currentPassword, newPassword: "ProximaSenha2026!" }),
    )
    assert.equal(response.status, 401)
    assert.ok((await response.json()).fields.currentPassword)
  }
  assert.equal(read(), previous)
  assert.equal(writes.length, 0)
  const response = await handlers.POST(
    request({
      currentPassword: "Equipe2026!",
      newPassword: "ProximaSenha2026!",
    }),
  )
  assert.equal(response.status, 200)
  assert.equal(await compare("ProximaSenha2026!", read()!), true)
  assert.equal(await compare("Equipe2026!", read()!), false)
})
test("simultaneous updates cannot overwrite each other with a stale current password", async () => {
  const { handlers, read, writes } = setup()
  const responses = await Promise.all([
    handlers.POST(
      request({
        currentPassword: "admin123",
        newPassword: "PrimeiraSenha2026!",
      }),
    ),
    handlers.POST(
      request({
        currentPassword: "admin123",
        newPassword: "SegundaSenha2026!",
      }),
    ),
  ])
  assert.deepEqual(responses.map((response) => response.status).sort(), [200, 409])
  assert.equal(writes.length, 1)
  const loser = await responses.find((response) => response.status === 409)!.json()
  assert.ok(loser.fields.currentPassword)
  const winner = responses[0].status === 200 ? "PrimeiraSenha2026!" : "SegundaSenha2026!"
  assert.equal(await compare(winner, read()!), true)
})
test("malformed requests, repeated/default passwords and oversized inputs never reach a write", async () => {
  const { handlers, writes } = setup()
  for (const body of [
    null,
    {},
    { currentPassword: "admin123", newPassword: "admin123" },
    { currentPassword: "same-secret", newPassword: "same-secret" },
    { currentPassword: "admin123", newPassword: "a".repeat(73) },
    { currentPassword: "admin123", newPassword: " a-secret" },
  ]) {
    const response = await handlers.POST(request(body))
    assert.equal(response.status, 400)
  }
  const invalidJson = await handlers.POST(
    new Request("http://localhost/api/admin/change-password", {
      method: "POST",
      body: "{",
    }),
  )
  assert.equal(invalidJson.status, 400)
  assert.equal(writes.length, 0)
})
test("missing configuration and storage errors preserve the credential and do not expose internals", async () => {
  for (const [options, expected] of [
    [{ missing: true }, 404],
    [{ failRead: true }, 500],
    [{ failWrite: true }, 500],
  ] as const) {
    const { handlers, read, writes } = setup(options)
    const response = await handlers.POST(
      request({ currentPassword: "admin123", newPassword: "NovaSenha2026!" }),
    )
    assert.equal(response.status, expected)
    assert.equal(JSON.stringify(await response.json()).includes("PRIVATE_DATABASE_ERROR"), false)
    assert.equal(read(), null)
    assert.equal(writes.length, 0)
  }
})
test("access status distinguishes default, personalized and unavailable without exposing the hash", async () => {
  const { handlers } = setup()
  assert.deepEqual(await (await handlers.GET()).json(), {
    usingDefaultPassword: true,
  })
  for (const [options, expected] of [
    [{ missing: true }, 404],
    [{ failRead: true }, 503],
  ] as const) {
    const response = await setup(options).handlers.GET()
    assert.equal(response.status, expected)
    assert.equal((await response.json()).usingDefaultPassword, undefined)
  }
})
