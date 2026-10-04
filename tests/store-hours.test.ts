import assert from "node:assert/strict"
import { test } from "node:test"
import { NextRequest } from "next/server"
import type { PrismaClient } from "@prisma/client"
import { DEFAULT_WEEK_HOURS, WEEK_DAYS, type StoreHourEntry } from "../lib/store-hours"
import {
  applyHoursToDays,
  hoursDuration,
  intervalMinutes,
  sameHours,
  weekHoursSchema,
  weekMinutes,
} from "../lib/hours-management"
import { storeHoursHandlers } from "../lib/store-hours-handlers"
import { storeUpdateSchema } from "../lib/store-info-validation"
import { getStoreStatus } from "../lib/store-status"

const week = () => DEFAULT_WEEK_HOURS.map((entry) => ({ ...entry }))
test("a complete unique week is required and invalid time or status values are rejected", () => {
  assert.equal(weekHoursSchema.safeParse(week()).success, true)
  assert.equal(weekHoursSchema.safeParse(week().slice(0, 6)).success, false)
  assert.equal(weekHoursSchema.safeParse([...week().slice(0, 6), week()[0]]).success, false)
  for (const data of [
    { day: "Terça" },
    { open: "24:00" },
    { close: "12:60" },
    { open: "" },
    { open: "9:00" },
    { closed: "false" },
    { open: "20:00", close: "20:00" },
  ]) {
    const hours = week()
    hours[0] = { ...hours[0], ...data } as StoreHourEntry
    assert.equal(weekHoursSchema.safeParse(hours).success, false)
  }
})
test("overnight shifts are valid; closed days retain preset intervals or legacy defaults", () => {
  const hours = week()
  hours[0] = { ...hours[0], open: "22:00", close: "02:30" }
  hours[1] = { ...hours[1], open: "10:00", close: "10:00", closed: true }
  hours[2] = { ...hours[2], open: "", close: "", closed: true }
  const parsed = weekHoursSchema.parse([...hours].reverse())
  assert.equal(parsed[0].open, "22:00")
  assert.equal(parsed[1].close, "10:00")
  assert.equal(parsed[2].open, "15:30")
  assert.equal(parsed[2].closed, true)
  assert.deepEqual(
    parsed.map((entry) => entry.day),
    [...WEEK_DAYS],
  )
})
test("the shared store endpoint also rejects empty active intervals and identical opening/closing", () => {
  assert.equal(
    storeUpdateSchema.safeParse({ hours: [{ day: "Segunda", open: "", close: "20:00" }] }).success,
    false,
  )
  assert.equal(
    storeUpdateSchema.safeParse({ hours: [{ day: "Segunda", open: "20:00", close: "20:00" }] }).success,
    false,
  )
  assert.equal(
    storeUpdateSchema.safeParse({ hours: [{ day: "Segunda", open: "22:00", close: "02:00" }] }).success,
    true,
  )
  assert.equal(
    storeUpdateSchema.safeParse({ hours: [{ day: "Segunda", closed: true, open: "", close: "" }] }).success,
    true,
  )
})
test("weekly totals handle overnight Sunday and overlapping intervals without double counting", () => {
  assert.equal(intervalMinutes({ day: "Sexta", open: "22:00", close: "02:30" }), 270)
  assert.equal(hoursDuration(270), "4h 30min")
  assert.equal(hoursDuration(0), "0h")
  assert.equal(intervalMinutes({ day: "Sexta", open: "22:00", close: "22:00" }), null)
  assert.equal(
    weekMinutes([
      { day: "Domingo", open: "22:00", close: "02:00" },
      { day: "Segunda", open: "01:00", close: "03:00" },
    ]),
    300,
  )
  assert.equal(weekMinutes([{ day: "Domingo", open: "22:00", close: "02:00", closed: true }]), 0)
  assert.equal(weekMinutes(week()), 7 * 330)
})
test("bulk edits reopen only selected days, preserve all others and do not mutate the source", () => {
  const hours = week()
  hours[0].closed = true
  hours[6].closed = true
  const previous = structuredClone(hours)
  const result = applyHoursToDays(hours, ["Segunda", "Terca"], "09:00", "17:00")
  assert.deepEqual(hours, previous)
  assert.deepEqual(result[0], { day: "Segunda", open: "09:00", close: "17:00", closed: false })
  assert.deepEqual(result[6], previous[6])
  assert.equal(sameHours(result, [...result].reverse()), true)
  assert.equal(sameHours(result, hours), false)
})
test("the customer-facing status uses Brazil time, exclusive closing and previous-day overnight service", () => {
  const hours = week().map((entry) => ({ ...entry, closed: true }))
  hours[5] = { day: "Sabado", open: "22:00", close: "02:00", closed: false }
  assert.equal(getStoreStatus(hours, new Date("2026-10-04T00:59:00Z")), false)
  assert.equal(getStoreStatus(hours, new Date("2026-10-04T01:00:00Z")), true)
  assert.equal(getStoreStatus(hours, new Date("2026-10-04T04:59:00Z")), true)
  assert.equal(getStoreStatus(hours, new Date("2026-10-04T05:00:00Z")), false)
  hours[5] = { day: "Sabado", open: "15:00", close: "20:00", closed: false }
  assert.equal(getStoreStatus(hours, new Date("2026-10-03T22:59:00Z")), true)
  assert.equal(getStoreStatus(hours, new Date("2026-10-03T23:00:00Z")), false)
  assert.equal(getStoreStatus([], new Date("2026-10-03T22:00:00Z")), false)
})

function setup(options: { missing?: boolean; fail?: boolean; initial?: StoreHourEntry[] } = {}) {
  let saved = options.initial ?? week()
  const calls: string[] = []
  const tx = {
    store: { findFirst: async () => (options.missing ? null : { id: "store" }) },
    $queryRaw: async () => {
      calls.push("lock")
      return [{ id: "store" }]
    },
    storeHour: {
      findMany: async () => {
        calls.push("read")
        return saved.map((entry) => ({ ...entry }))
      },
      deleteMany: async () => {
        calls.push("delete")
        saved = []
      },
      createMany: async ({ data }: any) => {
        calls.push("create")
        saved = data.map(({ storeId: _storeId, ...entry }: any) => entry)
        if (options.fail) throw new Error("PRIVATE_DATABASE_FAILURE")
      },
    },
  }
  const prisma = {
    $transaction: async (callback: any) => {
      const before = structuredClone(saved)
      try {
        return await callback(tx)
      } catch (error) {
        saved = before
        throw error
      }
    },
  } as unknown as PrismaClient
  const { PATCH } = storeHoursHandlers(prisma)
  return {
    calls,
    PATCH,
    values: () => structuredClone(saved),
    request: (body: unknown) =>
      PATCH(
        new NextRequest("http://localhost/api/store/hours", { method: "PATCH", body: JSON.stringify(body) }),
      ),
  }
}
test("saving replaces the entire week atomically and returns canonical data in calendar order", async () => {
  const api = setup()
  const hours = week()
  hours[5] = { ...hours[5], open: "22:00", close: "02:00" }
  hours[6] = { ...hours[6], closed: true }
  const response = await api.request({ hours: [...hours].reverse(), previousHours: week() })
  assert.equal(response.status, 200)
  assert.deepEqual((await response.json()).hours, hours)
  assert.deepEqual(api.calls, ["lock", "read", "delete", "create"])
  assert.deepEqual(api.values(), hours)
})
test("stale snapshots cannot overwrite another session's saved schedule", async () => {
  const api = setup()
  const previous = week()
  const changed = week()
  changed[0].open = "09:00"
  assert.equal((await api.request({ hours: changed, previousHours: previous })).status, 200)
  const response = await api.request({ hours: week(), previousHours: previous })
  assert.equal(response.status, 409)
  assert.match((await response.json()).error, /outra sessão/)
  assert.deepEqual(api.values(), changed)
  assert.equal(api.calls.filter((entry) => entry === "delete").length, 1)
})
test("an initially missing schedule can be published and the legacy full-array payload still works", async () => {
  const api = setup({ initial: [] })
  assert.equal((await api.request({ hours: week(), previousHours: [] })).status, 200)
  assert.equal(api.values().length, 7)
  assert.equal((await api.request(week())).status, 200)
})
test("invalid weeks fail before opening a transaction and missing stores return 404", async () => {
  const api = setup()
  for (const body of [
    {},
    { hours: [] },
    { hours: week().slice(0, 6) },
    { hours: week(), unknown: true },
    { hours: week(), previousHours: [week()[0], week()[0]] },
  ])
    assert.equal((await api.request(body)).status, 400)
  assert.deepEqual(api.calls, [])
  assert.equal((await setup({ missing: true }).request({ hours: week() })).status, 404)
  assert.equal(
    (await api.PATCH(new NextRequest("http://localhost/api/store/hours", { method: "PATCH", body: "{" })))
      .status,
    400,
  )
})
test("write failures roll back the deleted week and do not leak database details", async (context) => {
  const api = setup({ fail: true })
  const previous = api.values()
  context.mock.method(console, "error", () => {})
  const response = await api.request({ hours: applyHoursToDays(week(), ["Segunda"], "09:00", "17:00") })
  assert.equal(response.status, 500)
  assert.deepEqual(api.values(), previous)
  assert.doesNotMatch(JSON.stringify(await response.json()), /PRIVATE|stack/)
})
