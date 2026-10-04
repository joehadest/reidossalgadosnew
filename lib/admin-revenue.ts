import { businessDate } from "./admin-dashboard"

export const REVENUE_PERIODS = [
  { id: "hoje", label: "Hoje" }, { id: "ontem", label: "Ontem" },
  { id: "semana", label: "Esta semana" }, { id: "mes", label: "Este mês" },
  { id: "mes-anterior", label: "Mês anterior" }, { id: "personalizado", label: "Personalizado" },
] as const
export type RevenuePeriod = (typeof REVENUE_PERIODS)[number]["id"]
export interface RevenueTotals { total: number; count: number; subtotal: number; delivery: number }
export interface RevenueDay { date: string; total: number; count: number }
export interface RevenueData {
  period: RevenuePeriod
  range: { from: string; to: string; previousFrom: string; previousTo: string; partial: boolean; previousPartial: boolean; previousDays: number }
  totals: RevenueTotals
  previous: RevenueTotals
  daily: RevenueDay[]
  payments: { name: string; total: number; count: number }[]
  canceled: { total: number; count: number }
  updatedAt: string
}

const DAY = 86400000
const midnight = (date: string) => new Date(`${date}T00:00:00-03:00`)
const shift = (date: Date, days: number) => new Date(date.getTime() + days * DAY)
const monthStart = (date: Date, offset = 0) => {
  const [year, month] = businessDate(date).split("-").map(Number)
  return new Date(Date.UTC(year, month - 1 + offset, 1, 3))
}
function validDate(value: string | null): value is string {
  return !!value && /^\d{4}-\d{2}-\d{2}$/.test(value) && !Number.isNaN(midnight(value).getTime()) && businessDate(midnight(value)) === value
}

export function revenueRange(period: RevenuePeriod, now = new Date(), from: string | null = null, to: string | null = null) {
  const today = midnight(businessDate(now))
  let start = today
  let end = now
  let previousStart: Date
  let previousEnd: Date
  let partial = true
  let previousPartial = true
  switch (period) {
    case "hoje":
      previousStart = shift(today, -1); previousEnd = shift(now, -1)
      break
    case "ontem":
      start = shift(today, -1); end = today
      previousStart = shift(start, -1); previousEnd = start
      partial = previousPartial = false
      break
    case "semana": {
      const weekday = new Date(`${businessDate(now)}T12:00:00Z`).getUTCDay()
      start = shift(today, -((weekday + 6) % 7))
      previousStart = shift(start, -7); previousEnd = shift(now, -7)
      break
    }
    case "mes": {
      start = monthStart(today); previousStart = monthStart(today, -1)
      // Compare the same elapsed portion, capped at the previous month's end.
      const candidate = new Date(previousStart.getTime() + now.getTime() - start.getTime())
      previousEnd = new Date(Math.min(candidate.getTime(), start.getTime()))
      previousPartial = candidate < start
      break
    }
    case "mes-anterior":
      start = monthStart(today, -1); end = monthStart(today)
      previousStart = monthStart(today, -2); previousEnd = start
      partial = previousPartial = false
      break
    case "personalizado": {
      if (!validDate(from) || !validDate(to)) throw new Error("Informe duas datas válidas.")
      if (from > to) throw new Error("A data inicial deve ser anterior ou igual à final.")
      if (to > businessDate(now)) throw new Error("Escolha datas até hoje.")
      start = midnight(from)
      const fullEnd = shift(midnight(to), 1)
      const days = Math.round((fullEnd.getTime() - start.getTime()) / DAY)
      if (days > 93) throw new Error("Selecione um intervalo de até 93 dias.")
      partial = to === businessDate(now)
      end = partial ? now : fullEnd
      previousStart = shift(start, -days); previousEnd = shift(end, -days)
      previousPartial = partial
      break
    }
    default: throw new Error("Período inválido.")
  }
  const lastDate = partial ? today : shift(end, -1)
  const dates = Array.from({ length: Math.round((lastDate.getTime() - start.getTime()) / DAY) + 1 }, (_, index) => businessDate(shift(start, index)))
  const previousLast = previousPartial ? midnight(businessDate(previousEnd)) : shift(previousEnd, -1)
  return {
    start, end, previousStart, previousEnd, dates,
    range: {
      from: businessDate(start), to: businessDate(lastDate),
      previousFrom: businessDate(previousStart), previousTo: businessDate(previousLast),
      partial, previousPartial,
      previousDays: Math.round((previousLast.getTime() - previousStart.getTime()) / DAY) + 1,
    },
  }
}

export const revenueMoney = (value: number) => new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(value)
export const revenueDate = (date: string, year = false) => new Intl.DateTimeFormat("pt-BR", { day: "2-digit", month: "2-digit", ...(year ? { year: "numeric" as const } : {}), timeZone: "America/Sao_Paulo" }).format(midnight(date))
export function revenueDateRange(from: string, to: string) {
  return from === to ? revenueDate(from, true) : `${revenueDate(from, true)} a ${revenueDate(to, true)}`
}

export function revenueCsv(data: RevenueData): string {
  const number = (value: number) => value.toFixed(2).replace(".", ",")
  const totalsRow = (label: string, range: string, totals: RevenueTotals) => [label, range, totals.count, number(totals.total), number(totals.subtotal), number(totals.delivery), number(totals.count ? totals.total / totals.count : 0)]
  const rows: (string | number)[][] = [
    ["Faturamento — Rei dos Salgados"],
    ["Atualizado em (São Paulo)", new Intl.DateTimeFormat("pt-BR", { dateStyle: "short", timeStyle: "medium", timeZone: "America/Sao_Paulo" }).format(new Date(data.updatedAt))],
    ["Critério", "Vendas registradas, incluindo entrega; exclui cancelados. Períodos em andamento são apurados até o horário da atualização."],
    ["Tipo", "Data / período", "Pedidos", "Faturamento (R$)", "Produtos (R$)", "Entrega (R$)", "Ticket médio (R$)"],
    totalsRow("Período selecionado", revenueDateRange(data.range.from, data.range.to), data.totals),
    totalsRow("Comparação anterior", revenueDateRange(data.range.previousFrom, data.range.previousTo), data.previous),
    ...data.daily.map((day) => ["Diário", revenueDate(day.date, true), day.count, number(day.total), "", "", number(day.count ? day.total / day.count : 0)]),
    ...data.payments.map((payment) => ["Pagamento", payment.name, payment.count, number(payment.total)]),
    ["Cancelados (excluídos)", revenueDateRange(data.range.from, data.range.to), data.canceled.count, number(data.canceled.total)],
  ]
  const cell = (value: string | number) => {
    const text = String(value)
    const safe = /^[\s]*[=+\-@\t\r]/.test(text) ? `'${text}` : text
    return `"${safe.replace(/"/g, '""')}"`
  }
  return "\uFEFF" + rows.map((row) => row.map(cell).join(";")).join("\r\n")
}
