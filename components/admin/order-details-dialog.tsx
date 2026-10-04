"use client"

import { useEffect, useRef, useState } from "react"
import { Check, ChevronRight, CreditCard, MapPin, Phone, Printer, ShoppingBag, Trash2, UserRound } from "lucide-react"
import { Dialog, DialogContent, DialogDescription, DialogTitle } from "@/components/ui/dialog"
import { ORDER_NEXT, ORDER_STATUSES, orderCode, orderMoney, orderQuantity, type AdminOrder } from "@/lib/admin-orders"
import { STORE_TIME_ZONE } from "@/lib/admin-dashboard"
import { OrderStatusBadge } from "./order-card"

interface OrderDetailsDialogProps {
  order: AdminOrder | null
  busy: boolean
  onClose: () => void
  onReturnFocus: () => void
  onStatus: (order: AdminOrder, status: string) => void
  onPrint: (order: AdminOrder) => void
  onDelete: (order: AdminOrder) => void
}

export function OrderDetailsDialog({ order, busy, onClose, onReturnFocus, onStatus, onPrint, onDelete }: OrderDetailsDialogProps) {
  const [status, setStatus] = useState(order?.status ?? "")
  const title = useRef<HTMLHeadingElement>(null)
  useEffect(() => { setStatus(order?.status ?? "") }, [order?.id, order?.status])
  const next = order ? ORDER_NEXT[order.status] : undefined
  const hasChange = order && status !== order.status
  const stage = ORDER_STATUSES.findIndex((entry) => entry.value === order?.status)
  const date = order ? new Intl.DateTimeFormat("pt-BR", { timeZone: STORE_TIME_ZONE, day: "2-digit", month: "long", year: "numeric", hour: "2-digit", minute: "2-digit" }).format(new Date(order.createdAt)) : ""

  return (
    <Dialog open={!!order} onOpenChange={(open) => { if (!open && !busy) onClose() }}>
      <DialogContent closeLabel="Fechar detalhes"
        className="admin-orders-dialog orders-detail-dialog left-0 top-auto bottom-0 flex max-h-[94dvh] w-full max-w-none translate-x-0 translate-y-0 flex-col gap-0 rounded-t-2xl border-border bg-card p-0 sm:left-1/2 sm:top-1/2 sm:bottom-auto sm:max-h-[90dvh] sm:w-[calc(100%-2rem)] sm:max-w-3xl sm:-translate-x-1/2 sm:-translate-y-1/2 sm:rounded-2xl"
        onOpenAutoFocus={(event) => { event.preventDefault(); title.current?.focus() }}
        onCloseAutoFocus={(event) => { event.preventDefault(); onReturnFocus() }}
        onEscapeKeyDown={(event) => { if (busy) event.preventDefault() }} onPointerDownOutside={(event) => { if (busy) event.preventDefault() }}>
        {order && <>
          <header className="shrink-0 border-b border-border px-5 py-5 pr-16 sm:px-6 sm:pr-16">
            <div className="mb-2 flex flex-wrap items-center gap-2"><span className="text-[10px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">Detalhes do pedido</span><OrderStatusBadge status={order.status} /></div>
            <DialogTitle ref={title} tabIndex={-1} className="font-display text-2xl font-bold tracking-tight outline-none">Pedido #{orderCode(order)}</DialogTitle>
            <DialogDescription className="mt-1 text-xs leading-relaxed">{date}</DialogDescription>
          </header>
          <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain p-5 sm:p-6">
            {order.status !== "cancelado" && stage >= 0 && <section aria-label="Etapas do pedido" className="mb-6 rounded-xl border border-border bg-secondary/20 p-4">
              <p className="mb-4 text-xs font-medium">Etapa {stage + 1} de 5 · {ORDER_STATUSES[stage].label}</p>
              <ol className="flex items-start">
                {ORDER_STATUSES.slice(0, 5).map((step, index) => <li key={step.value} aria-current={index === stage ? "step" : undefined} className="relative flex flex-1 flex-col items-center gap-2">
                  {index < 4 && <span className={`absolute left-1/2 top-3.5 h-px w-full ${index < stage ? "bg-primary/60" : "bg-border"}`} />}
                  <span className={`relative flex h-7 w-7 items-center justify-center rounded-full border text-[10px] font-semibold ${index <= stage ? "border-primary/40 bg-primary text-primary-foreground" : "border-border bg-card text-muted-foreground"}`}>{index < stage ? <Check className="h-3.5 w-3.5" /> : index + 1}</span>
                  <span className="hidden text-center text-[10px] text-muted-foreground sm:block">{step.label}</span>
                </li>)}
              </ol>
            </section>}
            {order.status === "cancelado" && <p className="mb-6 rounded-xl border border-rose-400/15 bg-rose-400/5 p-4 text-xs leading-relaxed text-rose-300">Este pedido foi cancelado e não entra no faturamento. Os dados permanecem no histórico.</p>}

            <div className="grid gap-4 sm:grid-cols-2">
              <section className="min-w-0 rounded-xl border border-border p-4">
                <h3 className="mb-3 flex items-center gap-2 text-xs font-semibold"><UserRound className="h-4 w-4 text-primary" />Cliente</h3>
                <p className="break-words text-sm font-semibold">{order.name}</p>
                {order.phone ? <a href={`tel:${order.phone.replace(/[^+\d]/g, "")}`} className="mt-2 inline-flex min-h-10 items-center gap-2 break-all text-xs text-muted-foreground hover:text-primary"><Phone className="h-3.5 w-3.5 shrink-0" />{order.phone}</a> : <p className="mt-2 text-xs text-muted-foreground">Telefone não informado</p>}
              </section>
              <section className="min-w-0 rounded-xl border border-border p-4">
                <h3 className="mb-3 flex items-center gap-2 text-xs font-semibold"><MapPin className="h-4 w-4 text-primary" />Endereço</h3>
                <p className="break-words text-xs leading-relaxed">{[order.address, order.neighborhood].filter(Boolean).join(", ") || "Não informado"}</p>
                {order.complement && <p className="mt-2 break-words text-xs leading-relaxed text-muted-foreground">{order.complement}</p>}
              </section>
            </div>

            <section className="mt-6">
              <h3 className="mb-3 flex items-center gap-2 text-sm font-semibold"><ShoppingBag className="h-4 w-4 text-primary" />Itens do pedido <span className="ml-auto text-xs font-normal text-muted-foreground">{orderQuantity(order)} {orderQuantity(order) === 1 ? "unidade" : "unidades"}</span></h3>
              <ul className="divide-y divide-border rounded-xl border border-border px-4">
                {order.items.map((item) => <li key={item.id} className="flex items-start gap-3 py-4">
                  <span className="flex h-8 min-w-8 shrink-0 items-center justify-center rounded-lg bg-secondary px-1 text-xs font-semibold">{item.quantity}×</span>
                  <div className="min-w-0 flex-1"><p className="break-words text-xs font-medium">{item.name}</p>{item.variantName && <p className="mt-1 break-words text-[11px] text-muted-foreground">{item.variantName}</p>}<p className="mt-1 text-[11px] text-muted-foreground">{orderMoney(item.price)} por unidade</p></div>
                  <span className="shrink-0 text-xs font-semibold tabular-nums">{orderMoney(item.price * item.quantity)}</span>
                </li>)}
                {!order.items.length && <li className="py-4 text-xs text-muted-foreground">Sem itens registrados.</li>}
              </ul>
            </section>

            <section className="mt-5 rounded-xl bg-secondary/40 p-4">
              <div className="space-y-2 text-xs"><div className="flex justify-between gap-2"><span className="text-muted-foreground">Subtotal</span><span className="tabular-nums">{orderMoney(order.subtotal)}</span></div><div className="flex justify-between gap-2"><span className="text-muted-foreground">Taxa de entrega</span><span className="tabular-nums">{orderMoney(order.deliveryFee)}</span></div></div>
              <div className="mt-3 flex items-center justify-between gap-2 border-t border-border pt-3"><span className="text-sm font-semibold">Total do pedido</span><span className="font-display text-xl font-semibold tabular-nums text-primary">{orderMoney(order.total)}</span></div>
              <div className="mt-4 flex items-start gap-2 text-xs"><CreditCard className="h-4 w-4 shrink-0 text-muted-foreground" /><div className="min-w-0"><p className="break-words">{order.paymentMethod}</p>{order.changeFor && <p className="mt-1 break-words text-muted-foreground">Troco para {order.changeFor.startsWith("R$") ? order.changeFor : `R$ ${order.changeFor}`}</p>}</div></div>
            </section>
            <button onClick={() => onDelete(order)} disabled={busy} className="mt-4 inline-flex min-h-11 items-center gap-2 text-xs text-rose-300 disabled:opacity-50"><Trash2 className="h-3.5 w-3.5" />Excluir este pedido do histórico</button>
          </div>
          <footer className="shrink-0 border-t border-border bg-card p-4 sm:px-6">
            <div className="grid gap-3 sm:grid-cols-[minmax(0,1fr)_auto]">
              <div><label htmlFor="detail-status" className="mb-1.5 block text-[10px] text-muted-foreground">Situação do pedido</label><select id="detail-status" value={status} onChange={(event) => setStatus(event.target.value)} disabled={busy} className="min-h-11 w-full rounded-xl border border-border bg-background px-3 text-xs disabled:opacity-50">{ORDER_STATUSES.map((entry) => <option key={entry.value} value={entry.value}>{entry.label}</option>)}</select></div>
              <div className="flex items-end gap-2">
                <button onClick={() => onPrint(order)} disabled={busy} aria-label="Imprimir pedido em 88 mm" className="orders-button flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border border-border disabled:opacity-50"><Printer className="h-4 w-4" /></button>
                <button disabled={busy || (!hasChange && !next)} onClick={() => onStatus(order, hasChange ? status : next!.status)} className="flex min-h-11 flex-1 items-center justify-center gap-2 rounded-xl bg-primary px-4 text-xs font-semibold text-primary-foreground transition-colors hover:bg-primary/90 disabled:opacity-40">
                  {busy ? "Salvando…" : hasChange ? "Atualizar situação" : next?.label ?? "Pedido finalizado"}<ChevronRight className="h-3.5 w-3.5" />
                </button>
              </div>
            </div>
          </footer>
        </>}
      </DialogContent>
    </Dialog>
  )
}
