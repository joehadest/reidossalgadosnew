import { NextResponse } from "next/server"
import { prisma } from "@/lib/db"
import {
  startOfDay,
  endOfDay,
  subDays,
  startOfWeek,
  startOfMonth,
  endOfMonth,
  subMonths,
} from "date-fns"

const PERIODS = ["hoje", "ontem", "semana", "mes", "mes-anterior"] as const
type Period = (typeof PERIODS)[number]

function getRange(period: Period, now: Date): { gte: Date; lte: Date } {
  switch (period) {
    case "hoje":
      return { gte: startOfDay(now), lte: endOfDay(now) }
    case "ontem": {
      const yesterday = subDays(now, 1)
      return { gte: startOfDay(yesterday), lte: endOfDay(yesterday) }
    }
    case "semana":
      return { gte: startOfWeek(now, { weekStartsOn: 1 }), lte: endOfDay(now) }
    case "mes":
      return { gte: startOfMonth(now), lte: endOfDay(now) }
    case "mes-anterior": {
      const prevMonth = subMonths(now, 1)
      return { gte: startOfMonth(prevMonth), lte: endOfMonth(prevMonth) }
    }
  }
}

export async function GET() {
  try {
    const now = new Date()

    const entries = await Promise.all(
      PERIODS.map(async (period) => {
        const { gte, lte } = getRange(period, now)
        const where = {
          createdAt: { gte, lte },
          status: { not: "cancelado" },
        }

        const [aggregate, count] = await Promise.all([
          prisma.order.aggregate({ where, _sum: { total: true } }),
          prisma.order.count({ where }),
        ])

        return [period, { total: aggregate._sum.total ?? 0, count }] as const
      })
    )

    return NextResponse.json(Object.fromEntries(entries))
  } catch (error) {
    console.error("API GET /api/orders/summary error:", error)
    return NextResponse.json(
      { error: "Failed to fetch orders summary" },
      { status: 500 }
    )
  }
}
