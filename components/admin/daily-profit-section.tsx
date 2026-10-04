"use client"

import { useEffect, useId, useState, type ReactNode } from "react"
import { Area, AreaChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts"
import {
  ArrowDownRight, ArrowUpRight, Banknote, CalendarDays, ChartNoAxesCombined,
  Check, ChevronDown, ChevronUp, CircleAlert, CreditCard, Download,
  ReceiptText, RefreshCw, ShoppingBag, Ticket, Truck, UtensilsCrossed, Wallet,
} from "lucide-react"
import { businessDate, STORE_TIME_ZONE } from "@/lib/admin-dashboard"
import {
  REVENUE_PERIODS, revenueDate, revenueDateRange, revenueMoney as money,
  revenueRange, type RevenueData, type RevenuePeriod,
} from "@/lib/admin-revenue"

function Panel({ children, className = "" }: { children: ReactNode; className?: string }) {
  return <section className={`dashboard-panel min-w-0 rounded-2xl border border-border bg-card ${className}`}>{children}</section>
}
function Skeleton({ className = "" }: { className?: string }) {
  return <span aria-hidden="true" className={`block animate-pulse rounded-lg bg-secondary ${className}`} />
}
function Change({ current, previous }: { current: number; previous: number }) {
  if (!previous) return <span className="text-xs text-muted-foreground">{current ? "Sem base anterior" : "Sem variação"}</span>
  const change = (current - previous) / previous * 100
  const Icon = change < 0 ? ArrowDownRight : ArrowUpRight
  return <span className={`inline-flex items-center gap-1 text-xs font-medium ${change < 0 ? "text-rose-300" : change > 0 ? "text-emerald-300" : "text-muted-foreground"}`}><Icon aria-hidden="true" className="h-3.5 w-3.5" />{change > 0 ? "+" : ""}{change.toLocaleString("pt-BR", { maximumFractionDigits: 1 })}%<span className="font-normal text-muted-foreground">vs. anterior</span></span>
}
const paymentColors = ["#facc15", "#60a5fa", "#a78bfa", "#34d399", "#fb923c"]
const time = (date: string) => new Intl.DateTimeFormat("pt-BR", { hour: "2-digit", minute: "2-digit", timeZone: STORE_TIME_ZONE }).format(new Date(date))

export function DailyProfitSection() {
  const [period, setPeriod] = useState<RevenuePeriod>("mes")
  const [dates, setDates] = useState(() => {
    const today = businessDate(new Date())
    return { from: `${today.slice(0, 7)}-01`, to: today }
  })
  const [appliedDates, setAppliedDates] = useState(dates)
  const [rangeError, setRangeError] = useState("")
  const [result, setResult] = useState<{ key: string; data: RevenueData } | null>(null)
  const [error, setError] = useState(false)
  const [refreshing, setRefreshing] = useState(true)
  const [retry, setRetry] = useState(0)
  const [chartMode, setChartMode] = useState<"daily" | "cumulative">("daily")
  const [showAllDays, setShowAllDays] = useState(false)
  const gradient = useId().replace(/:/g, "")
  const query = new URLSearchParams({ period })
  if (period === "personalizado") { query.set("from", appliedDates.from); query.set("to", appliedDates.to) }
  const key = query.toString()

  useEffect(() => {
    let disposed = false
    let inFlight = false
    const controller = new AbortController()
    async function load() {
      if (inFlight) return
      inFlight = true; setRefreshing(true)
      try {
        const response = await fetch(`/api/orders/revenue?${key}`, { signal: controller.signal, cache: "no-store" })
        if (!response.ok) throw new Error("Faturamento indisponível")
        const data: RevenueData = await response.json()
        if (!disposed) { setResult({ key, data }); setError(false) }
      } catch { if (!disposed) setError(true) }
      finally { inFlight = false; if (!disposed) setRefreshing(false) }
    }
    void load()
    const interval = setInterval(() => { if (!document.hidden) void load() }, 60000)
    const visible = () => { if (!document.hidden) void load() }
    document.addEventListener("visibilitychange", visible)
    return () => { disposed = true; controller.abort(); clearInterval(interval); document.removeEventListener("visibilitychange", visible) }
  }, [key, retry])

  const data = result?.key === key ? result.data : null
  const loading = !data && !error
  const selectedLabel = REVENUE_PERIODS.find((entry) => entry.id === period)?.label
  const days = data?.daily.length ?? 0
  const count = data?.totals.count ?? 0
  const total = data?.totals.total ?? 0
  const ticket = count ? total / count : 0
  const previousTicket = data?.previous.count ? data.previous.total / data.previous.count : 0
  const bestDay = data?.daily.reduce((best, day) => day.total > best.total ? day : best, data.daily[0])
  const activeDays = data?.daily.filter((day) => day.count > 0).length ?? 0
  let accumulated = 0
  const chartData = data?.daily.map((day) => { accumulated += day.total; return { ...day, cumulative: accumulated } }) ?? []
  const dailyRows = data ? [...data.daily].reverse() : []
  const metrics = [
    { label: "Faturamento total", value: money(total), icon: Wallet, accent: "bg-primary/10 text-primary", current: total, previous: data?.previous.total ?? 0, note: "Produtos + taxas de entrega", featured: true },
    { label: "Pedidos válidos", value: count.toLocaleString("pt-BR"), icon: ShoppingBag, accent: "bg-blue-400/10 text-blue-300", current: count, previous: data?.previous.count ?? 0, note: "Cancelados não entram no total" },
    { label: "Ticket médio", value: money(ticket), icon: Ticket, accent: "bg-violet-400/10 text-violet-300", current: ticket, previous: previousTicket, note: "Valor médio por pedido" },
    { label: "Média por dia", value: money(days ? total / days : 0), icon: CalendarDays, accent: "bg-emerald-400/10 text-emerald-300", current: days ? total / days : 0, previous: data?.range.previousDays ? data.previous.total / data.range.previousDays : 0, note: `${days} ${days === 1 ? "dia" : "dias"} no período, incluindo dias sem vendas` },
  ]

  function selectPeriod(value: RevenuePeriod) {
    if (value === period && error) setRetry((attempt) => attempt + 1)
    setPeriod(value); setError(false); setRangeError(""); setShowAllDays(false)
  }
  function applyRange(event: React.FormEvent) {
    event.preventDefault()
    try {
      revenueRange("personalizado", new Date(), dates.from, dates.to)
      setAppliedDates({ ...dates }); setRangeError(""); setError(false); setShowAllDays(false)
      setRetry((attempt) => attempt + 1)
    } catch (cause) { setRangeError(cause instanceof Error ? cause.message : "Confira as datas.") }
  }
  return (
    <div className="revenue-section flex min-w-0 flex-col gap-5 sm:gap-6">
      <header className="flex flex-col justify-between gap-4 sm:flex-row sm:items-end">
        <div>
          <div className="mb-2 flex items-center gap-2 text-xs font-medium text-muted-foreground"><span className="h-1.5 w-1.5 rounded-full bg-primary" />FINANCEIRO</div>
          <h1 className="font-display text-3xl font-bold tracking-tight sm:text-4xl">Faturamento<span className="text-primary">.</span></h1>
          <p className="mt-2 text-sm leading-relaxed text-muted-foreground">Acompanhe suas vendas e veja de onde vêm os resultados.</p>
        </div>
        <div className="flex shrink-0 gap-2">
          <button type="button" aria-label="Atualizar faturamento" onClick={() => setRetry((value) => value + 1)} disabled={refreshing} className="dashboard-icon-button h-11 w-11 shrink-0 rounded-xl border border-border bg-card disabled:opacity-50"><RefreshCw aria-hidden="true" className={`h-4 w-4 ${refreshing ? "animate-spin motion-reduce:animate-none" : ""}`} /></button>
          {data && !refreshing ? <a href={`/api/orders/revenue?${key}&format=csv`} download={`faturamento-${data.range.from}-${data.range.to}.csv`} className="flex min-h-11 flex-1 items-center justify-center gap-2 rounded-xl bg-primary px-4 text-sm font-semibold text-primary-foreground transition-colors hover:bg-primary/90 sm:flex-none"><Download aria-hidden="true" className="h-4 w-4" />Exportar CSV</a> : <button type="button" disabled className="flex min-h-11 flex-1 items-center justify-center gap-2 rounded-xl bg-primary px-4 text-sm font-semibold text-primary-foreground opacity-50 sm:flex-none"><Download aria-hidden="true" className="h-4 w-4" />Exportar CSV</button>}
        </div>
      </header>

      <Panel className="p-3 sm:p-4">
        <div className="flex flex-col gap-3 2xl:flex-row 2xl:items-center 2xl:justify-between">
          <div role="group" aria-label="Período do faturamento" className="grid grid-cols-2 gap-1 min-[400px]:grid-cols-3 sm:flex sm:flex-wrap">
            {REVENUE_PERIODS.map((entry) => <button type="button" key={entry.id} aria-pressed={period === entry.id} onClick={() => selectPeriod(entry.id)} className={`min-h-11 rounded-lg px-3 text-xs font-semibold transition-colors sm:px-4 ${period === entry.id ? "bg-primary/10 text-primary" : "text-muted-foreground hover:bg-secondary hover:text-foreground"}`}>{entry.label}</button>)}
          </div>
          <span className="flex items-center gap-2 px-2 text-xs text-muted-foreground"><CalendarDays aria-hidden="true" className="h-4 w-4 shrink-0" />{data ? revenueDateRange(data.range.from, data.range.to) : selectedLabel}{data?.range.partial && <span className="rounded-md bg-secondary px-2 py-1 text-[10px]">Em andamento</span>}</span>
        </div>
        {period === "personalizado" && <form onSubmit={applyRange} className="mt-4 border-t border-border px-1 pt-4">
          <div className="grid gap-3 sm:grid-cols-[1fr_1fr_auto] sm:items-end">
            <label className="text-xs font-medium text-muted-foreground">Data inicial<input type="date" required value={dates.from} max={businessDate(new Date())} onChange={(event) => setDates((value) => ({ ...value, from: event.target.value }))} className="mt-2 block h-11 w-full min-w-0 rounded-lg border border-border bg-background px-3 text-sm text-foreground [color-scheme:dark]" /></label>
            <label className="text-xs font-medium text-muted-foreground">Data final<input type="date" required value={dates.to} max={businessDate(new Date())} onChange={(event) => setDates((value) => ({ ...value, to: event.target.value }))} className="mt-2 block h-11 w-full min-w-0 rounded-lg border border-border bg-background px-3 text-sm text-foreground [color-scheme:dark]" /></label>
            <button type="submit" className="orders-button flex min-h-11 items-center justify-center gap-2 rounded-lg border border-border px-4 text-sm font-medium"><Check aria-hidden="true" className="h-4 w-4" />Aplicar período</button>
          </div>
          <p className={`mt-3 text-xs ${rangeError ? "text-rose-300" : "text-muted-foreground"}`} role={rangeError ? "alert" : undefined}>{rangeError || "Selecione até 93 dias. A comparação usa o intervalo imediatamente anterior de mesma duração."}</p>
        </form>}
      </Panel>

      {error && <div role="alert" className="flex flex-wrap items-center gap-3 rounded-xl border border-amber-400/20 bg-amber-400/5 p-4 text-sm"><CircleAlert aria-hidden="true" className="h-5 w-5 shrink-0 text-amber-300" /><p className="min-w-0 flex-1 text-amber-100">{data ? "Não foi possível atualizar. Os últimos dados carregados continuam visíveis." : "Não foi possível carregar o faturamento. Tente novamente."}</p><button type="button" disabled={refreshing} onClick={() => setRetry((value) => value + 1)} className="min-h-10 font-semibold text-amber-300 underline underline-offset-4 disabled:opacity-50">Tentar novamente</button></div>}

      <div className="grid grid-cols-1 gap-3 min-[375px]:grid-cols-2 sm:gap-4 xl:grid-cols-4" aria-busy={loading}>
        {metrics.map((metric) => <Panel key={metric.label} className={`p-4 sm:p-5 ${metric.featured ? "border-primary/25 bg-gradient-to-br from-primary/[0.06] to-card" : ""}`}>
          <span className={`mb-4 flex h-10 w-10 items-center justify-center rounded-xl ${metric.accent}`}><metric.icon aria-hidden="true" className="h-5 w-5" /></span>
          <h2 className="text-xs font-medium text-muted-foreground">{metric.label}</h2>
          {loading ? <Skeleton className="my-2 h-9 w-32 max-w-full" /> : <p className={`my-2 break-words font-display text-[23px] font-semibold tracking-tight tabular-nums sm:text-[28px] ${metric.featured ? "text-primary" : ""}`}>{data ? metric.value : "—"}</p>}
          {loading ? <Skeleton className="h-3 w-28 max-w-full" /> : data ? <Change current={metric.current} previous={metric.previous} /> : <span className="text-xs text-muted-foreground">Dados indisponíveis</span>}
          <p className="mt-3 text-[11px] leading-relaxed text-muted-foreground">{metric.note}</p>
        </Panel>)}
      </div>

      {data && <div className="flex flex-wrap items-center justify-between gap-x-4 gap-y-2 px-1 text-[11px] leading-relaxed text-muted-foreground">
        <p>Comparação: <span className="text-foreground">{revenueDateRange(data.range.previousFrom, data.range.previousTo)}</span>{data.range.previousPartial ? `, até ${time(data.updatedAt)}` : " (período completo)"}.{data.range.partial && " O período atual também vai até o horário da atualização."}</p>
        <span role="status" className="inline-flex shrink-0 items-center gap-1.5"><span className={`h-1.5 w-1.5 rounded-full ${error ? "bg-amber-300" : "bg-emerald-400"}`} />{refreshing ? "Atualizando…" : `Atualizado às ${time(data.updatedAt)}`}</span>
      </div>}

      <div className="grid items-start gap-5 xl:grid-cols-[minmax(0,1fr)_340px] 2xl:grid-cols-[minmax(0,1fr)_370px]">
        <div className="flex min-w-0 flex-col gap-5">
          <Panel className="p-4 sm:p-6">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div><h2 className="font-semibold">Evolução do faturamento</h2><p className="mt-1 text-xs text-muted-foreground">{chartMode === "daily" ? "Vendas por dia no período selecionado" : "Soma das vendas ao longo do período"}</p></div>
              <div role="group" aria-label="Visualização do gráfico" className="flex rounded-lg bg-background p-1">
                <button type="button" aria-pressed={chartMode === "daily"} onClick={() => setChartMode("daily")} className={`min-h-9 rounded-md px-3 text-xs font-medium ${chartMode === "daily" ? "bg-secondary text-foreground" : "text-muted-foreground hover:text-foreground"}`}>Diário</button>
                <button type="button" aria-pressed={chartMode === "cumulative"} onClick={() => setChartMode("cumulative")} className={`min-h-9 rounded-md px-3 text-xs font-medium ${chartMode === "cumulative" ? "bg-secondary text-foreground" : "text-muted-foreground hover:text-foreground"}`}>Acumulado</button>
              </div>
            </div>
            <div className="mt-6 flex flex-wrap items-baseline gap-3"><span className="font-display text-2xl font-semibold tabular-nums">{loading ? "Carregando…" : data ? money(total) : "—"}</span><span className="flex items-center gap-1.5 text-xs text-muted-foreground"><span className="h-2 w-2 rounded-full bg-primary" />{selectedLabel}</span></div>
            <div className="mt-5 h-[230px] min-w-0 sm:h-[270px]">
              {loading ? <Skeleton className="h-full w-full" /> : !data || !count ? <div className="flex h-full flex-col items-center justify-center rounded-xl border border-dashed border-border px-4 text-center"><span className="mb-3 rounded-xl bg-secondary p-3"><ChartNoAxesCombined aria-hidden="true" className="h-6 w-6 text-muted-foreground" /></span><p className="text-sm font-medium">{data ? "Nenhuma venda neste período" : "Gráfico indisponível"}</p><p className="mt-2 max-w-xs text-xs leading-relaxed text-muted-foreground">{data ? "Selecione outro período para consultar suas vendas. Novos pedidos aparecerão automaticamente." : "Tente atualizar para carregar os resultados."}</p></div> : <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={chartData} margin={{ top: 10, right: 8, left: -14, bottom: 0 }} accessibilityLayer>
                  <defs><linearGradient id={gradient} x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor="#facc15" stopOpacity={0.25} /><stop offset="100%" stopColor="#facc15" stopOpacity={0} /></linearGradient></defs>
                  <CartesianGrid stroke="hsl(var(--border))" strokeDasharray="4 5" vertical={false} />
                  <XAxis dataKey="date" tickFormatter={(date: string) => revenueDate(date)} tick={{ fill: "hsl(var(--muted-foreground))", fontSize: 11 }} tickLine={false} axisLine={false} minTickGap={24} dy={10} padding={{ left: 8, right: 8 }} />
                  <YAxis width={64} tickFormatter={(value: number) => value >= 1000 ? `${(value / 1000).toLocaleString("pt-BR", { maximumFractionDigits: 1 })} mil` : String(value)} tick={{ fill: "hsl(var(--muted-foreground))", fontSize: 11 }} tickLine={false} axisLine={false} />
                  <Tooltip content={({ active, payload, label }) => active && payload?.length ? <div className="rounded-xl border border-border bg-card p-3 shadow-xl"><p className="text-xs text-muted-foreground">{revenueDate(String(label), true)}</p><p className="mt-1 text-sm font-semibold text-primary">{money(Number(payload[0].value))}</p><p className="mt-1 text-xs text-muted-foreground">{chartMode === "daily" ? `${payload[0].payload.count} pedido(s)` : "Acumulado até esta data"}</p></div> : null} />
                  <Area type="monotone" dataKey={chartMode === "daily" ? "total" : "cumulative"} stroke="#facc15" strokeWidth={2.5} fill={`url(#${gradient})`} isAnimationActive={false} dot={days === 1 ? { r: 5, fill: "#facc15" } : false} activeDot={{ r: 5, stroke: "#15171c", strokeWidth: 3 }} />
                </AreaChart>
              </ResponsiveContainer>}
            </div>
            <div className="mt-6 grid grid-cols-1 gap-4 border-t border-border pt-4 min-[400px]:grid-cols-2">
              <div><p className="text-[11px] text-muted-foreground">Melhor dia do período</p><p className="mt-1 text-sm font-medium">{data && count && bestDay ? <>{revenueDate(bestDay.date)} <span className="ml-1 text-primary">{money(bestDay.total)}</span></> : "—"}</p></div>
              <div><p className="text-[11px] text-muted-foreground">Dias com vendas</p><p className="mt-1 text-sm font-medium">{data ? <>{activeDays} <span className="font-normal text-muted-foreground">de {days} {days === 1 ? "dia" : "dias"}</span></> : "—"}</p></div>
            </div>
          </Panel>

          <Panel className="overflow-hidden">
            <div className="flex items-center justify-between gap-3 border-b border-border p-4 sm:px-6 sm:py-5"><div><h2 className="font-semibold">Resumo diário</h2><p className="mt-1 text-xs text-muted-foreground">Os números de cada dia, do mais recente ao mais antigo.</p></div><ReceiptText aria-hidden="true" className="h-5 w-5 shrink-0 text-muted-foreground" /></div>
            {loading ? <div className="space-y-3 p-5">{[0, 1, 2].map((value) => <Skeleton key={value} className="h-10 w-full" />)}</div> : !data ? <p className="p-6 text-sm text-muted-foreground">Resumo indisponível.</p> : <>
              <div className="max-h-[420px] overflow-y-auto">
                <table className="w-full table-fixed text-left text-xs sm:text-sm">
                  <caption className="sr-only">Vendas diárias de {revenueDateRange(data.range.from, data.range.to)}. Cancelamentos excluídos.</caption>
                  <thead className="sticky top-0 z-10 bg-card text-[10px] text-muted-foreground sm:text-xs"><tr><th scope="col" className="w-[23%] px-4 py-3 font-medium sm:pl-6">Data</th><th scope="col" className="w-[15%] py-3 text-right font-medium">Pedidos</th><th scope="col" className="px-2 py-3 text-right font-medium sm:px-4">Vendas</th><th scope="col" className="py-3 pr-4 text-right font-medium sm:pr-6">Ticket médio</th></tr></thead>
                  <tbody>{(showAllDays ? dailyRows : dailyRows.slice(0, 7)).map((day) => <tr key={day.date} className="border-t border-border/70 hover:bg-secondary/30"><th scope="row" className="px-4 py-3.5 font-medium sm:pl-6"><span className="block">{revenueDate(day.date)}</span>{data.range.partial && day.date === data.range.to && <span className="mt-0.5 block text-[9px] font-normal text-muted-foreground sm:text-[10px]">Até {time(data.updatedAt)}</span>}</th><td className="py-3.5 text-right tabular-nums text-muted-foreground">{day.count}</td><td className="break-words px-2 py-3.5 text-right font-medium tabular-nums sm:px-4">{money(day.total)}</td><td className="break-words py-3.5 pr-4 text-right tabular-nums text-muted-foreground sm:pr-6">{day.count ? money(day.total / day.count) : "—"}</td></tr>)}</tbody>
                  <tfoot className="border-t border-border bg-secondary/30 font-semibold"><tr><th scope="row" className="px-4 py-4 sm:pl-6">Total</th><td className="py-4 text-right tabular-nums">{count}</td><td className="break-words px-2 py-4 text-right tabular-nums text-primary sm:px-4">{money(total)}</td><td className="break-words py-4 pr-4 text-right tabular-nums sm:pr-6">{money(ticket)}</td></tr></tfoot>
                </table>
              </div>
              {dailyRows.length > 7 && <button type="button" onClick={() => setShowAllDays((value) => !value)} className="orders-button flex min-h-12 w-full items-center justify-center gap-2 border-t border-border text-xs font-medium text-muted-foreground">{showAllDays ? <ChevronUp aria-hidden="true" className="h-4 w-4" /> : <ChevronDown aria-hidden="true" className="h-4 w-4" />}{showAllDays ? "Mostrar últimos 7 dias" : `Ver todos os ${days} dias`}</button>}
            </>}
          </Panel>
        </div>

        <div className="flex min-w-0 flex-col gap-5 md:grid md:grid-cols-2 xl:flex">
          <Panel className="p-4 sm:p-6">
            <div className="flex items-center justify-between gap-3"><h2 className="font-semibold">Formas de pagamento</h2><CreditCard aria-hidden="true" className="h-5 w-5 shrink-0 text-muted-foreground" /></div>
            <p className="mt-1 text-xs leading-relaxed text-muted-foreground">Participação no faturamento do período.</p>
            {loading ? <div className="mt-6 space-y-4">{[0, 1, 2].map((value) => <Skeleton key={value} className="h-14 w-full" />)}</div> : !data || !data.payments.length ? <div className="my-8 text-center"><Banknote aria-hidden="true" className="mx-auto mb-3 h-7 w-7 text-muted-foreground" /><p className="text-xs text-muted-foreground">{data ? "Nenhum pagamento registrado neste período." : "Dados indisponíveis."}</p></div> : <div className="mt-6 space-y-5">{data.payments.map((payment, index) => {
              const share = total ? payment.total / total * 100 : 0
              const color = paymentColors[index % paymentColors.length]
              return <div key={payment.name}><div className="flex items-start justify-between gap-3 text-sm"><div className="flex min-w-0 items-center gap-2"><span style={{ backgroundColor: color }} className="h-2 w-2 shrink-0 rounded-full" /><span className="break-words font-medium">{payment.name}</span></div><span className="shrink-0 font-semibold tabular-nums">{money(payment.total)}</span></div><div className="my-2 h-1.5 overflow-hidden rounded-full bg-secondary"><div className="h-full rounded-full" style={{ width: `${Math.max(0, Math.min(100, share))}%`, backgroundColor: color }} /></div><div className="flex items-center justify-between text-[11px] text-muted-foreground"><span>{payment.count} {payment.count === 1 ? "pedido" : "pedidos"}</span><span className="tabular-nums">{share.toLocaleString("pt-BR", { maximumFractionDigits: 1 })}%</span></div></div>
            })}</div>}
            <p className="mt-6 border-t border-border pt-4 text-[11px] leading-relaxed text-muted-foreground">Formas escolhidas nos pedidos. Não representa confirmação de pagamento.</p>
          </Panel>

          <Panel className="p-4 sm:p-6">
            <h2 className="font-semibold">Composição das vendas</h2><p className="mt-1 text-xs text-muted-foreground">O que está incluído no faturamento.</p>
            <div className="mt-5 space-y-4">
              {[{ label: "Produtos", icon: UtensilsCrossed, value: data?.totals.subtotal }, { label: "Taxas de entrega", icon: Truck, value: data?.totals.delivery }].map((entry) => <div key={entry.label} className="flex flex-wrap items-center justify-between gap-2 text-sm"><span className="flex items-center gap-2 text-muted-foreground"><entry.icon aria-hidden="true" className="h-4 w-4" />{entry.label}</span>{loading ? <Skeleton className="h-4 w-20" /> : <span className="font-medium tabular-nums">{entry.value === undefined ? "—" : money(entry.value)}</span>}</div>)}
              <div className="flex flex-wrap items-center justify-between gap-2 border-t border-border pt-4 text-sm font-semibold"><span>Faturamento total</span><span className="tabular-nums text-primary">{data ? money(total) : "—"}</span></div>
            </div>
            <div className="mt-5 rounded-xl border border-border bg-background/50 p-3.5"><div className="flex items-center gap-2 text-xs font-medium"><CircleAlert aria-hidden="true" className="h-4 w-4 text-muted-foreground" />Cancelamentos</div><p className="mt-2 text-sm font-semibold tabular-nums">{data ? money(data.canceled.total) : "—"}<span className="ml-2 text-xs font-normal text-muted-foreground">{data ? `${data.canceled.count} ${data.canceled.count === 1 ? "pedido" : "pedidos"}` : ""}</span></p><p className="mt-1 text-[11px] leading-relaxed text-muted-foreground">Valores excluídos de todos os indicadores acima.</p></div>
          </Panel>
        </div>
      </div>
      <p className="flex items-start gap-2 px-1 text-[11px] leading-relaxed text-muted-foreground"><CircleAlert aria-hidden="true" className="mt-0.5 h-3.5 w-3.5 shrink-0" />As vendas são apuradas pela data de criação do pedido, no horário de São Paulo. Faturamento não desconta custos ou despesas.</p>
    </div>
  )
}
