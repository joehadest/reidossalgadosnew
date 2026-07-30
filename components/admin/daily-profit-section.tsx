"use client"

import { useState, useEffect, useCallback } from "react"
import { motion } from "framer-motion"
import { RefreshCw, DollarSign, Calendar, CalendarDays, CalendarRange } from "lucide-react"

type Period = "hoje" | "ontem" | "semana" | "mes" | "mes-anterior"

interface PeriodSummary {
  total: number
  count: number
}

type Summary = Record<Period, PeriodSummary>

const PERIOD_CARDS: { id: Period; label: string; icon: React.ReactNode }[] = [
  { id: "hoje", label: "Hoje", icon: <DollarSign className="h-5 w-5" /> },
  { id: "ontem", label: "Ontem", icon: <Calendar className="h-5 w-5" /> },
  { id: "semana", label: "Esta Semana", icon: <CalendarDays className="h-5 w-5" /> },
  { id: "mes", label: "Este Mes", icon: <CalendarRange className="h-5 w-5" /> },
  { id: "mes-anterior", label: "Mes Anterior", icon: <CalendarRange className="h-5 w-5" /> },
]

function formatMoney(value: number) {
  return `R$ ${value.toFixed(2).replace(".", ",")}`
}

export function DailyProfitSection() {
  const [summary, setSummary] = useState<Summary | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(false)

  const fetchSummary = useCallback(async () => {
    setLoading(true)
    setError(false)
    try {
      const res = await fetch("/api/orders/summary")
      if (!res.ok) throw new Error("Erro ao carregar resumo")
      const data = await res.json()
      setSummary(data)
    } catch {
      setError(true)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchSummary()
  }, [fetchSummary])

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h2 className="font-display text-2xl font-bold">Faturamento</h2>
          <p className="text-sm text-muted-foreground mt-1">
            Total de vendas por periodo (pedidos cancelados nao contam)
          </p>
        </div>
        <button
          onClick={fetchSummary}
          disabled={loading}
          className="flex items-center justify-center gap-2 rounded-xl border border-border px-4 py-2.5 text-sm font-medium hover:bg-secondary transition-colors disabled:opacity-50 w-full sm:w-auto"
        >
          <RefreshCw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} />
          Atualizar
        </button>
      </div>

      {loading && !summary ? (
        <div className="flex justify-center py-12">
          <div className="h-8 w-8 rounded-full border-2 border-primary border-t-transparent animate-spin" />
        </div>
      ) : error || !summary ? (
        <div className="rounded-2xl border border-border bg-card p-12 text-center">
          <DollarSign className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
          <p className="text-muted-foreground">Nao foi possivel carregar o resumo</p>
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {PERIOD_CARDS.map((card, index) => {
            const data = summary[card.id]
            return (
              <motion.div
                key={card.id}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.05 }}
                className="rounded-2xl border border-border bg-card p-5 flex flex-col gap-3"
              >
                <div className="flex items-center gap-2">
                  <div className="h-10 w-10 rounded-xl bg-primary/10 flex items-center justify-center text-primary">
                    {card.icon}
                  </div>
                  <h3 className="font-semibold text-sm">{card.label}</h3>
                </div>
                <p className="font-display text-2xl font-bold text-primary">
                  {formatMoney(data.total)}
                </p>
                <p className="text-xs text-muted-foreground">
                  {data.count} {data.count === 1 ? "pedido" : "pedidos"}
                  {data.count > 0 && ` • ticket medio ${formatMoney(data.total / data.count)}`}
                </p>
              </motion.div>
            )
          })}
        </div>
      )}
    </div>
  )
}
