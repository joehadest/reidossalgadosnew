import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/db"
import { dashboardRange, type DashboardDay } from "@/lib/admin-dashboard"

export async function GET(request: NextRequest) {
  const days = request.nextUrl.searchParams.get("days") === "30" ? 30 : 7
  const now = new Date()
  const { start, previousStart, end, dates } = dashboardRange(days, now)
  try {
    const [daily, previous, statuses, recentOrders] = await Promise.all([
      // Prisma DateTime columns are UTC timestamps without a time zone.
      // Aggregate here instead of transferring every order for a busy month.
      prisma.$queryRaw<DashboardDay[]>`
        SELECT to_char(created_at AT TIME ZONE 'UTC' AT TIME ZONE 'America/Sao_Paulo', 'YYYY-MM-DD') AS date,
               COALESCE(SUM(total), 0)::double precision AS total,
               COUNT(*)::integer AS count
        FROM orders
        WHERE created_at >= ${start} AND created_at < ${end} AND status <> 'cancelado'
        GROUP BY 1 ORDER BY 1
      `,
      prisma.order.aggregate({
        where: { createdAt: { gte: previousStart, lt: start }, status: { not: "cancelado" } },
        _sum: { total: true }, _count: true,
      }),
      prisma.order.groupBy({
        by: ["status"],
        where: { status: { in: ["recebido", "confirmado", "preparando", "entrega"] } },
        _count: true,
      }),
      prisma.order.findMany({
        take: 5, orderBy: { createdAt: "desc" },
        select: { id: true, name: true, total: true, status: true, createdAt: true, paymentMethod: true, neighborhood: true },
      }),
    ])
    const byDate = new Map(daily.map((day) => [day.date, day]))
    return NextResponse.json({
      days,
      daily: dates.map((date) => byDate.get(date) ?? { date, total: 0, count: 0 }),
      previous: { total: previous._sum.total ?? 0, count: previous._count },
      pending: statuses.reduce((sum, status) => sum + status._count, 0),
      received: statuses.find((status) => status.status === "recebido")?._count ?? 0,
      recentOrders, updatedAt: now.toISOString(),
    }, { headers: { "Cache-Control": "no-store" } })
  } catch (error) {
    console.error("API GET /api/orders/dashboard error:", error)
    return NextResponse.json({ error: "Não foi possível carregar o dashboard." }, { status: 500 })
  }
}
