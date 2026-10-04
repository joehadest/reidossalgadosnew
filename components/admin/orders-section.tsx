"use client"

import { useEffect, useRef, useState } from "react"
import { CheckCheck, ChevronLeft, ChevronRight, CircleAlert, Clock3, Filter, MoreHorizontal, RefreshCw, Search, ShoppingBag, Trash2, Truck, X } from "lucide-react"
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu"
import { ORDER_STATUSES, orderMoney, type AdminOrder } from "@/lib/admin-orders"
import { useAdmin } from "@/lib/admin-context"
import { printOrderThermal } from "@/lib/thermal-print"
import { OrderCard } from "./order-card"
import { OrderDetailsDialog } from "./order-details-dialog"
import { OrderConfirmationDialog, type OrderConfirmation } from "./order-confirmation-dialog"
import { useOrders } from "./use-orders"

const PAGE_SIZE = 12
const PERIODS = [
  { value: "todos", label: "Todo o histórico" },
  { value: "hoje", label: "Hoje" },
  { value: "semana", label: "Últimos 7 dias" },
  { value: "mes", label: "Últimos 30 dias" },
]

export function OrdersSection() {
  const { store } = useAdmin()
  const [filters, setFilters] = useState({ status: "", date: "todos", search: "", page: 1 })
  const [search, setSearch] = useState("")
  const [confirmation, setConfirmation] = useState<OrderConfirmation | null>(null)
  const detailTrigger = useRef<HTMLElement | null>(null)
  const confirmationTrigger = useRef<HTMLElement | null>(null)
  const query = new URLSearchParams({
    status: filters.status, date: filters.date, q: filters.search,
    page: String(filters.page), limit: String(PAGE_SIZE), summary: "true",
  }).toString()
  const { result, error, refreshing, refresh, selected, setSelected, busy, changeStatus, remove, removeAll } = useOrders(query)
  const loading = !result && !error
  const disabled = !!busy
  const counts = result?.summary.counts ?? {}
  const filtered = !!(filters.status || filters.date !== "todos" || search.trim())
  const page = result?.page ?? filters.page
  const totalPages = result?.pages ?? 1

  useEffect(() => {
    const timer = setTimeout(() => {
      setFilters((previous) => previous.search === search.trim() ? previous : { ...previous, search: search.trim(), page: 1 })
    }, 300)
    return () => clearTimeout(timer)
  }, [search])

  function resetFilters() {
    setSearch("")
    setFilters({ status: "", date: "todos", search: "", page: 1 })
  }

  function requestConfirmation(value: OrderConfirmation) {
    confirmationTrigger.current = document.activeElement instanceof HTMLElement ? document.activeElement : null
    setConfirmation(value)
  }

  function requestStatus(order: AdminOrder, status: string) {
    if (status === order.status) return
    if (status === "cancelado") requestConfirmation({ action: "cancel", order })
    else void changeStatus(order, status)
  }

  async function confirmAction() {
    if (!confirmation) return
    const succeeded = confirmation.action === "delete-all" ? await removeAll()
      : confirmation.action === "cancel" ? await changeStatus(confirmation.order, "cancelado")
      : await remove(confirmation.order)
    if (succeeded) setConfirmation(null)
  }

  function returnConfirmationFocus() {
    const trigger = confirmationTrigger.current
    if (trigger?.isConnected) trigger.focus()
    else (document.getElementById("detail-status") ?? document.getElementById("orders-search"))?.focus()
  }

  const overview = [
    { status: "recebido", label: "Recebidos", detail: "Aguardando confirmação", icon: ShoppingBag, color: "text-amber-300 bg-amber-400/10" },
    { status: "preparando", label: "Em preparação", detail: "Na cozinha", icon: Clock3, color: "text-violet-300 bg-violet-400/10" },
    { status: "entrega", label: "Em entrega", detail: "A caminho do cliente", icon: Truck, color: "text-sky-300 bg-sky-400/10" },
    { status: "entregue", label: "Entregues", detail: "Pedidos concluídos", icon: CheckCheck, color: "text-emerald-300 bg-emerald-400/10" },
  ]

  return (
    <div className="orders-section flex min-w-0 flex-col gap-6">
      <header className="flex flex-col justify-between gap-4 sm:flex-row sm:items-end">
        <div>
          <p className="mb-2 flex items-center gap-2 text-xs font-medium text-muted-foreground"><span className="h-1.5 w-1.5 rounded-full bg-primary" />OPERAÇÃO DA LOJA</p>
          <h1 id="orders-heading" tabIndex={-1} className="font-display text-3xl font-bold tracking-tight sm:text-4xl">Pedidos<span className="text-primary">.</span></h1>
          <p className="mt-2 text-sm leading-relaxed text-muted-foreground">Do recebimento à entrega, acompanhe cada etapa.</p>
        </div>
        <div className="flex shrink-0 items-center gap-2">
          <button onClick={refresh} disabled={refreshing || disabled} className="orders-button inline-flex min-h-11 items-center justify-center gap-2 rounded-xl border border-border bg-card px-4 text-xs font-semibold disabled:opacity-50"><RefreshCw className={`h-4 w-4 ${refreshing ? "animate-spin" : ""}`} />{refreshing ? "Atualizando…" : "Atualizar"}</button>
          <DropdownMenu>
            <DropdownMenuTrigger asChild><button aria-label="Ações do histórico de pedidos" disabled={disabled || !result} className="orders-button flex h-11 w-11 items-center justify-center rounded-xl border border-border bg-card disabled:opacity-50"><MoreHorizontal className="h-4 w-4" /></button></DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="admin-orders-dialog rounded-xl bg-card p-1.5"><DropdownMenuItem disabled={!result?.globalTotal} onSelect={() => requestConfirmation({ action: "delete-all" })} className="min-h-11 gap-2 rounded-lg text-xs text-rose-300 focus:bg-rose-400/10 focus:text-rose-300"><Trash2 className="h-4 w-4" />Excluir todo o histórico</DropdownMenuItem></DropdownMenuContent>
          </DropdownMenu>
        </div>
      </header>

      {error && <div role="alert" className="flex flex-wrap items-center gap-3 rounded-xl border border-amber-400/20 bg-amber-400/5 p-4 text-sm"><CircleAlert className="h-5 w-5 shrink-0 text-amber-300" /><p className="min-w-0 flex-1 text-amber-100">{result ? "Não foi possível atualizar. Os últimos pedidos carregados continuam visíveis." : "Não foi possível carregar os pedidos. Tente novamente."}</p><button onClick={refresh} disabled={refreshing || disabled} className="min-h-11 text-xs font-semibold text-amber-300 underline underline-offset-4 disabled:opacity-50">Tentar novamente</button></div>}

      <div>
        <div className="grid grid-cols-2 gap-3 sm:gap-4 xl:grid-cols-4" aria-busy={loading}>
          {overview.map((card) => <button key={card.status} disabled={disabled} aria-pressed={filters.status === card.status} onClick={() => setFilters((previous) => ({ ...previous, status: previous.status === card.status ? "" : card.status, page: 1 }))}
            className={`dashboard-panel flex min-w-0 flex-col rounded-2xl border bg-card p-4 text-left transition-colors hover:border-primary/30 disabled:opacity-50 sm:p-5 ${filters.status === card.status ? "border-primary/40" : "border-border"}`}>
            <div className="mb-4 flex w-full items-center justify-between"><span className={`flex h-9 w-9 items-center justify-center rounded-xl ${card.color}`}><card.icon className="h-4 w-4" /></span><span className="font-display text-2xl font-semibold tabular-nums">{loading ? <span className="block h-7 w-8 animate-pulse rounded bg-secondary" /> : result ? counts[card.status] ?? 0 : "—"}</span></div>
            <span className="text-xs font-semibold">{card.label}</span><span className="mt-1 text-[11px] leading-relaxed text-muted-foreground">{card.detail}</span>
          </button>)}
        </div>
        <p className="mt-2 text-[10px] text-muted-foreground">Contadores consideram o período e a busca atuais, em todas as páginas.</p>
      </div>

      <section aria-label="Lista e filtros de pedidos" className="min-w-0">
        <div className="rounded-2xl border border-border bg-card p-4 sm:p-5">
          <div className="grid items-end gap-3 sm:grid-cols-[minmax(0,1fr)_200px_auto]">
            <div><label htmlFor="orders-search" className="mb-2 block text-[11px] font-medium text-muted-foreground">Buscar pedido</label><div className="relative"><Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" /><input id="orders-search" type="search" value={search} disabled={disabled} maxLength={100} onChange={(event) => setSearch(event.target.value)} placeholder="Cliente, telefone, código ou bairro" className="min-h-11 w-full min-w-0 rounded-xl border border-border bg-background py-2 pl-10 pr-3 text-xs placeholder:text-muted-foreground disabled:opacity-50" /></div></div>
            <div><label htmlFor="orders-period" className="mb-2 block text-[11px] font-medium text-muted-foreground">Período</label><select id="orders-period" value={filters.date} disabled={disabled} onChange={(event) => setFilters((previous) => ({ ...previous, date: event.target.value, page: 1 }))} className="min-h-11 w-full rounded-xl border border-border bg-background px-3 text-xs disabled:opacity-50">{PERIODS.map((period) => <option key={period.value} value={period.value}>{period.label}</option>)}</select></div>
            <button aria-label="Limpar filtros" title="Limpar filtros" disabled={!filtered || disabled} onClick={resetFilters} className="orders-button flex h-11 items-center justify-center gap-2 rounded-xl border border-border px-3 text-xs disabled:opacity-30 sm:w-11 sm:px-0"><X className="h-4 w-4" /><span className="sm:hidden">Limpar filtros</span></button>
          </div>
          <div className="mt-5 flex flex-wrap gap-2 border-t border-border pt-4" role="group" aria-label="Filtrar pela situação">
            {[{ value: "", label: "Todos" }, ...ORDER_STATUSES].map((status) => <button key={status.value} disabled={disabled} aria-pressed={filters.status === status.value} onClick={() => setFilters((previous) => ({ ...previous, status: status.value, page: 1 }))}
              className={`inline-flex min-h-10 items-center gap-2 rounded-lg border px-3 text-[11px] font-medium transition-colors disabled:opacity-50 ${filters.status === status.value ? "border-primary/20 bg-primary/10 text-primary" : "border-transparent bg-secondary/40 text-muted-foreground hover:text-foreground"}`}>
              {status.label}<span className={`rounded px-1.5 py-0.5 text-[10px] tabular-nums ${filters.status === status.value ? "bg-primary/10" : "bg-background/50"}`}>{result ? status.value ? counts[status.value] ?? 0 : result.summary.total : "—"}</span>
            </button>)}
          </div>
        </div>

        <div className="my-4 flex flex-wrap items-center justify-between gap-2">
          <h2 className="text-sm font-semibold">{filters.status ? ORDER_STATUSES.find((status) => status.value === filters.status)?.label : "Todos os pedidos"} <span className="ml-1 text-xs font-normal text-muted-foreground">{result ? `(${result.total})` : ""}</span></h2>
          <span title="Total do período e da busca, em todas as situações, excluindo cancelados." className="text-[11px] text-muted-foreground">{result ? `Vendas: ${orderMoney(result.summary.revenue)}` : "Carregando histórico…"}</span>
        </div>

        {loading ? <div role="status" aria-label="Carregando pedidos" className="flex flex-col gap-3">{[1, 2, 3, 4].map((item) => <div key={item} className="h-28 animate-pulse rounded-2xl border border-border bg-card p-5"><div className="h-4 w-1/3 rounded bg-secondary" /><div className="mt-3 h-3 w-1/2 rounded bg-secondary" /><div className="mt-3 h-3 w-1/4 rounded bg-secondary" /></div>)}</div>
          : !result || !result.orders.length ? <div className="rounded-2xl border border-dashed border-border bg-card/50 px-5 py-16 text-center"><span className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-secondary">{error ? <CircleAlert className="h-6 w-6 text-muted-foreground" /> : filtered ? <Filter className="h-6 w-6 text-muted-foreground" /> : <ShoppingBag className="h-6 w-6 text-muted-foreground" />}</span><h3 className="text-base font-semibold">{error ? "Histórico indisponível" : filtered ? "Nenhum pedido encontrado" : "Seus pedidos aparecerão aqui"}</h3><p className="mx-auto mt-2 max-w-sm text-xs leading-relaxed text-muted-foreground">{error ? "Tente carregar novamente para continuar." : filtered ? "Não há pedidos que correspondam à busca e aos filtros selecionados." : "Acompanhe o recebimento, o preparo e a entrega quando chegar o primeiro pedido."}</p>{filtered && !error && <button onClick={resetFilters} className="mt-5 min-h-11 rounded-xl bg-primary px-5 text-xs font-semibold text-primary-foreground">Limpar filtros</button>}</div>
          : <div className="grid gap-3 md:grid-cols-2 xl:block xl:overflow-hidden xl:rounded-2xl xl:border xl:border-border">
            <div className="hidden grid-cols-[minmax(0,1.15fr)_minmax(0,1fr)_100px_155px_135px] gap-4 border-b border-border bg-secondary/30 px-5 py-3 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground xl:grid"><span>Pedido / cliente</span><span>Itens / entrega</span><span>Total</span><span>Situação</span><span>Ações</span></div>
            {result.orders.map((order) => <OrderCard key={order.id} order={order} disabled={disabled}
              onDetails={(value, trigger) => { detailTrigger.current = trigger; setSelected(value) }}
              onStatus={requestStatus} onPrint={(value) => printOrderThermal(value, store.name)} onDelete={(value) => requestConfirmation({ action: "delete", order: value })} />)}
          </div>}

        {result && result.total > 0 && <nav aria-label="Paginação dos pedidos" className="mt-5 flex flex-wrap items-center justify-between gap-3">
          <p className="text-[11px] text-muted-foreground">Mostrando {(page - 1) * PAGE_SIZE + 1}–{Math.min(page * PAGE_SIZE, result.total)} de {result.total} pedidos</p>
          <div className="flex items-center gap-2"><button disabled={page <= 1 || disabled || refreshing} onClick={() => setFilters((previous) => ({ ...previous, page: page - 1 }))} aria-label="Página anterior" className="orders-button flex h-11 w-11 items-center justify-center rounded-xl border border-border bg-card disabled:opacity-30"><ChevronLeft className="h-4 w-4" /></button><span className="px-2 text-xs text-muted-foreground">Página <strong className="font-semibold text-foreground">{page}</strong> de {totalPages}</span><button disabled={page >= totalPages || disabled || refreshing} onClick={() => setFilters((previous) => ({ ...previous, page: page + 1 }))} aria-label="Próxima página" className="orders-button flex h-11 w-11 items-center justify-center rounded-xl border border-border bg-card disabled:opacity-30"><ChevronRight className="h-4 w-4" /></button></div>
        </nav>}
      </section>

      <footer className="flex flex-wrap justify-between gap-2 border-t border-border pt-4 text-[10px] text-muted-foreground"><span>Vendas incluem entrega e excluem pedidos cancelados.</span><span role="status" className="inline-flex items-center gap-1.5"><span className={`h-1.5 w-1.5 rounded-full ${error ? "bg-amber-400" : refreshing ? "bg-primary" : "bg-emerald-400"}`} />{error ? "Falha na atualização" : refreshing ? "Atualizando pedidos…" : "Atualização automática a cada 15 s"}</span></footer>

      <OrderDetailsDialog order={selected} busy={disabled} onClose={() => setSelected(null)}
        onReturnFocus={() => { if (detailTrigger.current?.isConnected) detailTrigger.current.focus(); else document.getElementById("orders-search")?.focus() }}
        onStatus={requestStatus} onPrint={(order) => printOrderThermal(order, store.name)} onDelete={(order) => requestConfirmation({ action: "delete", order })} />
      <OrderConfirmationDialog confirmation={confirmation} busy={disabled} total={result?.globalTotal ?? 0}
        onClose={() => setConfirmation(null)} onConfirm={() => void confirmAction()} onReturnFocus={returnConfirmationFocus} />
    </div>
  )
}
