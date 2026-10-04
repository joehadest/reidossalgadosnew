import assert from "node:assert/strict"
import { test } from "node:test"
import { revenueRange, revenueCsv, type RevenueData } from "../lib/admin-revenue"

const now = new Date("2026-10-04T02:30:00Z") // Still October 3 in São Paulo.

test("today compares only the same elapsed hours yesterday", () => {
  const range = revenueRange("hoje", now)
  assert.equal(range.start.toISOString(), "2026-10-03T03:00:00.000Z")
  assert.equal(range.end.toISOString(), now.toISOString())
  assert.equal(range.previousEnd.toISOString(), "2026-10-03T02:30:00.000Z")
  assert.deepEqual(range.dates, ["2026-10-03"])
  assert.equal(range.range.previousTo, "2026-10-02")
})
test("yesterday covers a full local day with exclusive end", () => {
  const range = revenueRange("ontem", now)
  assert.equal(range.start.toISOString(), "2026-10-02T03:00:00.000Z")
  assert.equal(range.end.toISOString(), "2026-10-03T03:00:00.000Z")
  assert.equal(range.previousEnd.toISOString(), range.start.toISOString())
  assert.equal(range.range.partial, false)
})
test("week starts Monday and compares the same weekday and time", () => {
  const range = revenueRange("semana", now)
  assert.equal(range.range.from, "2026-09-28")
  assert.equal(range.range.previousFrom, "2026-09-21")
  assert.equal(range.range.previousTo, "2026-09-26")
  assert.equal(range.dates.length, 6)
  assert.equal(range.end.getTime() - range.start.getTime(), range.previousEnd.getTime() - range.previousStart.getTime())
})
test("month comparison caps at the end of February", () => {
  const range = revenueRange("mes", new Date("2024-03-31T18:00:00Z"))
  assert.equal(range.range.previousFrom, "2024-02-01")
  assert.equal(range.range.previousTo, "2024-02-29")
  assert.equal(range.previousEnd.toISOString(), "2024-03-01T03:00:00.000Z")
  assert.equal(range.range.previousDays, 29)
  assert.equal(range.range.previousPartial, false)
  assert.equal(range.dates.length, 31)
})
test("previous month handles a year boundary and differing month lengths", () => {
  const range = revenueRange("mes-anterior", new Date("2027-01-02T12:00:00Z"))
  assert.equal(range.range.from, "2026-12-01")
  assert.equal(range.range.to, "2026-12-31")
  assert.equal(range.range.previousFrom, "2026-11-01")
  assert.equal(range.range.previousTo, "2026-11-30")
  assert.equal(range.range.previousDays, 30)
  assert.equal(range.range.partial, false)
  assert.equal(range.dates.length, 31)
})
test("custom range is inclusive and comparison is contiguous without overlap", () => {
  const range = revenueRange("personalizado", now, "2026-09-01", "2026-09-30")
  assert.equal(range.end.toISOString(), "2026-10-01T03:00:00.000Z")
  assert.equal(range.range.previousFrom, "2026-08-02")
  assert.equal(range.range.previousTo, "2026-08-31")
  assert.equal(range.previousEnd.toISOString(), range.start.toISOString())
  assert.equal(range.dates.length, 30)
  assert.equal(new Set(range.dates).size, 30)
})
test("custom range ending today uses matched elapsed time", () => {
  const range = revenueRange("personalizado", now, "2026-10-01", "2026-10-03")
  assert.equal(range.end.toISOString(), now.toISOString())
  assert.equal(range.previousEnd.toISOString(), "2026-10-01T02:30:00.000Z")
  assert.equal(range.range.previousFrom, "2026-09-28")
  assert.equal(range.range.previousTo, "2026-09-30")
  assert.equal(range.range.previousDays, 3)
})
test("rejects impossible, future, inverted and excessive custom ranges", () => {
  for (const [from, to] of [["2026-02-30", "2026-03-01"], ["bad", "2026-10-01"], ["2026-10-03", "2026-10-04"], ["2026-09-30", "2026-09-01"], ["2026-01-01", "2026-09-30"]]) {
    assert.throws(() => revenueRange("personalizado", now, from, to))
  }
})
test("CSV includes zero days, delivery and cancellation totals and escapes editable labels", () => {
  const data: RevenueData = {
    period: "hoje", range: revenueRange("hoje", now).range,
    totals: { total: 50, count: 2, subtotal: 44, delivery: 6 },
    previous: { total: 0, count: 0, subtotal: 0, delivery: 0 },
    daily: [{ date: "2026-10-03", total: 50, count: 2 }, { date: "2026-10-02", total: 0, count: 0 }],
    payments: [{ name: '=HYPERLINK("x")', total: 50, count: 2 }], canceled: { total: 10, count: 1 }, updatedAt: now.toISOString(),
  }
  const csv = revenueCsv(data)
  assert.ok(csv.startsWith("\uFEFF"))
  assert.ok(csv.includes('"50,00";"44,00";"6,00";"25,00"'))
  assert.ok(csv.includes('"Diário";"02/10/2026";"0";"0,00"'))
  assert.ok(csv.includes('"\'=HYPERLINK(""x"")"'))
  assert.ok(csv.includes('"Cancelados (excluídos)";"03/10/2026";"1";"10,00"'))
})
