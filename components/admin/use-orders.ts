"use client"

import { useEffect, useRef, useState } from "react"
import { toast } from "sonner"
import type { AdminOrder, OrdersResult } from "@/lib/admin-orders"

export function useOrders(query: string) {
  const [snapshot, setSnapshot] = useState<{ query: string; result: OrdersResult } | null>(null)
  const [error, setError] = useState(false)
  const [refreshing, setRefreshing] = useState(true)
  const [revision, setRevision] = useState(0)
  const [selected, setSelected] = useState<AdminOrder | null>(null)
  const [busy, setBusy] = useState<{ id?: string; action: string } | null>(null)
  const mutation = useRef(false)
  const request = useRef<AbortController | null>(null)
  const mounted = useRef(true)

  useEffect(() => {
    mounted.current = true
    return () => { mounted.current = false }
  }, [])

  useEffect(() => {
    let disposed = false
    let inFlight = false
    setError(false)
    async function load() {
      if (inFlight || mutation.current) return
      inFlight = true
      const controller = new AbortController()
      request.current = controller
      let timedOut = false
      const timeout = setTimeout(() => { timedOut = true; controller.abort() }, 15000)
      setRefreshing(true)
      try {
        const response = await fetch(`/api/orders?${query}`, { signal: controller.signal, cache: "no-store" })
        if (!response.ok) throw new Error("Não foi possível carregar os pedidos")
        const result: OrdersResult = await response.json()
        if (!disposed && !controller.signal.aborted) {
          setSnapshot({ query, result })
          setError(false)
          setSelected((previous) => previous ? result.orders.find((order) => order.id === previous.id) ?? previous : null)
        }
      } catch {
        if (!disposed && (!controller.signal.aborted || timedOut)) setError(true)
      } finally {
        clearTimeout(timeout)
        inFlight = false
        if (!disposed) setRefreshing(false)
      }
    }
    void load()
    const interval = setInterval(() => { if (!document.hidden) void load() }, 15000)
    const onVisible = () => { if (!document.hidden) void load() }
    document.addEventListener("visibilitychange", onVisible)
    return () => {
      disposed = true
      request.current?.abort()
      clearInterval(interval)
      document.removeEventListener("visibilitychange", onVisible)
    }
  }, [query, revision])

  const refresh = () => setRevision((value) => value + 1)
  async function run(action: "status" | "delete" | "delete-all", order?: AdminOrder, status?: string) {
    if (mutation.current) return false
    mutation.current = true
    request.current?.abort()
    setBusy({ id: order?.id, action })
    try {
      const response = await fetch(order ? `/api/orders/${order.id}` : "/api/orders", {
        method: action === "status" ? "PATCH" : "DELETE",
        ...(action === "status" ? { headers: { "Content-Type": "application/json" }, body: JSON.stringify({ status }) } : {}),
      })
      if (!response.ok) throw new Error("Falha ao salvar")
      const result = await response.json()
      if (!mounted.current) return true
      if (action === "status") {
        setSelected((previous) => previous?.id === order?.id ? result : previous)
        toast.success("Situação do pedido atualizada")
      } else {
        setSelected((previous) => action === "delete-all" || previous?.id === order?.id ? null : previous)
        toast.success(action === "delete-all" ? "Histórico de pedidos excluído" : "Pedido excluído")
      }
      return true
    } catch {
      if (mounted.current) toast.error(action === "status" ? "Não foi possível atualizar o pedido. Tente novamente." : "Não foi possível excluir. Tente novamente.")
      return false
    } finally {
      mutation.current = false
      if (mounted.current) { setBusy(null); refresh() }
    }
  }

  return {
    result: snapshot?.query === query ? snapshot.result : null,
    error, refreshing, refresh, selected, setSelected, busy,
    changeStatus: (order: AdminOrder, status: string) => run("status", order, status),
    remove: (order: AdminOrder) => run("delete", order),
    removeAll: () => run("delete-all"),
  }
}
