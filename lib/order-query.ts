import type { Prisma } from "@prisma/client"
import { ORDER_STATUSES } from "./admin-orders"
import { dashboardRange } from "./admin-dashboard"

export function parseOrderQuery(params: URLSearchParams) {
  const positive = (value: string | null, fallback: number, max: number) => {
    const parsed = Number(value)
    return value && Number.isSafeInteger(parsed) && parsed > 0 ? Math.min(parsed, max) : fallback
  }
  const status = params.get("status") ?? ""
  const date = params.get("date") ?? "todos"
  return {
    page: positive(params.get("page"), 1, 100000),
    limit: positive(params.get("limit"), 50, 100),
    status: ORDER_STATUSES.some((entry) => entry.value === status) ? status : "",
    date: ["hoje", "semana", "mes"].includes(date) ? date : "todos",
    search: (params.get("q") ?? "").trim().slice(0, 100),
    newOnly: params.get("new") === "true",
    withSummary: params.get("summary") === "true",
  }
}

export function orderBaseWhere(query: ReturnType<typeof parseOrderQuery>, now = new Date()): Prisma.OrderWhereInput {
  if (query.newOnly) return { status: "recebido", createdAt: { gte: new Date(now.getTime() - 5 * 60 * 1000) } }
  const where: Prisma.OrderWhereInput = {}
  if (query.date !== "todos") {
    const { start, end } = dashboardRange(query.date === "hoje" ? 1 : query.date === "semana" ? 7 : 30, now)
    where.createdAt = { gte: start, lt: end }
  }
  if (query.search) {
    where.OR = ["name", "phone", "id", "neighborhood"].map((field) => ({
      [field]: { contains: field === "id" && query.search.startsWith("#") && query.search.length > 1 ? query.search.slice(1) : query.search, mode: "insensitive" },
    }))
    const phoneDigits = query.search.replace(/\D/g, "")
    if (phoneDigits.length >= 4 && phoneDigits !== query.search) where.OR.push({ phone: { contains: phoneDigits } })
  }
  return where
}
