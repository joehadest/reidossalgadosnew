"use client"

import { useEffect, useRef, useState, type FormEvent } from "react"
import {
  ArrowUpRight,
  CalendarDays,
  Check,
  CircleAlert,
  Clock3,
  Copy,
  Globe2,
  Info,
  Loader2,
  Moon,
  RotateCcw,
  Save,
  ShieldCheck,
  Smartphone,
  Sun,
} from "lucide-react"
import { toast } from "sonner"
import { useAdmin } from "@/lib/admin-context"
import { WEEK_DAYS, normalizeStoreHours, type StoreHourEntry } from "@/lib/store-hours"
import { businessDate, STORE_TIME_ZONE, storeOpeningInfo } from "@/lib/admin-dashboard"
import {
  applyHoursToDays,
  hourLabels,
  hoursDuration,
  intervalMinutes,
  weekHoursSchema,
  weekMinutes,
} from "@/lib/hours-management"
import {
  AlertDialog,
  AlertDialogContent,
  AlertDialogTitle,
  AlertDialogDescription,
  AlertDialogCancel,
} from "@/components/ui/alert-dialog"
import type { StoreNavigationGuard } from "./store-info-section"
import { HoursBulkDialog } from "./hours-bulk-dialog"

const primary =
  "flex min-h-11 items-center justify-center gap-2 whitespace-nowrap rounded-xl bg-primary px-2 text-xs font-semibold text-primary-foreground transition-colors hover:bg-primary/90 disabled:cursor-not-allowed disabled:opacity-40 sm:px-4 sm:text-sm"
const secondary =
  "orders-button flex min-h-11 items-center justify-center gap-2 rounded-xl border border-border px-3 text-xs font-semibold disabled:cursor-not-allowed disabled:opacity-40"
const cloneHours = (hours: StoreHourEntry[]) => hours.map((entry) => ({ ...entry }))

export function HoursSection({
  onRegisterGuard,
}: {
  onRegisterGuard?: (guard: StoreNavigationGuard) => void
}) {
  const { store, updateHours } = useAdmin()
  const [baseline, setBaseline] = useState(() => normalizeStoreHours(store.hours))
  const [hours, setHours] = useState(() => normalizeStoreHours(store.hours))
  const baselineRef = useRef(baseline)
  const [now, setNow] = useState(() => new Date())
  const [saving, setSaving] = useState(false)
  const savingRef = useRef(false)
  const allowLeave = useRef(false)
  const [savedAt, setSavedAt] = useState<Date | null>(null)
  const [errors, setErrors] = useState<Record<string, string>>({})
  const [saveError, setSaveError] = useState("")
  const saveErrorTarget = useRef<HTMLDivElement>(null)
  const [bulk, setBulk] = useState(false)
  const [announcement, setAnnouncement] = useState("")
  const [pendingKind, setPendingKind] = useState<"reset" | "leave">("reset")
  const [pending, setPending] = useState<{ kind: "reset" | "leave"; proceed: () => void } | null>(null)
  const returnTarget = useRef<HTMLElement | null>(null)
  const bulkTarget = useRef<HTMLButtonElement>(null)
  const heading = useRef<HTMLHeadingElement>(null)
  const configured = WEEK_DAYS.every((day) => store.hours.some((entry) => entry.day === day))
  const dirty = hours.some(
    (entry, index) =>
      entry.open !== baseline[index].open ||
      entry.close !== baseline[index].close ||
      !!entry.closed !== !!baseline[index].closed,
  )
  const changed = hours.filter(
    (entry, index) =>
      entry.open !== baseline[index].open ||
      entry.close !== baseline[index].close ||
      !!entry.closed !== !!baseline[index].closed,
  ).length
  const drafted = dirty || !configured
  const today = ["Domingo", "Segunda", "Terca", "Quarta", "Quinta", "Sexta", "Sabado"][
    new Date(`${businessDate(now)}T12:00:00Z`).getUTCDay()
  ]
  const opening = storeOpeningInfo(store.hours.length ? normalizeStoreHours(store.hours) : [], now)
  const openDays = hours.filter((entry) => !entry.closed).length
  const overnight = hours.filter(
    (entry) => !entry.closed && intervalMinutes(entry) !== null && entry.close < entry.open,
  ).length
  const invalid = hours.some((entry) => !entry.closed && intervalMinutes(entry) === null)
  const stats = [
    {
      label: "Dias de atendimento",
      value: `${openDays} / 7`,
      help: "Na programação da semana",
      Icon: CalendarDays,
      tone: "bg-primary/10 text-primary",
    },
    {
      label: "Dias fechados",
      value: String(7 - openDays).padStart(2, "0"),
      help: "Dias sem abrir a loja",
      Icon: Moon,
      tone: "bg-sky-400/10 text-sky-300",
    },
    {
      label: "Horas por semana",
      value: invalid ? "—" : hoursDuration(weekMinutes(hours)),
      help: invalid ? "Complete os horários para calcular" : "Tempo total de atendimento",
      Icon: Clock3,
      tone: "bg-emerald-400/10 text-emerald-300",
    },
    {
      label: "Após a meia-noite",
      value: String(overnight).padStart(2, "0"),
      help: "Turnos que terminam no dia seguinte",
      Icon: Moon,
      tone: "bg-violet-400/10 text-violet-300",
    },
  ]

  useEffect(() => {
    const previous = baselineRef.current
    const next = normalizeStoreHours(store.hours)
    setHours((draft) =>
      draft.every(
        (entry, index) =>
          entry.open === previous[index].open &&
          entry.close === previous[index].close &&
          !!entry.closed === !!previous[index].closed,
      )
        ? cloneHours(next)
        : draft,
    )
    baselineRef.current = next
    setBaseline(next)
  }, [store.hours])
  useEffect(() => {
    const interval = setInterval(() => setNow(new Date()), 30000)
    const onVisible = () => {
      if (!document.hidden) setNow(new Date())
    }
    document.addEventListener("visibilitychange", onVisible)
    return () => {
      clearInterval(interval)
      document.removeEventListener("visibilitychange", onVisible)
    }
  }, [])
  useEffect(() => {
    if (saveError) saveErrorTarget.current?.focus()
  }, [saveError])
  function requestLeave(proceed: () => void) {
    if (savingRef.current) {
      toast.info("Aguarde o salvamento terminar.")
      return
    }
    returnTarget.current = document.activeElement instanceof HTMLElement ? document.activeElement : null
    setPendingKind("leave")
    setPending({ kind: "leave", proceed })
  }
  useEffect(() => {
    onRegisterGuard?.(dirty || saving ? requestLeave : null)
    return () => onRegisterGuard?.(null)
  }, [dirty, saving, onRegisterGuard])
  useEffect(() => {
    if (!dirty && !saving) return
    function beforeUnload(event: BeforeUnloadEvent) {
      if (allowLeave.current) return
      event.preventDefault()
      event.returnValue = ""
    }
    function protectLink(event: MouseEvent) {
      if (
        event.defaultPrevented ||
        event.button !== 0 ||
        event.ctrlKey ||
        event.metaKey ||
        event.shiftKey ||
        event.altKey
      )
        return
      const link = event.target instanceof Element ? event.target.closest<HTMLAnchorElement>("a[href]") : null
      if (!link || link.target === "_blank" || link.hasAttribute("download")) return
      const destination = new URL(link.href)
      if (
        !["http:", "https:"].includes(destination.protocol) ||
        (destination.origin === location.origin &&
          destination.pathname === location.pathname &&
          destination.search === location.search)
      )
        return
      event.preventDefault()
      event.stopPropagation()
      requestLeave(() => {
        allowLeave.current = true
        window.location.assign(destination.href)
      })
    }
    window.addEventListener("beforeunload", beforeUnload)
    document.addEventListener("click", protectLink, true)
    return () => {
      window.removeEventListener("beforeunload", beforeUnload)
      document.removeEventListener("click", protectLink, true)
    }
  }, [dirty, saving])

  function change(index: number, field: "open" | "close" | "closed", value: string | boolean) {
    if (savingRef.current) return
    allowLeave.current = false
    setHours((draft) =>
      draft.map((entry, position) => (position === index ? { ...entry, [field]: value } : entry)),
    )
    setErrors((previous) =>
      Object.fromEntries(Object.entries(previous).filter(([key]) => !key.startsWith(`${index}-`))),
    )
    setSaveError("")
    setSavedAt(null)
  }
  function requestReset() {
    returnTarget.current = document.activeElement instanceof HTMLElement ? document.activeElement : null
    setPendingKind("reset")
    setPending({
      kind: "reset",
      proceed: () => {
        setHours(cloneHours(baseline))
        setErrors({})
        setSaveError("")
        setAnnouncement("Alterações descartadas. A semana voltou aos horários salvos.")
      },
    })
  }
  async function submit(event: FormEvent) {
    event.preventDefault()
    if (savingRef.current || (!dirty && configured)) return
    setSaveError("")
    const parsed = weekHoursSchema.safeParse(hours)
    if (!parsed.success) {
      const next: Record<string, string> = {}
      for (const issue of parsed.error.issues) {
        const key = `${issue.path[0]}-${issue.path[1]}`
        if (!next[key]) next[key] = issue.message
      }
      setErrors(next)
      document
        .getElementById(`hours-${parsed.error.issues[0].path[0]}-${parsed.error.issues[0].path[1]}`)
        ?.focus()
      return
    }
    setErrors({})
    savingRef.current = true
    setSaving(true)
    try {
      const saved = await updateHours(parsed.data, baseline)
      const canonical = normalizeStoreHours(saved)
      baselineRef.current = canonical
      setBaseline(canonical)
      setHours(cloneHours(canonical))
      setSavedAt(new Date())
      setAnnouncement("Horários da semana salvos.")
      toast.success("Horários de funcionamento atualizados.")
    } catch (cause) {
      setSaveError(
        cause instanceof Error ? cause.message : "Não foi possível salvar. Suas alterações continuam aqui.",
      )
    } finally {
      savingRef.current = false
      setSaving(false)
    }
  }

  return (
    <div className="hours-section flex flex-col gap-6">
      <header className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="mb-2 text-[10px] font-semibold uppercase tracking-[0.2em] text-primary">
            O ritmo da sua loja
          </p>
          <h1
            ref={heading}
            tabIndex={-1}
            className="font-display text-3xl font-bold tracking-tight outline-none sm:text-4xl"
          >
            Horários<span className="text-primary">.</span>
          </h1>
          <p className="mt-2 max-w-xl text-sm leading-relaxed text-muted-foreground">
            Defina quando sua loja atende e mantenha seus clientes bem informados.
          </p>
        </div>
        <button
          ref={bulkTarget}
          disabled={saving}
          onClick={() => setBulk(true)}
          className={`${secondary} shrink-0`}
        >
          <Copy aria-hidden="true" className="h-4 w-4 text-primary" />
          Aplicar em vários dias
        </button>
      </header>
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        {stats.map(({ label, value, help, Icon, tone }) => (
          <section
            key={label}
            aria-label={label}
            className="dashboard-panel min-w-0 rounded-2xl border border-border bg-card p-4 sm:p-5"
          >
            <span className={`mb-4 flex h-9 w-9 items-center justify-center rounded-xl ${tone}`}>
              <Icon aria-hidden="true" className="h-4 w-4" />
            </span>
            <p className="text-xs font-medium text-muted-foreground">{label}</p>
            <p className="mt-2 break-words font-display text-2xl font-bold tracking-tight tabular-nums sm:text-[30px]">
              {value}
            </p>
            <p className="mt-2 text-[11px] leading-relaxed text-muted-foreground">{help}</p>
          </section>
        ))}
      </div>
      <form onSubmit={submit} noValidate className="flex min-w-0 flex-col gap-6">
        <div className="grid items-start gap-6 xl:grid-cols-[minmax(0,1fr)_300px]">
          <section
            aria-labelledby="hours-week-title"
            className="dashboard-panel min-w-0 overflow-hidden rounded-2xl border border-border bg-card"
          >
            <header className="flex flex-wrap items-start justify-between gap-3 border-b border-border p-5 sm:p-6">
              <div>
                <h2 id="hours-week-title" className="font-display text-lg font-bold">
                  Programação da semana
                </h2>
                <p className="mt-1 text-xs leading-relaxed text-muted-foreground">
                  Ative os dias de atendimento e ajuste a abertura e o fechamento.
                </p>
              </div>
              <span
                className={`flex items-center gap-1.5 rounded-lg border px-2.5 py-1.5 text-[10px] font-semibold ${drafted ? "border-primary/25 bg-primary/10 text-primary" : "border-border bg-secondary/40 text-muted-foreground"}`}
              >
                {drafted ? <PencilIndicator /> : <Check aria-hidden="true" className="h-3 w-3" />}
                {drafted ? "Rascunho" : "Horários salvos"}
              </span>
            </header>
            <fieldset disabled={saving} className="min-w-0">
              <legend className="sr-only">Dias e intervalos de atendimento</legend>
              <ul className="divide-y divide-border">
                {hours.map((entry, index) => {
                  const duration = intervalMinutes(entry)
                  const dayError = errors[`${index}-open`] || errors[`${index}-close`]
                  const isToday = today === entry.day
                  return (
                    <li
                      key={entry.day}
                      className={`grid grid-cols-[minmax(0,1fr)_44px] items-center gap-x-4 gap-y-3 px-5 py-4 sm:grid-cols-[minmax(140px,1fr)_minmax(240px,1.35fr)_44px] sm:px-6 ${entry.closed ? "bg-secondary/15" : ""}`}
                    >
                      <div className="flex min-w-0 items-center gap-3">
                        <span
                          className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-xl ${entry.closed ? "bg-secondary text-muted-foreground" : isToday ? "bg-primary/10 text-primary" : "border border-border bg-secondary/40 text-muted-foreground"}`}
                        >
                          {entry.closed ? (
                            <Moon aria-hidden="true" className="h-4 w-4" />
                          ) : (
                            <Sun aria-hidden="true" className="h-4 w-4" />
                          )}
                        </span>
                        <div className="min-w-0">
                          <div className="flex flex-wrap items-center gap-1.5">
                            <h3 className="text-xs font-semibold sm:text-sm">{hourLabels[entry.day]}</h3>
                            {isToday && (
                              <span className="rounded bg-primary/10 px-1.5 py-0.5 text-[9px] font-semibold text-primary">
                                Hoje
                              </span>
                            )}
                          </div>
                          <p
                            className={`mt-1 text-[11px] ${entry.closed ? "text-muted-foreground" : "text-emerald-300"}`}
                          >
                            {entry.closed ? "Fechado" : "Dia de atendimento"}
                          </p>
                        </div>
                      </div>
                      <button
                        type="button"
                        role="switch"
                        aria-checked={!entry.closed}
                        aria-label={`Atendimento em ${hourLabels[entry.day]}`}
                        aria-describedby={`hours-${index}-description`}
                        onClick={() => change(index, "closed", !entry.closed)}
                        className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl disabled:opacity-40 sm:order-3"
                      >
                        <span
                          className={`flex h-6 w-10 items-center rounded-full border px-0.5 transition-colors ${entry.closed ? "border-border bg-secondary" : "border-primary/50 bg-primary"}`}
                        >
                          <span
                            className={`h-4 w-4 rounded-full shadow-sm transition-transform ${entry.closed ? "translate-x-0 bg-muted-foreground" : "translate-x-4 bg-primary-foreground"}`}
                          />
                        </span>
                      </button>
                      <div className="col-span-2 min-w-0 sm:order-2 sm:col-span-1">
                        <div className={`grid min-w-0 grid-cols-2 gap-3 ${entry.closed ? "opacity-40" : ""}`}>
                          {(["open", "close"] as const).map((field) => (
                            <div key={field} className="min-w-0">
                              <label
                                htmlFor={`hours-${index}-${field}`}
                                className="mb-1.5 block text-[10px] font-medium text-muted-foreground"
                              >
                                <span aria-hidden="true">{field === "open" ? "Abre às" : "Fecha às"}</span>
                                <span className="sr-only">
                                  {field === "open" ? "Abertura" : "Fechamento"} de {hourLabels[entry.day]}
                                </span>
                              </label>
                              <input
                                id={`hours-${index}-${field}`}
                                type="time"
                                step={60}
                                disabled={saving || !!entry.closed}
                                value={entry[field]}
                                onInput={(event) => change(index, field, event.currentTarget.value)}
                                aria-invalid={!!errors[`${index}-${field}`]}
                                aria-describedby={`hours-${index}-description${dayError ? ` hours-${index}-error` : ""}`}
                                className={`min-h-11 w-full min-w-0 rounded-xl border bg-background px-2 text-base tabular-nums [color-scheme:dark] sm:text-sm ${errors[`${index}-${field}`] ? "border-red-400/60" : "border-border"}`}
                              />
                            </div>
                          ))}
                        </div>
                        <p
                          id={`hours-${index}-description`}
                          className="mt-1.5 flex items-start gap-1.5 text-[10px] leading-relaxed text-muted-foreground"
                        >
                          {entry.closed ? (
                            "Horários preservados para quando reabrir este dia."
                          ) : duration === null ? (
                            "Informe um intervalo de atendimento."
                          ) : (
                            <>
                              {entry.close < entry.open && (
                                <Moon aria-hidden="true" className="h-3 w-3 shrink-0 text-violet-300" />
                              )}
                              {hoursDuration(duration)} de atendimento
                              {entry.close < entry.open ? " · fecha no dia seguinte" : ""}
                            </>
                          )}
                        </p>
                        {dayError && (
                          <p id={`hours-${index}-error`} role="alert" className="mt-2 text-xs text-red-300">
                            {dayError}
                          </p>
                        )}
                      </div>
                    </li>
                  )
                })}
              </ul>
            </fieldset>
            <footer className="flex items-start gap-2 border-t border-border bg-secondary/20 px-5 py-4 text-[11px] leading-relaxed text-muted-foreground sm:px-6">
              <Globe2 aria-hidden="true" className="mt-0.5 h-4 w-4 shrink-0" />
              Todos os horários seguem o horário de Brasília.
            </footer>
          </section>
          <aside className="grid min-w-0 gap-5 md:grid-cols-2 xl:grid-cols-1">
            <section
              aria-labelledby="hours-now-title"
              className="dashboard-panel min-w-0 rounded-2xl border border-border bg-card p-5"
            >
              <div className="flex items-center gap-2 text-primary">
                <Clock3 aria-hidden="true" className="h-4 w-4" />
                <p className="text-[10px] font-semibold uppercase tracking-[0.18em]">Programação publicada</p>
              </div>
              <h2 id="hours-now-title" className="mt-3 font-display text-lg font-bold">
                Agora na loja
              </h2>
              <p className="mt-2 text-xs capitalize text-muted-foreground">
                {new Intl.DateTimeFormat("pt-BR", {
                  timeZone: STORE_TIME_ZONE,
                  weekday: "long",
                  day: "2-digit",
                  month: "short",
                }).format(now)}
                <span className="mx-1.5">·</span>
                {new Intl.DateTimeFormat("pt-BR", {
                  timeZone: STORE_TIME_ZONE,
                  hour: "2-digit",
                  minute: "2-digit",
                }).format(now)}
              </p>
              <div className="mt-5 rounded-xl border border-border bg-background p-4">
                <span
                  className={`inline-flex items-center gap-2 rounded-lg border px-2.5 py-1.5 text-xs font-semibold ${opening.open ? "border-emerald-400/20 bg-emerald-400/10 text-emerald-300" : "border-border bg-secondary text-muted-foreground"}`}
                >
                  <span
                    className={`h-1.5 w-1.5 rounded-full ${opening.open ? "bg-emerald-300" : "bg-muted-foreground"}`}
                  />
                  {opening.open ? "Aberta agora" : "Fechada agora"}
                </span>
                <p className="mt-3 text-sm font-semibold">
                  {!store.hours.length
                    ? "Horários ainda não publicados"
                    : opening.open
                      ? `Atendimento até ${opening.closesAt}`
                      : opening.schedule?.closed
                        ? "Hoje é um dia de folga"
                        : opening.schedule
                          ? `${opening.schedule.open} às ${opening.schedule.close}${opening.schedule.close < opening.schedule.open ? " · dia seguinte" : ""}`
                          : "Sem horário para hoje"}
                </p>
                <p className="mt-2 text-[11px] leading-relaxed text-muted-foreground">
                  {opening.open &&
                  opening.closesAt &&
                  opening.schedule?.open &&
                  opening.closesAt < opening.schedule.open &&
                  opening.closesAt === opening.schedule.close
                    ? "O fechamento ocorre após a meia-noite."
                    : "Status baseado nos horários salvos."}
                </p>
              </div>
              {dirty && (
                <p className="mt-4 flex items-start gap-2 text-[11px] leading-relaxed text-primary">
                  <Info aria-hidden="true" className="mt-0.5 h-3.5 w-3.5 shrink-0" />O rascunho ainda não
                  altera o atendimento da loja.
                </p>
              )}
            </section>
            <section
              aria-labelledby="hours-preview-title"
              className="dashboard-panel min-w-0 rounded-2xl border border-border bg-card p-5"
            >
              <div className="flex items-center gap-2 text-primary">
                <Smartphone aria-hidden="true" className="h-4 w-4" />
                <p className="text-[10px] font-semibold uppercase tracking-[0.18em]">Visão do cliente</p>
              </div>
              <div className="mt-3 flex flex-wrap items-center justify-between gap-2">
                <h2 id="hours-preview-title" className="font-display text-lg font-bold">
                  Sua semana
                </h2>
                {drafted && <span className="text-[10px] text-primary">Prévia do rascunho</span>}
              </div>
              <p className="mt-1.5 text-xs leading-relaxed text-muted-foreground">
                Confira o atendimento antes de publicar.
              </p>
              <ul className="mt-4 divide-y divide-border">
                {hours.map((entry) => (
                  <li key={entry.day} className="flex items-start justify-between gap-3 py-3 text-xs">
                    <span
                      className={
                        today === entry.day ? "font-semibold text-foreground" : "text-muted-foreground"
                      }
                    >
                      {hourLabels[entry.day].replace("-feira", "")}
                    </span>
                    <span
                      className={`text-right tabular-nums ${entry.closed ? "text-muted-foreground" : "font-medium"}`}
                    >
                      {entry.closed ? (
                        "Fechado"
                      ) : intervalMinutes(entry) === null ? (
                        "A completar"
                      ) : (
                        <>
                          {entry.open} – {entry.close}
                          {entry.close < entry.open && (
                            <span className="mt-1 block text-[10px] text-violet-300">dia seguinte</span>
                          )}
                        </>
                      )}
                    </span>
                  </li>
                ))}
              </ul>
            </section>
            <section
              aria-labelledby="hours-notes-title"
              className="rounded-2xl border border-primary/15 bg-primary/[0.035] p-5 md:col-span-2 xl:col-span-1"
            >
              <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-primary/10 text-primary">
                <ShieldCheck aria-hidden="true" className="h-4 w-4" />
              </span>
              <h2 id="hours-notes-title" className="mt-4 font-display text-base font-bold">
                Uma semana bem organizada
              </h2>
              <p className="mt-3 text-xs leading-relaxed text-muted-foreground">
                Fechar um dia preserva seu intervalo. Se o fechamento vier antes da abertura, o atendimento
                termina no dia seguinte.
              </p>
              <a
                href="/"
                target="_blank"
                rel="noopener noreferrer"
                className="mt-4 flex min-h-11 items-center justify-between gap-3 rounded-xl border border-primary/20 px-3 text-xs font-semibold text-primary hover:bg-primary/10"
              >
                Visualizar loja<span className="sr-only"> (abre em nova aba)</span>
                <ArrowUpRight aria-hidden="true" className="h-4 w-4" />
              </a>
            </section>
          </aside>
        </div>
        {saveError && (
          <div
            ref={saveErrorTarget}
            tabIndex={-1}
            role="alert"
            className="flex items-start gap-2 rounded-xl border border-red-400/20 bg-red-400/10 p-4 text-sm text-red-300 outline-none"
          >
            <CircleAlert aria-hidden="true" className="mt-0.5 h-4 w-4 shrink-0" />
            {saveError}
          </div>
        )}
        <footer className="sticky bottom-0 z-20 flex flex-col gap-3 rounded-2xl border border-border bg-card p-4 pb-[max(1rem,env(safe-area-inset-bottom))] shadow-[0_-8px_30px_rgba(0,0,0,0.2)] sm:flex-row sm:items-center sm:justify-between sm:p-5">
          <div role="status" aria-live="polite" className="flex items-start gap-2">
            <span
              className={`mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-lg ${drafted ? "bg-primary/10 text-primary" : "bg-emerald-400/10 text-emerald-300"}`}
            >
              {drafted ? (
                <Clock3 aria-hidden="true" className="h-3.5 w-3.5" />
              ) : (
                <Check aria-hidden="true" className="h-3.5 w-3.5" />
              )}
            </span>
            <div>
              <p className="text-xs font-semibold">
                {saving
                  ? "Salvando a semana…"
                  : dirty
                    ? `${changed} ${changed === 1 ? "dia com alterações" : "dias com alterações"}`
                    : configured
                      ? "Tudo em dia"
                      : "Configure sua semana"}
              </p>
              <p className="mt-1 text-[11px] text-muted-foreground">
                {dirty
                  ? "Salve para atualizar o atendimento da loja."
                  : savedAt
                    ? `Salvo às ${new Intl.DateTimeFormat("pt-BR", { timeZone: STORE_TIME_ZONE, hour: "2-digit", minute: "2-digit" }).format(savedAt)}.`
                    : configured
                      ? "Seus horários estão sincronizados."
                      : "Salve para publicar os horários."}
              </p>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3 sm:flex">
            <button type="button" disabled={saving || !dirty} onClick={requestReset} className={secondary}>
              <RotateCcw aria-hidden="true" className="h-4 w-4" />
              Descartar
            </button>
            <button type="submit" disabled={saving || (!dirty && configured)} className={primary}>
              {saving ? (
                <Loader2 aria-hidden="true" className="h-4 w-4 animate-spin" />
              ) : (
                <Save aria-hidden="true" className="h-4 w-4" />
              )}
              {saving ? "Salvando…" : "Salvar semana"}
            </button>
          </div>
        </footer>
      </form>
      <p role="status" aria-live="polite" className="sr-only">
        {announcement}
      </p>
      {bulk && (
        <HoursBulkDialog
          initial={
            hours.find((entry) => !entry.closed && intervalMinutes(entry) !== null) ?? {
              day: "Segunda",
              open: "15:30",
              close: "21:00",
            }
          }
          onClose={() => setBulk(false)}
          onReturnFocus={() => bulkTarget.current?.focus()}
          onApply={(days, open, close) => {
            setHours((draft) => applyHoursToDays(draft, days, open, close))
            setErrors({})
            setSaveError("")
            setSavedAt(null)
            setBulk(false)
            setAnnouncement(
              `Horário aplicado a ${days.length} ${days.length === 1 ? "dia" : "dias"}. Salve a semana para publicar.`,
            )
          }}
        />
      )}
      <AlertDialog
        open={!!pending}
        onOpenChange={(open) => {
          if (!open) setPending(null)
        }}
      >
        <AlertDialogContent
          className="admin-menu-dialog max-h-[90dvh] w-[calc(100%-2rem)] overflow-y-auto rounded-2xl bg-card p-5 sm:p-6"
          onCloseAutoFocus={(event) => {
            event.preventDefault()
            const target = returnTarget.current
            ;(target?.isConnected && !target.matches(":disabled") && target.getClientRects().length
              ? target
              : heading.current
            )?.focus()
          }}
        >
          <AlertDialogTitle>
            {pendingKind === "leave" ? "Sair sem salvar?" : "Descartar alterações?"}
          </AlertDialogTitle>
          <AlertDialogDescription>
            As mudanças nos horários ainda não foram salvas.{" "}
            {pendingKind === "leave"
              ? "Se continuar, elas serão descartadas."
              : "A semana voltará aos horários publicados."}
          </AlertDialogDescription>
          <div className="grid grid-cols-2 gap-3">
            <AlertDialogCancel className="m-0 min-h-11 rounded-xl border-border bg-transparent px-2 text-xs">
              Continuar editando
            </AlertDialogCancel>
            <button
              onClick={() => {
                const action = pending
                setPending(null)
                if (action?.kind === "leave") allowLeave.current = true
                action?.proceed()
              }}
              className="min-h-11 rounded-xl bg-destructive px-2 text-xs font-semibold text-destructive-foreground"
            >
              {pendingKind === "leave" ? "Descartar e sair" : "Descartar alterações"}
            </button>
          </div>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}

function PencilIndicator() {
  return <span aria-hidden="true" className="h-1.5 w-1.5 rounded-full bg-primary" />
}
