import assert from "node:assert/strict"
import { test } from "node:test"
import { businessDate, dashboardRange, storeOpeningInfo } from "../lib/admin-dashboard"

test("uses the store's date when UTC has already moved to the next day", () => {
  assert.equal(businessDate(new Date("2026-10-04T02:59:59Z")), "2026-10-03")
  assert.equal(businessDate(new Date("2026-10-04T03:00:00Z")), "2026-10-04")
})

test("includes today and creates contiguous, non-overlapping comparison periods", () => {
  const range = dashboardRange(7, new Date("2026-10-04T01:00:00Z"))
  assert.equal(range.start.toISOString(), "2026-09-27T03:00:00.000Z")
  assert.equal(range.end.toISOString(), "2026-10-04T03:00:00.000Z")
  assert.equal(range.previousStart.toISOString(), "2026-09-20T03:00:00.000Z")
  assert.equal(range.dates.length, 7)
  assert.equal(range.dates[0], "2026-09-27")
  assert.equal(range.dates.at(-1), "2026-10-03")
})

test("30-day ranges work across a year boundary", () => {
  const range = dashboardRange(30, new Date("2027-01-02T12:00:00Z"))
  assert.equal(range.dates.length, 30)
  assert.equal(new Set(range.dates).size, 30)
  assert.equal(range.dates[0], "2026-12-04")
  assert.equal(range.dates.at(-1), "2027-01-02")
  assert.equal(range.previousStart.toISOString(), "2026-11-04T03:00:00.000Z")
})

test("store status uses local opening and exclusive closing times", () => {
  const hours = [{ day: "Sabado", open: "15:00", close: "20:00" }]
  assert.equal(storeOpeningInfo(hours, new Date("2026-10-03T17:59:00Z")).open, false)
  assert.equal(storeOpeningInfo(hours, new Date("2026-10-03T18:00:00Z")).open, true)
  assert.equal(storeOpeningInfo(hours, new Date("2026-10-03T22:59:00Z")).open, true)
  assert.equal(storeOpeningInfo(hours, new Date("2026-10-03T23:00:00Z")).open, false)
})

test("a closed day does not open and an unconfigured schedule stays closed", () => {
  const hours = [{ day: "Sabado", open: "15:00", close: "20:00", closed: true }]
  assert.equal(storeOpeningInfo(hours, new Date("2026-10-03T19:00:00Z")).open, false)
  assert.equal(storeOpeningInfo([], new Date("2026-10-03T19:00:00Z")).open, false)
})

test("overnight service carries over even when the following day is closed", () => {
  const hours = [
    { day: "Sabado", open: "18:00", close: "02:00" },
    { day: "Domingo", open: "18:00", close: "20:00", closed: true },
  ]
  const opening = storeOpeningInfo(hours, new Date("2026-10-04T04:00:00Z"))
  assert.equal(opening.open, true)
  assert.equal(opening.closesAt, "02:00")
  assert.equal(storeOpeningInfo(hours, new Date("2026-10-04T05:00:00Z")).open, false)
  assert.equal(storeOpeningInfo(hours, new Date("2026-10-03T18:00:00Z")).open, false)
})
