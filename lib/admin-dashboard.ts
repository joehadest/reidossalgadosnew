import type { StoreHourEntry } from "./store-hours"

export const STORE_TIME_ZONE = "America/Sao_Paulo"

export interface DashboardDay { date: string; total: number; count: number }
export interface DashboardOrder {
  id: string
  name: string
  total: number
  status: string
  createdAt: string
  paymentMethod: string
  neighborhood: string
}
export interface DashboardData {
  days: number
  daily: DashboardDay[]
  previous: { total: number; count: number }
  pending: number
  received: number
  recentOrders: DashboardOrder[]
  updatedAt: string
}

export function businessDate(date: Date): string {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone: STORE_TIME_ZONE, year: "numeric", month: "2-digit", day: "2-digit",
  }).formatToParts(date)
  const get = (type: string) => parts.find((part) => part.type === type)?.value
  return `${get("year")}-${get("month")}-${get("day")}`
}

export function dashboardRange(days: number, now = new Date()) {
  // The store operates in Brazil (UTC−03:00), independently of the server's zone.
  const today = new Date(`${businessDate(now)}T00:00:00-03:00`)
  const start = new Date(today)
  start.setUTCDate(start.getUTCDate() - days + 1)
  const previousStart = new Date(start)
  previousStart.setUTCDate(previousStart.getUTCDate() - days)
  const end = new Date(today)
  end.setUTCDate(end.getUTCDate() + 1)
  const dates = Array.from({ length: days }, (_, index) => {
    const date = new Date(start)
    date.setUTCDate(date.getUTCDate() + index)
    return businessDate(date)
  })
  return { start, previousStart, end, dates }
}

export function storeOpeningInfo(hours: StoreHourEntry[], now: Date) {
  const parts = new Intl.DateTimeFormat("en-US", { timeZone: STORE_TIME_ZONE, weekday: "short", hour: "2-digit", minute: "2-digit", hourCycle: "h23" }).formatToParts(now)
  const part = (type: string) => parts.find((entry) => entry.type === type)?.value
  const index = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].indexOf(part("weekday") ?? "")
  const names = ["Domingo", "Segunda", "Terca", "Quarta", "Quinta", "Sexta", "Sabado"]
  const schedule = hours.find((entry) => entry.day === names[index])
  const minutes = Number(part("hour")) * 60 + Number(part("minute"))
  const toMinutes = (time: string) => { const [h, m] = time.split(":").map(Number); return h * 60 + m }
  const yesterday = hours.find((entry) => entry.day === names[(index + 6) % 7])
  const overnight = yesterday && !yesterday.closed && toMinutes(yesterday.close) < toMinutes(yesterday.open) && minutes < toMinutes(yesterday.close)
  const open = !!(schedule && !schedule.closed && (toMinutes(schedule.close) < toMinutes(schedule.open)
    ? minutes >= toMinutes(schedule.open)
    : minutes >= toMinutes(schedule.open) && minutes < toMinutes(schedule.close))) || !!overnight
  return { schedule, open, closesAt: overnight ? yesterday.close : schedule?.close }
}
