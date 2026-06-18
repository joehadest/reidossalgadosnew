import { getTodayDayName, normalizeStoreHours } from "./store-hours"

export function getStoreStatus(
  hours: { day: string; open: string; close: string; closed?: boolean }[]
): boolean {
  if (!hours?.length) return false
  const now = new Date()
  const today = getTodayDayName(now)
  const schedule = normalizeStoreHours(hours).find((h) => h.day === today)
  if (!schedule) return false
  if (schedule.closed) return false

  const [openH, openM] = schedule.open.split(":").map(Number)
  const [closeH, closeM] = schedule.close.split(":").map(Number)
  const currentMinutes = now.getHours() * 60 + now.getMinutes()
  const openMinutes = openH * 60 + openM
  const closeMinutes = closeH * 60 + closeM

  return currentMinutes >= openMinutes && currentMinutes <= closeMinutes
}
