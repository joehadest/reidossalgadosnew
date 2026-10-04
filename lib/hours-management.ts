import { z } from "zod"
import { WEEK_DAYS, normalizeStoreHours, type StoreHourEntry } from "./store-hours"

export const hourLabels: Record<string, string> = {
  Segunda: "Segunda-feira",
  Terca: "Terça-feira",
  Quarta: "Quarta-feira",
  Quinta: "Quinta-feira",
  Sexta: "Sexta-feira",
  Sabado: "Sábado",
  Domingo: "Domingo",
}
const time = z.string().regex(/^$|^([01]\d|2[0-3]):[0-5]\d$/, "Use um horário válido, entre 00:00 e 23:59.")
const baseEntry = z
  .object({
    day: z.enum(WEEK_DAYS),
    open: time.optional(),
    close: time.optional(),
    closed: z.boolean().optional(),
  })
  .strict()
function validateInterval(entry: z.infer<typeof baseEntry>, ctx: z.RefinementCtx) {
  if (entry.closed) return
  if (entry.open === "")
    ctx.addIssue({ code: "custom", path: ["open"], message: "Informe o horário de abertura." })
  if (entry.close === "")
    ctx.addIssue({ code: "custom", path: ["close"], message: "Informe o horário de fechamento." })
  if ((entry.open ?? "15:30") === (entry.close ?? "21:00"))
    ctx.addIssue({
      code: "custom",
      path: ["close"],
      message: "A abertura e o fechamento devem ser diferentes.",
    })
}
export const storeHoursEntrySchema = baseEntry.superRefine(validateInterval)
export const weekHoursSchema = z
  .array(baseEntry.required({ open: true, close: true }).superRefine(validateInterval))
  .length(7, "Informe os sete dias da semana.")
  .refine((hours) => new Set(hours.map((entry) => entry.day)).size === 7, "Há dias da semana repetidos.")
  .transform(normalizeStoreHours)
// Keep the exact saved snapshot, including legacy blank values, for concurrency checks.
export const previousHoursSchema = z
  .array(
    z
      .object({
        day: z.enum(WEEK_DAYS),
        open: z.string().max(5),
        close: z.string().max(5),
        closed: z.boolean().optional(),
      })
      .strict(),
  )
  .max(7)
  .refine(
    (hours) => new Set(hours.map((entry) => entry.day)).size === hours.length,
    "Há dias repetidos no horário anterior.",
  )
export function sameHours(a: StoreHourEntry[], b: StoreHourEntry[]) {
  return JSON.stringify(normalizeStoreHours(a)) === JSON.stringify(normalizeStoreHours(b))
}
export function intervalMinutes(entry: StoreHourEntry) {
  if (
    entry.closed ||
    !/^([01]\d|2[0-3]):[0-5]\d$/.test(entry.open) ||
    !/^([01]\d|2[0-3]):[0-5]\d$/.test(entry.close)
  )
    return null
  const minutes = (value: string) => Number(value.slice(0, 2)) * 60 + Number(value.slice(3))
  const start = minutes(entry.open),
    end = minutes(entry.close)
  return start === end ? null : (end - start + 1440) % 1440
}
export function hoursDuration(minutes: number) {
  const hours = Math.floor(minutes / 60),
    remainder = minutes % 60
  return `${hours}h${remainder ? ` ${String(remainder).padStart(2, "0")}min` : ""}`
}
export function weekMinutes(hours: StoreHourEntry[]) {
  const spans: [number, number][] = []
  for (const entry of hours) {
    const duration = intervalMinutes(entry)
    const day = WEEK_DAYS.indexOf(entry.day as (typeof WEEK_DAYS)[number])
    if (duration === null || day < 0) continue
    const start = day * 1440 + Number(entry.open.slice(0, 2)) * 60 + Number(entry.open.slice(3))
    const end = start + duration
    spans.push([start, Math.min(end, 10080)])
    if (end > 10080) spans.push([0, end - 10080])
  }
  spans.sort((a, b) => a[0] - b[0])
  let total = 0,
    until = 0
  for (const [start, end] of spans) {
    total += Math.max(0, end - Math.max(start, until))
    until = Math.max(until, end)
  }
  return total
}
export function applyHoursToDays(hours: StoreHourEntry[], days: string[], open: string, close: string) {
  return hours.map((entry) =>
    days.includes(entry.day) ? { ...entry, open, close, closed: false } : { ...entry },
  )
}
