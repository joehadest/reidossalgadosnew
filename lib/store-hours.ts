export interface StoreHourEntry {
  day: string
  open: string
  close: string
  closed?: boolean
}

export const WEEK_DAYS = [
  "Segunda",
  "Terca",
  "Quarta",
  "Quinta",
  "Sexta",
  "Sabado",
  "Domingo",
] as const

export const DEFAULT_WEEK_HOURS: StoreHourEntry[] = WEEK_DAYS.map((day) => ({
  day,
  open: "15:30",
  close: "21:00",
  closed: false,
}))

export function getTodayDayName(date = new Date()): string {
  const sundayFirst = ["Domingo", "Segunda", "Terca", "Quarta", "Quinta", "Sexta", "Sabado"]
  return sundayFirst[date.getDay()]
}

/** Garante os 7 dias da semana, preenchendo faltantes com valores padrão. */
export function normalizeStoreHours(hours: StoreHourEntry[]): StoreHourEntry[] {
  const byDay = new Map(hours.map((h) => [h.day, h]))

  return WEEK_DAYS.map((day) => {
    const existing = byDay.get(day)
    if (existing) {
      return {
        day,
        open: existing.open || "15:30",
        close: existing.close || "21:00",
        closed: Boolean(existing.closed),
      }
    }
    const fallback = DEFAULT_WEEK_HOURS.find((h) => h.day === day)!
    return { ...fallback }
  })
}
