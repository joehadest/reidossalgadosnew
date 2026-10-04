import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/db"
import { REVENUE_PERIODS, revenueRange, revenueCsv, type RevenueData, type RevenuePeriod, type RevenueDay } from "@/lib/admin-revenue"

export async function GET(request: NextRequest) {
  const query = request.nextUrl.searchParams
  const period = query.get("period") ?? "mes"
  const now = new Date()
  let selection: ReturnType<typeof revenueRange>
  try {
    if (!REVENUE_PERIODS.some((entry) => entry.id === period)) throw new Error("Período inválido.")
    selection = revenueRange(period as RevenuePeriod, now, query.get("from"), query.get("to"))
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "Intervalo inválido." }, { status: 400 })
  }
  const { start, end, previousStart, previousEnd, dates, range } = selection
  const where = { createdAt: { gte: start, lt: end }, status: { not: "cancelado" } }
  try {
    const [totals, previous, daily, payments, canceled] = await Promise.all([
      prisma.order.aggregate({ where, _sum: { total: true, subtotal: true, deliveryFee: true }, _count: true }),
      prisma.order.aggregate({ where: { createdAt: { gte: previousStart, lt: previousEnd }, status: { not: "cancelado" } }, _sum: { total: true, subtotal: true, deliveryFee: true }, _count: true }),
      prisma.$queryRaw<RevenueDay[]>`
        SELECT to_char(created_at AT TIME ZONE 'UTC' AT TIME ZONE 'America/Sao_Paulo', 'YYYY-MM-DD') AS date,
               COALESCE(SUM(total), 0)::double precision AS total, COUNT(*)::integer AS count
        FROM orders WHERE created_at >= ${start} AND created_at < ${end} AND status <> 'cancelado'
        GROUP BY 1 ORDER BY 1
      `,
      prisma.order.groupBy({ by: ["paymentMethod"], where, _sum: { total: true }, _count: true }),
      prisma.order.aggregate({ where: { createdAt: { gte: start, lt: end }, status: "cancelado" }, _sum: { total: true }, _count: true }),
    ])
    const serialize = (result: typeof totals) => ({ total: result._sum.total ?? 0, count: result._count, subtotal: result._sum.subtotal ?? 0, delivery: result._sum.deliveryFee ?? 0 })
    const byDate = new Map(daily.map((day) => [day.date, day]))
    const data: RevenueData = {
      period: period as RevenuePeriod, range, totals: serialize(totals), previous: serialize(previous),
      daily: dates.map((date) => byDate.get(date) ?? { date, total: 0, count: 0 }),
      payments: payments.map((entry) => ({ name: entry.paymentMethod || "Não informado", total: entry._sum.total ?? 0, count: entry._count })).sort((a, b) => b.total - a.total || a.name.localeCompare(b.name, "pt-BR")),
      canceled: { total: canceled._sum.total ?? 0, count: canceled._count }, updatedAt: now.toISOString(),
    }
    if (query.get("format") === "csv") {
      return new Response(revenueCsv(data), { headers: {
        "Content-Type": "text/csv; charset=utf-8",
        "Content-Disposition": `attachment; filename="faturamento-${range.from}-${range.to}.csv"`,
        "Cache-Control": "no-store",
      } })
    }
    return NextResponse.json(data, { headers: { "Cache-Control": "no-store" } })
  } catch (error) {
    console.error("API GET /api/orders/revenue error:", error)
    return NextResponse.json({ error: "Não foi possível carregar o faturamento." }, { status: 500 })
  }
}
