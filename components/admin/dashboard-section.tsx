"use client"

import { useEffect, useId, useState, type ReactNode } from "react"
import Link from "next/link"
import {
  ArrowDownRight, ArrowRight, ArrowUpRight, CalendarDays, Check, ChevronRight,
  CircleAlert, Clock3, CreditCard, DollarSign, ExternalLink, MapPin,
  RefreshCw, ShoppingBag, Store, Tag, Ticket, Truck, UtensilsCrossed,
} from "lucide-react"
import { Area, AreaChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts"
import { useAdmin } from "@/lib/admin-context"
import { STORE_TIME_ZONE, storeOpeningInfo, type DashboardData } from "@/lib/admin-dashboard"
import { normalizeStoreHours } from "@/lib/store-hours"
import type { AdminSection } from "./admin-sidebar"

const money = (value: number) => new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(value)
const dayLabel = (date: string) => new Intl.DateTimeFormat("pt-BR", { day: "2-digit", month: "2-digit", timeZone: STORE_TIME_ZONE }).format(new Date(`${date}T12:00:00-03:00`))
const timeLabel = (date: string) => new Intl.DateTimeFormat("pt-BR", { hour: "2-digit", minute: "2-digit", timeZone: STORE_TIME_ZONE }).format(new Date(date))
const statusLabels: Record<string, { label: string; className: string }> = {
  recebido: { label: "Recebido", className: "bg-amber-400/10 text-amber-300" },
  confirmado: { label: "Confirmado", className: "bg-blue-400/10 text-blue-300" },
  preparando: { label: "Em preparo", className: "bg-violet-400/10 text-violet-300" },
  entrega: { label: "Em entrega", className: "bg-sky-400/10 text-sky-300" },
  entregue: { label: "Entregue", className: "bg-emerald-400/10 text-emerald-300" },
  cancelado: { label: "Cancelado", className: "bg-rose-400/10 text-rose-300" },
}

function Panel({ children, className = "" }: { children: ReactNode; className?: string }) {
  return <section className={`dashboard-panel min-w-0 rounded-2xl border border-border bg-card ${className}`}>{children}</section>
}

function Skeleton({ className = "" }: { className?: string }) {
  return <span className={`block animate-pulse rounded-lg bg-secondary ${className}`} aria-hidden="true" />
}

function Change({ current, previous }: { current: number; previous: number }) {
  if (!previous) return <span className="text-xs text-muted-foreground">{current ? "Sem base de comparação" : "Sem vendas no período"}</span>
  const change = (current - previous) / previous * 100
  const Icon = change < 0 ? ArrowDownRight : ArrowUpRight
  return (
    <span className={`inline-flex flex-wrap items-center gap-1 text-xs font-medium ${change < 0 ? "text-rose-300" : "text-emerald-300"}`}>
      <Icon className="h-3.5 w-3.5" aria-hidden="true" />
      {change > 0 ? "+" : ""}{change.toLocaleString("pt-BR", { maximumFractionDigits: 1 })}%
      <span className="font-normal text-muted-foreground">vs. período anterior</span>
    </span>
  )
}

export function DashboardSection({ onNavigate }: { onNavigate: (section: AdminSection) => void }) {
  const { store, categories, menuItems } = useAdmin()
  const [days, setDays] = useState(7)
  const [data, setData] = useState<DashboardData | null>(null)
  const [refreshing, setRefreshing] = useState(true)
  const [error, setError] = useState(false)
  const [retry, setRetry] = useState(0)
  const [now, setNow] = useState(() => new Date())
  const gradientId = useId().replace(/:/g, "")

  useEffect(() => {
    let disposed = false
    let inFlight = false
    const controller = new AbortController()
    async function load() {
      if (inFlight) return
      inFlight = true
      setRefreshing(true)
      try {
        const response = await fetch(`/api/orders/dashboard?days=${days}`, { signal: controller.signal, cache: "no-store" })
        if (!response.ok) throw new Error("Dashboard indisponível")
        const result: DashboardData = await response.json()
        if (!disposed) { setData(result); setError(false) }
      } catch {
        if (!disposed) setError(true)
      } finally {
        inFlight = false
        if (!disposed) setRefreshing(false)
      }
    }
    void load()
    const interval = setInterval(() => {
      setNow(new Date())
      if (!document.hidden) void load()
    }, 30000)
    const onVisible = () => { if (!document.hidden) { setNow(new Date()); void load() } }
    document.addEventListener("visibilitychange", onVisible)
    return () => { disposed = true; controller.abort(); clearInterval(interval); document.removeEventListener("visibilitychange", onVisible) }
  }, [days, retry])

  const current = data?.days === days ? data : null
  const loading = !current && !error
  const total = current?.daily.reduce((sum, day) => sum + day.total, 0) ?? 0
  const count = current?.daily.reduce((sum, day) => sum + day.count, 0) ?? 0
  const average = count ? total / count : 0
  const previousAverage = current?.previous.count ? current.previous.total / current.previous.count : 0
  const today = current?.daily.at(-1)
  const available = menuItems.filter((item) => item.available !== false && (!item.variants?.length || item.variants.some((variant) => variant.available))).length
  const opening = storeOpeningInfo(normalizeStoreHours(store.hours), now)
  const configuredHours = store.hours.length > 0
  const quickLinks = [
    { section: "menu" as const, label: "Cardápio", description: `${menuItems.length} itens cadastrados`, icon: UtensilsCrossed },
    { section: "categories" as const, label: "Categorias", description: `${categories.length} categorias`, icon: Tag },
    { section: "delivery" as const, label: "Entregas", description: `${store.deliveryFees.length} bairros atendidos`, icon: Truck },
    { section: "payments" as const, label: "Pagamentos", description: `${store.paymentMethods.length} formas de pagamento`, icon: CreditCard },
  ]
  const metrics = [
    { label: "Faturamento", value: money(total), icon: DollarSign, accent: "text-primary bg-primary/10", current: total, previous: current?.previous.total ?? 0, section: "profit" as const },
    { label: "Pedidos", value: String(count), icon: ShoppingBag, accent: "text-blue-300 bg-blue-400/10", current: count, previous: current?.previous.count ?? 0, section: "orders" as const },
    { label: "Ticket médio", value: money(average), icon: Ticket, accent: "text-violet-300 bg-violet-400/10", current: average, previous: previousAverage, section: "profit" as const },
    { label: "Em andamento", value: String(current?.pending ?? 0), icon: Clock3, accent: "text-orange-300 bg-orange-400/10", section: "orders" as const },
  ]

  return (
    <div className="dashboard flex flex-col gap-6 sm:gap-7">
      <header className="flex flex-col justify-between gap-4 xl:flex-row xl:items-end">
        <div>
          <div className="mb-2 flex items-center gap-2 text-xs font-medium text-muted-foreground"><span className="h-1.5 w-1.5 rounded-full bg-primary" />PAINEL DE CONTROLE</div>
          <h1 className="font-display text-3xl font-bold tracking-tight sm:text-4xl">Visão geral<span className="text-primary">.</span></h1>
          <p className="mt-2 text-sm leading-relaxed text-muted-foreground">Tudo o que você precisa para acompanhar sua loja.</p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <div className="flex rounded-xl border border-border bg-card p-1" role="group" aria-label="Período do dashboard">
            {[7, 30].map((period) => <button key={period} type="button" aria-pressed={days === period} onClick={() => { setError(false); setDays(period) }} className={`min-h-10 rounded-lg px-3 text-xs font-semibold transition-colors sm:px-4 ${days === period ? "bg-secondary text-foreground" : "text-muted-foreground hover:text-foreground"}`}>Últimos {period} dias</button>)}
          </div>
          <button type="button" onClick={() => setRetry((value) => value + 1)} disabled={refreshing} aria-label="Atualizar dashboard" className="dashboard-icon-button h-12 w-12 rounded-xl border border-border bg-card disabled:opacity-50"><RefreshCw className={`h-4 w-4 ${refreshing ? "animate-spin motion-reduce:animate-none" : ""}`} /></button>
        </div>
      </header>

      {error && <div role="alert" className="flex flex-wrap items-center gap-3 rounded-xl border border-amber-400/20 bg-amber-400/5 p-4 text-sm"><CircleAlert className="h-5 w-5 shrink-0 text-amber-300" /><p className="min-w-0 flex-1 text-amber-100">{current ? "Não foi possível atualizar. Os últimos dados carregados continuam visíveis." : "Não foi possível carregar as vendas. Tente novamente."}</p><button disabled={refreshing} onClick={() => setRetry((value) => value + 1)} className="min-h-10 font-semibold text-amber-300 underline underline-offset-4 disabled:opacity-50">Tentar novamente</button></div>}

      <div className="grid grid-cols-1 gap-3 min-[375px]:grid-cols-2 sm:gap-4 xl:grid-cols-4" aria-busy={loading}>
        {metrics.map((metric) => (
          <button key={metric.label} type="button" onClick={() => onNavigate(metric.section)} className="dashboard-panel dashboard-metric group flex min-w-0 flex-col items-start rounded-2xl border border-border bg-card p-4 text-left sm:p-6 xl:p-5 2xl:p-6">
            <div className="mb-4 flex w-full items-center justify-between"><span className={`flex h-10 w-10 items-center justify-center rounded-xl ${metric.accent}`}><metric.icon className="h-5 w-5" aria-hidden="true" /></span><ArrowUpRight className="h-4 w-4 text-muted-foreground transition-colors group-hover:text-primary" aria-hidden="true" /></div>
            <p className="text-xs font-medium text-muted-foreground">{metric.label}</p>
            {loading ? <Skeleton className="my-2 h-9 w-32 max-w-full" /> : <p className="my-2 break-words font-display text-[22px] font-semibold tracking-tight tabular-nums sm:text-3xl xl:text-[28px] 2xl:text-3xl">{current ? metric.value : "—"}</p>}
            <div className="min-h-4">{loading ? <Skeleton className="h-3 w-36 max-w-full" /> : !current ? <span className="text-xs text-muted-foreground">Dados indisponíveis</span> : metric.current !== undefined ? <Change current={metric.current} previous={metric.previous ?? 0} /> : <span className="text-xs text-muted-foreground">{current.received > 0 ? <span className="font-medium text-orange-300">{current.received} aguardando confirmação</span> : "Nenhum pedido aguardando confirmação"}</span>}</div>
            {metric.current === undefined && <p className="mt-1 text-[10px] text-muted-foreground">Todos os períodos</p>}
          </button>
        ))}
      </div>

      <div className="grid items-start gap-5 xl:grid-cols-[minmax(0,1fr)_320px] 2xl:grid-cols-[minmax(0,1fr)_350px]">
        <div className="flex min-w-0 flex-col gap-5">
          <Panel className="p-5 sm:p-6">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div><h2 className="font-semibold">Evolução das vendas</h2><p className="mt-1 text-xs text-muted-foreground">Faturamento diário nos últimos {days} dias</p></div>
              <span className="inline-flex items-center gap-2 rounded-lg bg-secondary/60 px-3 py-2 text-xs text-muted-foreground"><span className="h-2 w-2 rounded-full bg-primary" />Vendas</span>
            </div>
            <div className="mt-6 flex flex-wrap items-baseline gap-x-3 gap-y-1"><span className="font-display text-2xl font-semibold tabular-nums">{loading ? "Carregando…" : current ? money(total) : "—"}</span><span className="text-xs text-muted-foreground">no período selecionado</span></div>
            <div className="mt-6 h-[230px] min-w-0 sm:h-[260px]">
              {loading ? <Skeleton className="h-full w-full" /> : !current || count === 0 ? (
                <div className="flex h-full flex-col items-center justify-center rounded-xl border border-dashed border-border px-4 text-center">
                  <span className="mb-3 rounded-xl bg-secondary p-3"><ShoppingBag className="h-5 w-5 text-muted-foreground" /></span>
                  <p className="text-sm font-medium">{current ? "As próximas vendas aparecem aqui" : "Gráfico indisponível"}</p>
                  <p className="mt-1 max-w-xs text-xs leading-relaxed text-muted-foreground">{current ? "Ainda não há pedidos válidos neste período. Selecione outro intervalo ou acompanhe os novos pedidos." : "Atualize o dashboard para tentar carregar os dados."}</p>
                </div>
              ) : (
                <>
                  <span className="sr-only">{current.daily.map((day) => `${dayLabel(day.date)}: ${money(day.total)}, ${day.count} pedidos`).join("; ")}</span>
                  <ResponsiveContainer width="100%" height="100%">
                    <AreaChart data={current.daily} margin={{ top: 8, right: 8, left: -14, bottom: 0 }} accessibilityLayer>
                      <defs><linearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor="#facc15" stopOpacity={0.25} /><stop offset="100%" stopColor="#facc15" stopOpacity={0} /></linearGradient></defs>
                      <CartesianGrid stroke="hsl(var(--border))" strokeDasharray="4 5" vertical={false} />
                      <XAxis dataKey="date" tickFormatter={dayLabel} tick={{ fill: "hsl(var(--muted-foreground))", fontSize: 11 }} tickLine={false} axisLine={false} minTickGap={24} dy={10} />
                      <YAxis width={64} tickFormatter={(value: number) => value >= 1000 ? `${(value / 1000).toLocaleString("pt-BR", { maximumFractionDigits: 1 })} mil` : String(value)} tick={{ fill: "hsl(var(--muted-foreground))", fontSize: 11 }} tickLine={false} axisLine={false} />
                      <Tooltip content={({ active, payload, label }) => active && payload?.length ? <div className="rounded-xl border border-border bg-card p-3 shadow-xl"><p className="mb-1 text-xs text-muted-foreground">{dayLabel(String(label))}</p><p className="text-sm font-semibold text-primary">{money(Number(payload[0].value))}</p><p className="mt-1 text-xs text-muted-foreground">{payload[0].payload.count} pedido(s)</p></div> : null} />
                      <Area type="monotone" dataKey="total" stroke="#facc15" strokeWidth={2.5} fill={`url(#${gradientId})`} isAnimationActive={false} activeDot={{ r: 5, stroke: "#15171c", strokeWidth: 3 }} />
                    </AreaChart>
                  </ResponsiveContainer>
                </>
              )}
            </div>
            <div className="mt-5 flex flex-wrap items-center justify-between gap-2 border-t border-border pt-4 text-xs text-muted-foreground">
              <span>Valores incluem entrega e excluem cancelamentos.</span>
              <button onClick={() => onNavigate("profit")} className="inline-flex min-h-9 items-center gap-1 font-medium text-primary">Ver faturamento <ArrowRight className="h-3.5 w-3.5" /></button>
            </div>
          </Panel>

          <Panel className="overflow-hidden">
            <div className="flex flex-wrap items-center justify-between gap-2 border-b border-border px-5 py-5 sm:px-6">
              <div><h2 className="font-semibold">Pedidos recentes</h2><p className="mt-1 text-xs text-muted-foreground">Os últimos pedidos recebidos pela loja</p></div>
              <button onClick={() => onNavigate("orders")} className="inline-flex min-h-10 items-center gap-1.5 text-xs font-semibold text-primary">Ver todos <ArrowRight className="h-3.5 w-3.5" /></button>
            </div>
            {loading ? <div className="flex flex-col gap-5 p-6">{[1, 2, 3].map((item) => <Skeleton key={item} className="h-12 w-full" />)}</div> : !current || !current.recentOrders.length ? (
              <div className="flex flex-col items-center px-5 py-12 text-center">
                <ShoppingBag className="mb-3 h-7 w-7 text-muted-foreground" />
                <p className="text-sm font-medium">{current ? "Nenhum pedido por enquanto" : "Pedidos indisponíveis"}</p>
                <p className="mt-1 text-xs text-muted-foreground">{current ? "Quando um pedido chegar, ele aparecerá aqui." : "Tente atualizar os dados novamente."}</p>
              </div>
            ) : (
              <div className="divide-y divide-border">
                {current.recentOrders.map((order) => {
                  const status = statusLabels[order.status] ?? { label: order.status, className: "bg-secondary text-muted-foreground" }
                  return (
                    <button key={order.id} onClick={() => onNavigate("orders")} aria-label={`Gerenciar pedidos: ${order.name}, ${money(order.total)}, ${status.label}`} className="dashboard-order grid w-full min-w-0 grid-cols-[40px_minmax(0,1fr)_auto] items-center gap-x-3 gap-y-2 px-5 py-4 text-left sm:grid-cols-[40px_minmax(0,1fr)_auto_100px] sm:px-6">
                      <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-secondary text-xs font-semibold text-muted-foreground" aria-hidden="true">{order.name.trim().slice(0, 2).toUpperCase()}</span>
                      <div className="min-w-0"><p className="truncate text-sm font-medium">{order.name}</p><p className="mt-1 truncate text-[11px] text-muted-foreground">{new Intl.DateTimeFormat("pt-BR", { day: "2-digit", month: "2-digit", timeZone: STORE_TIME_ZONE }).format(new Date(order.createdAt))} às {timeLabel(order.createdAt)} · {order.neighborhood || "Retirada"}</p></div>
                      <span className="text-right text-sm font-semibold tabular-nums sm:col-start-4 sm:row-start-1">{money(order.total)}</span>
                      <span className={`col-span-2 col-start-2 inline-flex w-fit items-center gap-1.5 rounded-md px-2 py-1 text-[10px] font-medium sm:col-span-1 sm:col-start-3 sm:row-start-1 ${status.className}`}><span className="h-1 w-1 rounded-full bg-current" />{status.label}</span>
                    </button>
                  )
                })}
              </div>
            )}
          </Panel>
        </div>

        <div className="grid min-w-0 gap-5 sm:grid-cols-2 xl:grid-cols-1">
          <Panel className="relative overflow-hidden p-5 sm:p-6">
            <div className="pointer-events-none absolute -right-10 -top-10 h-36 w-36 rounded-full bg-primary/5 blur-2xl" />
            <div className="relative flex items-center justify-between gap-2">
              <span className="flex h-10 w-10 items-center justify-center rounded-xl border border-border bg-secondary/50"><Store className="h-5 w-5 text-primary" /></span>
              <span className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-[11px] font-medium ${configuredHours && opening.open ? "border-emerald-400/15 bg-emerald-400/10 text-emerald-300" : "border-border bg-secondary text-muted-foreground"}`}><span className="h-1.5 w-1.5 rounded-full bg-current" />{configuredHours ? opening.open ? "Loja aberta" : "Loja fechada" : "Sem horário"}</span>
            </div>
            <h2 className="mt-4 font-display text-lg font-semibold">{store.name || "Sua loja"}</h2>
            <p className="mt-1 flex items-start gap-1.5 text-xs leading-relaxed text-muted-foreground"><MapPin className="mt-0.5 h-3.5 w-3.5 shrink-0" />{[store.address, store.city].filter(Boolean).join(" · ") || "Endereço não cadastrado"}</p>
            <div className="my-5 border-y border-border py-4">
              <div className="flex items-center justify-between gap-2 text-xs"><span className="text-muted-foreground">Horário de hoje</span><span className="font-medium">{configuredHours ? opening.schedule?.closed ? "Fechado" : `${opening.schedule?.open} – ${opening.schedule?.close}` : "Não configurado"}</span></div>
              <p className="mt-2 text-[11px] text-muted-foreground">{configuredHours && opening.open ? `Atendendo até ${opening.closesAt}.` : "Funcionamento conforme os horários cadastrados."}</p>
              <button onClick={() => onNavigate("hours")} className="mt-2 inline-flex min-h-9 items-center gap-1 text-xs font-medium text-primary">Gerenciar horários <ChevronRight className="h-3 w-3" /></button>
            </div>
            <Link href="/" target="_blank" rel="noopener noreferrer" className="dashboard-secondary-button flex min-h-11 items-center justify-center gap-2 rounded-xl border border-border text-xs font-semibold">Visualizar loja <ExternalLink className="h-3.5 w-3.5" /><span className="sr-only">(abre em nova aba)</span></Link>
          </Panel>

          <Panel className="p-5 sm:p-6">
            <div className="mb-4 flex items-center gap-2"><CalendarDays className="h-4 w-4 text-primary" /><h2 className="text-sm font-semibold">Hoje na loja</h2></div>
            <div className="flex flex-col gap-4">
              <div className="flex items-center justify-between gap-2"><span className="text-xs text-muted-foreground">Faturamento</span><span className="text-sm font-semibold tabular-nums">{loading ? "…" : today ? money(today.total) : "—"}</span></div>
              <div className="flex items-center justify-between gap-2"><span className="text-xs text-muted-foreground">Pedidos válidos</span><span className="text-sm font-semibold tabular-nums">{loading ? "…" : today?.count ?? "—"}</span></div>
              <div className="flex items-center justify-between gap-2 border-t border-border pt-4"><span className="text-xs text-muted-foreground">Itens disponíveis</span><span className="inline-flex items-center gap-1 text-xs font-medium text-emerald-300"><Check className="h-3.5 w-3.5" />{available} de {menuItems.length}</span></div>
            </div>
            {available < menuItems.length && <button onClick={() => onNavigate("menu")} className="mt-4 text-left text-xs leading-relaxed text-amber-300">{menuItems.length - available} item(ns) indisponível(is). Revisar cardápio <ArrowUpRight className="inline h-3 w-3" /></button>}
          </Panel>

          <Panel className="p-5 sm:col-span-2 sm:p-6 xl:col-span-1">
            <h2 className="mb-1 text-sm font-semibold">Acesso rápido</h2><p className="mb-4 text-xs text-muted-foreground">Ajustes do dia a dia, em um clique.</p>
            <div className="grid gap-1 sm:grid-cols-2 xl:grid-cols-1">
              {quickLinks.map((link) => <button key={link.section} onClick={() => onNavigate(link.section)} className="dashboard-quick-link group flex min-h-16 items-center gap-3 rounded-xl p-2 text-left"><span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-secondary text-muted-foreground transition-colors group-hover:bg-primary/10 group-hover:text-primary"><link.icon className="h-4 w-4" /></span><span className="min-w-0 flex-1"><span className="block text-xs font-medium">{link.label}</span><span className="mt-1 block text-[11px] text-muted-foreground">{link.description}</span></span><ChevronRight className="h-3.5 w-3.5 shrink-0 text-muted-foreground" /></button>)}
            </div>
            <Link href="/admin/balcao" className="mt-4 flex min-h-11 items-center justify-center gap-2 rounded-xl bg-primary px-3 text-xs font-semibold text-primary-foreground transition-colors hover:bg-primary/90"><Store className="h-4 w-4" />Abrir balcão <ArrowUpRight className="h-3.5 w-3.5" /></Link>
          </Panel>
        </div>
      </div>
      <footer className="flex flex-wrap items-center justify-between gap-2 border-t border-border pt-4 text-[11px] text-muted-foreground">
        <span>Rei dos Salgados · Sua operação em um só lugar</span>
        <span role="status" className="inline-flex items-center gap-1.5"><span className={`h-1.5 w-1.5 rounded-full ${error ? "bg-amber-400" : refreshing ? "bg-primary" : "bg-emerald-400"}`} />{refreshing ? "Atualizando dados…" : current ? `Atualizado às ${timeLabel(current.updatedAt)} · atualização a cada 30 s` : "Aguardando dados"}</span>
      </footer>
    </div>
  )
}
