"use client"

import { ChevronRight, MapPin, MoreHorizontal, Printer, Trash2 } from "lucide-react"
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu"
import { ORDER_STATUSES, orderCode, orderMoney, orderQuantity, orderStatus, type AdminOrder } from "@/lib/admin-orders"
import { STORE_TIME_ZONE } from "@/lib/admin-dashboard"

export function OrderStatusBadge({ status }: { status: string }) {
  const appearance = orderStatus(status)
  return <span className={`inline-flex w-fit shrink-0 items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-[11px] font-medium ${appearance.className}`}><span className="h-1.5 w-1.5 rounded-full bg-current" />{appearance.label}</span>
}

interface OrderCardProps {
  order: AdminOrder
  disabled: boolean
  onDetails: (order: AdminOrder, trigger: HTMLElement) => void
  onStatus: (order: AdminOrder, status: string) => void
  onPrint: (order: AdminOrder) => void
  onDelete: (order: AdminOrder) => void
}

export function OrderCard({ order, disabled, onDetails, onStatus, onPrint, onDelete }: OrderCardProps) {
  const quantity = orderQuantity(order)
  const date = new Intl.DateTimeFormat("pt-BR", { timeZone: STORE_TIME_ZONE, day: "2-digit", month: "2-digit", hour: "2-digit", minute: "2-digit" }).format(new Date(order.createdAt))
  return (
    <article className="orders-row min-w-0 rounded-2xl border border-border bg-card p-4 transition-colors xl:rounded-none xl:border-x-0 xl:border-t-0 xl:p-5">
      <div className="grid min-w-0 items-center gap-4 xl:grid-cols-[minmax(0,1.15fr)_minmax(0,1fr)_100px_155px_135px]">
        <div className="min-w-0">
          <div className="mb-2 flex items-center justify-between gap-2">
            <span className="font-mono text-[10px] tracking-wide text-muted-foreground">#{orderCode(order)}</span>
            <span className="xl:hidden"><OrderStatusBadge status={order.status} /></span>
          </div>
          <h3 className="break-words text-sm font-semibold">{order.name}</h3>
          <p className="mt-1 text-[11px] text-muted-foreground">{date}</p>
        </div>
        <div className="min-w-0">
          <p className="line-clamp-2 text-xs leading-relaxed text-foreground/80">{order.items.map((item) => `${item.quantity}× ${item.name}${item.variantName ? ` (${item.variantName})` : ""}`).join(", ") || "Sem itens registrados"}</p>
          <p className="mt-2 flex min-w-0 items-center gap-1 text-[11px] text-muted-foreground"><MapPin className="h-3 w-3 shrink-0" /><span className="truncate">{order.neighborhood || "Não informado"}</span><span className="shrink-0">· {quantity} {quantity === 1 ? "item" : "itens"}</span></p>
        </div>
        <div className="flex items-center justify-between gap-2 xl:block">
          <span className="text-xs text-muted-foreground xl:hidden">Total do pedido</span>
          <div className="text-right xl:text-left"><p className="text-base font-semibold tabular-nums xl:text-sm">{orderMoney(order.total)}</p><p className="mt-1 text-[11px] text-muted-foreground">{order.paymentMethod}</p></div>
        </div>
        <div className="border-t border-border pt-3 xl:border-0 xl:pt-0">
          <label htmlFor={`status-${order.id}`} className="mb-1.5 block text-[10px] text-muted-foreground xl:sr-only">Situação do pedido</label>
          <select id={`status-${order.id}`} value={order.status} disabled={disabled} onChange={(event) => onStatus(order, event.target.value)}
            className={`min-h-11 w-full min-w-0 rounded-xl border border-border px-2 text-xs font-medium disabled:opacity-50 ${orderStatus(order.status).className}`}>
            {!ORDER_STATUSES.some((status) => status.value === order.status) && <option value={order.status}>{order.status}</option>}
            {ORDER_STATUSES.map((status) => <option key={status.value} value={status.value}>{status.label}</option>)}
          </select>
        </div>
        <div className="flex items-center gap-2">
          <button disabled={disabled} onClick={(event) => onDetails(order, event.currentTarget)} className="orders-button flex min-h-11 flex-1 items-center justify-center gap-1 rounded-xl border border-border px-3 text-xs font-semibold disabled:opacity-50">Detalhes <ChevronRight className="h-3 w-3" /></button>
          <DropdownMenu>
            <DropdownMenuTrigger asChild><button disabled={disabled} aria-label={`Mais ações do pedido ${orderCode(order)}`} className="orders-button flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border border-border disabled:opacity-50"><MoreHorizontal className="h-4 w-4" /></button></DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="admin-orders-dialog min-w-44 rounded-xl bg-card p-1.5">
              <DropdownMenuItem onSelect={() => onPrint(order)} className="min-h-11 gap-2 rounded-lg text-xs"><Printer className="h-4 w-4" />Imprimir pedido</DropdownMenuItem>
              <DropdownMenuItem onSelect={() => onDelete(order)} className="min-h-11 gap-2 rounded-lg text-xs text-rose-300 focus:bg-rose-400/10 focus:text-rose-300"><Trash2 className="h-4 w-4" />Excluir pedido</DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>
    </article>
  )
}
