import assert from "node:assert/strict"
import { test } from "node:test"
import { parseOrderQuery, orderBaseWhere } from "../lib/order-query"
import { orderQuantity, ORDER_NEXT } from "../lib/admin-orders"
import { escapePrintText, printOrderThermal } from "../lib/thermal-print"

test("bounds pagination and rejects malformed or fractional numeric inputs", () => {
  const query = parseOrderQuery(new URLSearchParams("page=-1&limit=50000&status=invalid&date=invalid"))
  assert.equal(query.page, 1)
  assert.equal(query.limit, 100)
  assert.equal(query.status, "")
  assert.equal(query.date, "todos")
  assert.equal(parseOrderQuery(new URLSearchParams("page=NaN&limit=1.2")).limit, 50)
  assert.equal(parseOrderQuery(new URLSearchParams("page=2")).page, 2)
})

test("date filters use whole store days, including when UTC is in the following day", () => {
  const now = new Date("2026-10-04T01:00:00Z")
  const today = orderBaseWhere(parseOrderQuery(new URLSearchParams("date=hoje")), now)
  assert.deepEqual(today.createdAt, { gte: new Date("2026-10-03T03:00:00Z"), lt: new Date("2026-10-04T03:00:00Z") })
  const week = orderBaseWhere(parseOrderQuery(new URLSearchParams("date=semana")), now)
  assert.deepEqual(week.createdAt, { gte: new Date("2026-09-27T03:00:00Z"), lt: new Date("2026-10-04T03:00:00Z") })
  assert.deepEqual(orderBaseWhere(parseOrderQuery(new URLSearchParams("date=todos")), now), {})
})

test("new-order notifications retain their five-minute window regardless of list filters", () => {
  const now = new Date("2026-10-03T20:00:00Z")
  const query = parseOrderQuery(new URLSearchParams("new=true&date=hoje&q=no-match&status=entregue"))
  assert.deepEqual(orderBaseWhere(query, now), { status: "recebido", createdAt: { gte: new Date("2026-10-03T19:55:00Z") } })
})

test("search covers customer, phone, code and neighborhood, supporting formatted phone and #code", () => {
  const code = orderBaseWhere(parseOrderQuery(new URLSearchParams("q=%23ABC123")))
  assert.deepEqual(code.OR?.[2], { id: { contains: "ABC123", mode: "insensitive" } })
  const phone = orderBaseWhere(parseOrderQuery(new URLSearchParams("q=(84) 99917-1009")))
  assert.equal(phone.OR?.length, 5)
  assert.deepEqual(phone.OR?.[4], { phone: { contains: "84999171009" } })
  assert.equal(parseOrderQuery(new URLSearchParams({ q: "x".repeat(150) })).search.length, 100)
})

test("quantity counts units rather than distinct item lines and finished statuses do not advance", () => {
  assert.equal(orderQuantity({ items: [{ quantity: 7 }, { quantity: 3 }, { quantity: 1 }, { quantity: 1 }] }), 12)
  assert.equal(ORDER_NEXT.recebido.status, "confirmado")
  assert.equal(ORDER_NEXT.entrega.status, "entregue")
  assert.equal(ORDER_NEXT.entregue, undefined)
  assert.equal(ORDER_NEXT.cancelado, undefined)
})

test("thermal receipt escapes customer content instead of executing markup", () => {
  assert.equal(escapePrintText('<script>alert("x")</script> & O\'Brien'), "&lt;script&gt;alert(&quot;x&quot;)&lt;/script&gt; &amp; O&#39;Brien")
  let html = ""
  const previousWindow = globalThis.window
  Object.defineProperty(globalThis, "window", { configurable: true, value: {
    open: () => ({ document: { write: (value: string) => { html = value }, close: () => {} }, focus: () => {}, print: () => {}, close: () => {} }),
  } })
  try {
    printOrderThermal({
      id: "code123", name: '<img src=x onerror="alert(1)">', phone: "123",
      address: "<script>bad</script>", neighborhood: "Centro", complement: null,
      paymentMethod: "<b>PIX</b>", changeFor: null, subtotal: 10, deliveryFee: 2, total: 12,
      status: "recebido", createdAt: "2026-10-04T01:00:00Z",
      items: [{ name: "<script>item</script>", variantName: "<b>variante</b>", price: 10, quantity: 1 }],
    }, "<b>Loja</b>")
    assert.equal(html.includes("<script>"), false)
    assert.equal(html.includes('<img src=x'), false)
    assert.ok(html.includes("&lt;script&gt;item&lt;/script&gt;"))
    assert.ok(html.includes("&lt;B&gt;LOJA&lt;/B&gt;"))
    assert.ok(html.includes("03/10/2026"))
  } finally {
    Object.defineProperty(globalThis, "window", { configurable: true, value: previousWindow })
  }
})
