import { NextResponse } from "next/server"
import { prisma } from "@/lib/db"
import { REVENUE_PERIODS, revenueRange } from "@/lib/admin-revenue"

export async function GET() {
  try {
    const now = new Date()
    const entries = await Promise.all(REVENUE_PERIODS.filter((period) => period.id !== "personalizado").map(async ({ id }) => {
      const { start, end } = revenueRange(id, now)
      const aggregate = await prisma.order.aggregate({ where: { createdAt: { gte: start, lt: end }, status: { not: "cancelado" } }, _sum: { total: true }, _count: true })
      return [id, { total: aggregate._sum.total ?? 0, count: aggregate._count }]
    }))
    return NextResponse.json(Object.fromEntries(entries), { headers: { "Cache-Control": "no-store" } })
  } catch (error) {
    console.error("API GET /api/orders/summary error:", error)
    return NextResponse.json({ error: "Não foi possível carregar o resumo." }, { status: 500 })
  }
}
