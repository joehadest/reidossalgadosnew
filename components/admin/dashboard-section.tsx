"use client"

import { motion } from "framer-motion"
import { UtensilsCrossed, Tag, Truck, Clock, CreditCard, TrendingUp } from "lucide-react"
import { useAdmin } from "@/lib/admin-context"
import type { AdminSection } from "./admin-sidebar"

interface DashboardSectionProps {
  onNavigate: (section: AdminSection) => void
}

export function DashboardSection({ onNavigate }: DashboardSectionProps) {
  const { store, categories, menuItems } = useAdmin()

  const stats = [
    {
      label: "Itens no Cardapio",
      value: menuItems.length,
      icon: <UtensilsCrossed className="h-5 w-5" />,
      section: "menu" as AdminSection,
    },
    {
      label: "Categorias",
      value: categories.length,
      icon: <Tag className="h-5 w-5" />,
      section: "categories" as AdminSection,
    },
    {
      label: "Bairros Atendidos",
      value: store.deliveryFees.length,
      icon: <Truck className="h-5 w-5" />,
      section: "delivery" as AdminSection,
    },
    {
      label: "Formas de Pagamento",
      value: store.paymentMethods.length,
      icon: <CreditCard className="h-5 w-5" />,
      section: "payments" as AdminSection,
    },
  ]

  const now = new Date()
  const dayIndex = now.getDay()
  const days = ["Domingo", "Segunda", "Terca", "Quarta", "Quinta", "Sexta", "Sabado"]
  const today = days[dayIndex]
  const schedule = store.hours.find((h) => h.day === today)

  const isOpen = (() => {
    if (!schedule) return false
    const [openH, openM] = schedule.open.split(":").map(Number)
    const [closeH, closeM] = schedule.close.split(":").map(Number)
    const currentMinutes = now.getHours() * 60 + now.getMinutes()
    return currentMinutes >= openH * 60 + openM && currentMinutes <= closeH * 60 + closeM
  })()

  const avgPrice = menuItems.length > 0
    ? (menuItems.reduce((sum, i) => sum + i.price, 0) / menuItems.length)
    : 0

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h2 className="font-display text-2xl font-bold">Dashboard</h2>
        <p className="text-sm text-muted-foreground mt-1">Visao geral do seu restaurante</p>
      </div>

      {/* Store Status */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        className="rounded-2xl border border-border bg-card p-5 flex items-center justify-between"
      >
        <div className="flex items-center gap-4">
          <div className="h-12 w-12 rounded-xl bg-primary/10 flex items-center justify-center">
            <Clock className="h-6 w-6 text-primary" />
          </div>
          <div>
            <h3 className="font-semibold text-sm">Status da Loja</h3>
            <p className="text-xs text-muted-foreground">
              {today} - {schedule ? `${schedule.open} ate ${schedule.close}` : "Sem horario"}
            </p>
          </div>
        </div>
        <span
          className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-semibold ${
            isOpen
              ? "bg-green-500/15 text-green-400 border border-green-500/20"
              : "bg-red-500/15 text-red-400 border border-red-500/20"
          }`}
        >
          <span className={`h-2 w-2 rounded-full ${isOpen ? "bg-green-500" : "bg-red-500"}`} />
          {isOpen ? "Aberto" : "Fechado"}
        </span>
      </motion.div>

      {/* Stats Grid */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {stats.map((stat, index) => (
          <motion.button
            key={stat.label}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: index * 0.05 }}
            onClick={() => onNavigate(stat.section)}
            className="rounded-2xl border border-border bg-card p-5 flex flex-col gap-3 hover:border-primary/30 transition-colors text-left"
          >
            <div className="h-10 w-10 rounded-xl bg-primary/10 flex items-center justify-center text-primary">
              {stat.icon}
            </div>
            <div>
              <p className="font-display text-2xl font-bold">{stat.value}</p>
              <p className="text-xs text-muted-foreground">{stat.label}</p>
            </div>
          </motion.button>
        ))}
      </div>

      {/* Quick Info */}
      <div className="grid gap-4 sm:grid-cols-2">
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="rounded-2xl border border-border bg-card p-5"
        >
          <div className="flex items-center gap-2 mb-4">
            <TrendingUp className="h-4 w-4 text-primary" />
            <h3 className="font-semibold text-sm">Preco Medio</h3>
          </div>
          <p className="font-display text-3xl font-bold text-primary">
            R$ {avgPrice.toFixed(2).replace(".", ",")}
          </p>
          <p className="text-xs text-muted-foreground mt-1">por item do cardapio</p>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.25 }}
          className="rounded-2xl border border-border bg-card p-5"
        >
          <div className="flex items-center gap-2 mb-4">
            <Truck className="h-4 w-4 text-primary" />
            <h3 className="font-semibold text-sm">Faixa de Entrega</h3>
          </div>
          {store.deliveryFees.length > 0 ? (
            <>
              <p className="font-display text-3xl font-bold text-primary">
                R$ {Math.min(...store.deliveryFees.map(f => f.fee)).toFixed(2).replace(".", ",")} - R$ {Math.max(...store.deliveryFees.map(f => f.fee)).toFixed(2).replace(".", ",")}
              </p>
              <p className="text-xs text-muted-foreground mt-1">{store.deliveryFees.length} bairros atendidos</p>
            </>
          ) : (
            <p className="text-sm text-muted-foreground">Nenhum bairro cadastrado</p>
          )}
        </motion.div>
      </div>
    </div>
  )
}
