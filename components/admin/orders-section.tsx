"use client"

import { useState, useEffect, useCallback } from "react"
import { motion, AnimatePresence } from "framer-motion"
import { ShoppingBag, Phone, MapPin, X, RefreshCw, Printer, Trash2, Trash } from "lucide-react"
import { useAdmin } from "@/lib/admin-context"
import { printOrderThermal } from "@/lib/thermal-print"

const STATUS_LABELS: Record<string, string> = {
  recebido: "Recebido",
  confirmado: "Confirmado",
  preparando: "Em preparação",
  entrega: "Saiu para entrega",
  entregue: "Entregue",
  cancelado: "Cancelado",
}

const STATUS_OPTIONS = [
  { value: "recebido", label: "Recebido" },
  { value: "confirmado", label: "Confirmado" },
  { value: "preparando", label: "Em preparação" },
  { value: "entrega", label: "Saiu para entrega" },
  { value: "entregue", label: "Entregue" },
  { value: "cancelado", label: "Cancelado" },
]

interface OrderItem {
  id: string
  itemId: string
  variantId: string | null
  name: string
  variantName: string | null
  price: number
  quantity: number
}

interface Order {
  id: string
  name: string
  phone: string
  address: string
  neighborhood: string
  complement: string | null
  paymentMethod: string
  changeFor: string | null
  subtotal: number
  deliveryFee: number
  total: number
  status: string
  createdAt: string
  items: OrderItem[]
}

export function OrdersSection() {
  const { store } = useAdmin()
  const [orders, setOrders] = useState<Order[]>([])
  const [loading, setLoading] = useState(true)
  const [statusFilter, setStatusFilter] = useState<string>("")
  const [dateFilter, setDateFilter] = useState<string>("todos")
  const [detailOrder, setDetailOrder] = useState<Order | null>(null)
  const [updatingId, setUpdatingId] = useState<string | null>(null)
  const [deletingId, setDeletingId] = useState<string | null>(null)
  const [deletingAll, setDeletingAll] = useState(false)

  const fetchOrders = useCallback(async (silent = false) => {
    if (!silent) setLoading(true)
    try {
      const params = new URLSearchParams()
      if (statusFilter) params.set("status", statusFilter)
      if (dateFilter !== "todos") params.set("date", dateFilter)
      const res = await fetch(`/api/orders?${params}`)
      if (!res.ok) throw new Error("Erro ao carregar pedidos")
      const data = await res.json()
      const newOrders = data.orders || []
      setOrders(newOrders)
      setDetailOrder((prev) => {
        if (!prev) return null
        const updated = newOrders.find((o: Order) => o.id === prev.id)
        return updated ?? prev
      })
    } catch {
      if (!silent) setOrders([])
    } finally {
      if (!silent) setLoading(false)
    }
  }, [statusFilter, dateFilter])

  useEffect(() => {
    fetchOrders()
  }, [fetchOrders])

  useEffect(() => {
    const id = setInterval(() => fetchOrders(true), 15000)
    return () => clearInterval(id)
  }, [fetchOrders])

  async function deleteAllOrders() {
    if (!confirm("Tem certeza que deseja apagar TODOS os pedidos? Esta ação não pode ser desfeita.")) return
    setDeletingAll(true)
    try {
      const res = await fetch("/api/orders", { method: "DELETE" })
      if (!res.ok) throw new Error("Erro ao apagar pedidos")
      setOrders([])
      setDetailOrder(null)
    } catch {
      alert("Erro ao apagar pedidos")
    } finally {
      setDeletingAll(false)
    }
  }

  async function deleteOrder(orderId: string) {
    if (!confirm("Tem certeza que deseja remover este pedido? Esta ação não pode ser desfeita.")) return
    setDeletingId(orderId)
    try {
      const res = await fetch(`/api/orders/${orderId}`, { method: "DELETE" })
      if (!res.ok) throw new Error("Erro ao remover")
      setOrders((prev) => prev.filter((o) => o.id !== orderId))
      if (detailOrder?.id === orderId) setDetailOrder(null)
    } catch {
      alert("Erro ao remover pedido")
    } finally {
      setDeletingId(null)
    }
  }

  async function updateStatus(orderId: string, status: string) {
    setUpdatingId(orderId)
    try {
      const res = await fetch(`/api/orders/${orderId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status }),
      })
      if (!res.ok) throw new Error("Erro ao atualizar")
      const updated = await res.json()
      setOrders((prev) => prev.map((o) => (o.id === orderId ? updated : o)))
      if (detailOrder?.id === orderId) setDetailOrder(updated)
    } catch {
      alert("Erro ao atualizar status")
    } finally {
      setUpdatingId(null)
    }
  }

  function formatDate(dateStr: string) {
    const d = new Date(dateStr)
    return d.toLocaleDateString("pt-BR", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    })
  }

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h2 className="font-display text-2xl font-bold">Pedidos</h2>
          <p className="text-sm text-muted-foreground mt-1">Gerencie os pedidos recebidos</p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={fetchOrders}
            disabled={loading}
            className="flex items-center gap-2 rounded-xl border border-border px-4 py-2.5 text-sm font-medium hover:bg-secondary transition-colors disabled:opacity-50"
          >
            <RefreshCw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} />
            Atualizar
          </button>
          <button
            onClick={deleteAllOrders}
            disabled={loading || orders.length === 0 || deletingAll}
            className="flex items-center gap-2 rounded-xl border border-destructive/50 px-4 py-2.5 text-sm font-medium text-destructive hover:bg-destructive/10 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            title="Apagar todos os pedidos"
          >
            <Trash className={`h-4 w-4 ${deletingAll ? "animate-pulse" : ""}`} />
            {deletingAll ? "Apagando..." : "Apagar todos"}
          </button>
        </div>
      </div>

      {/* Filtros */}
      <div className="flex flex-wrap gap-3">
        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          className="rounded-lg border border-border bg-card px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/50"
        >
          <option value="">Todos os status</option>
          {STATUS_OPTIONS.map((o) => (
            <option key={o.value} value={o.value}>
              {o.label}
            </option>
          ))}
        </select>
        <select
          value={dateFilter}
          onChange={(e) => setDateFilter(e.target.value)}
          className="rounded-lg border border-border bg-card px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/50"
        >
          <option value="hoje">Hoje</option>
          <option value="semana">Esta semana</option>
          <option value="todos">Todos</option>
        </select>
      </div>

      {/* Lista de pedidos */}
      {loading ? (
        <div className="flex justify-center py-12">
          <div className="h-8 w-8 rounded-full border-2 border-primary border-t-transparent animate-spin" />
        </div>
      ) : orders.length === 0 ? (
        <div className="rounded-2xl border border-border bg-card p-12 text-center">
          <ShoppingBag className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
          <p className="text-muted-foreground">Nenhum pedido encontrado</p>
        </div>
      ) : (
        <div className="flex flex-col gap-4">
          {orders.map((order) => (
            <motion.div
              key={order.id}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className="rounded-2xl border border-border bg-card p-4 sm:p-5"
            >
              <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <h3 className="font-semibold text-sm">{order.name}</h3>
                    <span
                      className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${
                        order.status === "recebido"
                          ? "bg-amber-500/15 text-amber-600 dark:text-amber-400"
                          : order.status === "entregue" || order.status === "cancelado"
                            ? "bg-muted text-muted-foreground"
                            : "bg-primary/15 text-primary"
                      }`}
                    >
                      {STATUS_LABELS[order.status] || order.status}
                    </span>
                  </div>
                  <p className="text-xs text-muted-foreground mt-1">
                    {order.items.length} itens • R$ {order.total.toFixed(2).replace(".", ",")}
                  </p>
                  <p className="text-xs text-muted-foreground">{formatDate(order.createdAt)}</p>
                </div>
                <div className="flex items-center gap-2">
                  <select
                    value={order.status}
                    onChange={(e) => updateStatus(order.id, e.target.value)}
                    disabled={updatingId === order.id}
                    className="rounded-lg border border-border bg-card px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/50 disabled:opacity-50"
                  >
                    {STATUS_OPTIONS.map((o) => (
                      <option key={o.value} value={o.value}>
                        {o.label}
                      </option>
                    ))}
                  </select>
                  <button
                    onClick={() => printOrderThermal(order, store.name)}
                    className="rounded-lg border border-border px-3 py-2 text-sm font-medium hover:bg-secondary transition-colors flex items-center gap-1.5"
                    title="Imprimir em impressora térmica 88mm"
                  >
                    <Printer className="h-4 w-4" />
                    Imprimir
                  </button>
                  <button
                    onClick={() => setDetailOrder(order)}
                    className="rounded-lg border border-border px-3 py-2 text-sm font-medium hover:bg-secondary transition-colors"
                  >
                    Detalhes
                  </button>
                  <button
                    onClick={() => deleteOrder(order.id)}
                    disabled={deletingId === order.id}
                    className="rounded-lg border border-destructive/50 px-3 py-2 text-sm font-medium text-destructive hover:bg-destructive/10 transition-colors disabled:opacity-50"
                    title="Remover pedido"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              </div>
            </motion.div>
          ))}
        </div>
      )}

      {/* Modal de detalhes */}
      <AnimatePresence>
        {detailOrder && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setDetailOrder(null)}
              className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm"
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="fixed inset-4 z-50 m-auto max-w-lg max-h-[90vh] overflow-y-auto rounded-2xl bg-card border border-border flex flex-col"
            >
              <div className="flex items-center justify-between p-4 border-b border-border sticky top-0 bg-card z-10">
                <h3 className="font-display text-lg font-bold">Pedido #{detailOrder.id.slice(-6)}</h3>
                <button
                  onClick={() => setDetailOrder(null)}
                  className="p-2 rounded-lg hover:bg-secondary transition-colors"
                  aria-label="Fechar"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>
              <div className="p-4 flex flex-col gap-4">
                <div className="flex items-center gap-2">
                  <span
                    className={`inline-flex rounded-full px-2.5 py-0.5 text-xs font-medium ${
                      detailOrder.status === "recebido"
                        ? "bg-amber-500/15 text-amber-600 dark:text-amber-400"
                        : "bg-primary/15 text-primary"
                    }`}
                  >
                    {STATUS_LABELS[detailOrder.status] || detailOrder.status}
                  </span>
                  <span className="text-xs text-muted-foreground">{formatDate(detailOrder.createdAt)}</span>
                </div>
                <div className="flex items-center gap-2">
                  <Phone className="h-4 w-4 text-muted-foreground" />
                  <a href={`tel:${detailOrder.phone}`} className="text-sm hover:underline">
                    {detailOrder.phone}
                  </a>
                </div>
                <div className="flex items-start gap-2">
                  <MapPin className="h-4 w-4 text-muted-foreground mt-0.5" />
                  <div className="text-sm">
                    <p>
                      {detailOrder.address}, {detailOrder.neighborhood}
                    </p>
                    {detailOrder.complement && (
                      <p className="text-muted-foreground">{detailOrder.complement}</p>
                    )}
                  </div>
                </div>
                <div>
                  <h4 className="font-semibold text-sm mb-2">Itens</h4>
                  <ul className="space-y-1">
                    {detailOrder.items.map((item) => (
                      <li key={item.id} className="text-sm flex justify-between">
                        <span>
                          {item.quantity}x {item.name}
                          {item.variantName && ` (${item.variantName})`}
                        </span>
                        <span>R$ {(item.price * item.quantity).toFixed(2).replace(".", ",")}</span>
                      </li>
                    ))}
                  </ul>
                </div>
                <div className="border-t border-border pt-4 space-y-1 text-sm">
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Subtotal</span>
                    <span>R$ {detailOrder.subtotal.toFixed(2).replace(".", ",")}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Entrega</span>
                    <span>R$ {detailOrder.deliveryFee.toFixed(2).replace(".", ",")}</span>
                  </div>
                  <div className="flex justify-between font-bold text-base pt-2">
                    <span>Total</span>
                    <span className="text-primary">R$ {detailOrder.total.toFixed(2).replace(".", ",")}</span>
                  </div>
                </div>
                <p className="text-sm text-muted-foreground">
                  Pagamento: {detailOrder.paymentMethod}
                  {detailOrder.changeFor && ` • Troco para: R$ ${detailOrder.changeFor}`}
                </p>
                <button
                  onClick={() => printOrderThermal(detailOrder, store.name)}
                  className="flex items-center justify-center gap-2 rounded-xl bg-primary py-3 text-sm font-bold text-primary-foreground hover:bg-primary/90 transition-colors"
                  title="Imprimir em impressora térmica 88mm"
                >
                  <Printer className="h-4 w-4" />
                  Imprimir pedido (88mm)
                </button>
                <select
                  value={detailOrder.status}
                  onChange={(e) => updateStatus(detailOrder.id, e.target.value)}
                  disabled={updatingId === detailOrder.id}
                  className="rounded-lg border border-border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/50"
                >
                  {STATUS_OPTIONS.map((o) => (
                    <option key={o.value} value={o.value}>
                      {o.label}
                    </option>
                  ))}
                </select>
                <button
                  onClick={() => deleteOrder(detailOrder.id)}
                  disabled={deletingId === detailOrder.id}
                  className="flex items-center justify-center gap-2 rounded-xl border border-destructive/50 py-3 text-sm font-medium text-destructive hover:bg-destructive/10 transition-colors disabled:opacity-50"
                >
                  <Trash2 className="h-4 w-4" />
                  Remover pedido
                </button>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  )
}
