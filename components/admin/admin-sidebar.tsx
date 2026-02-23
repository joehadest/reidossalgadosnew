"use client"

import Image from "next/image"
import { motion } from "framer-motion"
import Link from "next/link"
import {
  LayoutDashboard,
  UtensilsCrossed,
  Tag,
  Store,
  Truck,
  Clock,
  CreditCard,
  ArrowLeft,
  LogOut,
  X,
  Menu,
  ShoppingBag,
  Lock,
} from "lucide-react"

export type AdminSection =
  | "dashboard"
  | "menu"
  | "categories"
  | "store-info"
  | "delivery"
  | "hours"
  | "payments"
  | "orders"
  | "security"

interface AdminSidebarProps {
  activeSection: AdminSection
  onSectionChange: (section: AdminSection) => void
  onLogout: () => void
  mobileOpen: boolean
  onMobileClose: () => void
  ordersBadge?: number
}

const navItems: { id: AdminSection; label: string; icon: React.ReactNode }[] = [
  { id: "dashboard", label: "Dashboard", icon: <LayoutDashboard className="h-4 w-4" /> },
  { id: "menu", label: "Cardapio", icon: <UtensilsCrossed className="h-4 w-4" /> },
  { id: "categories", label: "Categorias", icon: <Tag className="h-4 w-4" /> },
  { id: "store-info", label: "Info da Loja", icon: <Store className="h-4 w-4" /> },
  { id: "delivery", label: "Taxas de Entrega", icon: <Truck className="h-4 w-4" /> },
  { id: "hours", label: "Horarios", icon: <Clock className="h-4 w-4" /> },
  { id: "payments", label: "Pagamentos", icon: <CreditCard className="h-4 w-4" /> },
  { id: "orders", label: "Pedidos", icon: <ShoppingBag className="h-4 w-4" /> },
  { id: "security", label: "Alterar senha", icon: <Lock className="h-4 w-4" /> },
]

export function AdminSidebar({ activeSection, onSectionChange, onLogout, mobileOpen, onMobileClose, ordersBadge = 0 }: AdminSidebarProps) {
  const sidebarContent = (
    <div className="flex flex-col h-full">
      {/* Logo */}
      <div className="p-4 border-b border-border flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="relative h-8 w-8 rounded-lg overflow-hidden flex-shrink-0">
            <Image
              src="/logo/logoreidossalgados.png"
              alt="Rei dos Salgados"
              fill
              className="object-cover"
              sizes="32px"
            />
          </div>
          <div>
            <p className="font-display font-bold text-sm leading-tight">Admin</p>
            <p className="text-xs text-muted-foreground">Rei dos Salgados</p>
          </div>
        </div>
        <button
          onClick={onMobileClose}
          className="lg:hidden p-1.5 rounded-lg hover:bg-secondary transition-colors"
          aria-label="Fechar menu"
        >
          <X className="h-4 w-4" />
        </button>
      </div>

      {/* Navigation */}
      <nav className="flex-1 p-3 flex flex-col gap-1">
        {navItems.map((item) => (
          <button
            key={item.id}
            onClick={() => { onSectionChange(item.id); onMobileClose() }}
            className={`relative flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition-all ${
              activeSection === item.id
                ? "bg-primary text-primary-foreground"
                : "text-muted-foreground hover:text-foreground hover:bg-secondary"
            }`}
          >
            {item.icon}
            {item.label}
            {item.id === "orders" && ordersBadge > 0 && (
              <span className="ml-auto min-w-5 h-5 rounded-full bg-amber-500 text-amber-950 text-xs font-bold flex items-center justify-center">
                {ordersBadge > 99 ? "99+" : ordersBadge}
              </span>
            )}
          </button>
        ))}
      </nav>

      {/* Footer */}
      <div className="p-3 border-t border-border flex flex-col gap-1">
        <Link
          href="/admin/balcao"
          className="flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium text-primary hover:bg-primary/10 transition-colors"
        >
          <Store className="h-4 w-4" />
          Balcão
        </Link>
        <a
          href="/"
          className="flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium text-muted-foreground hover:text-foreground hover:bg-secondary transition-colors"
        >
          <ArrowLeft className="h-4 w-4" />
          Voltar ao Site
        </a>
        <button
          onClick={onLogout}
          className="flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-colors"
        >
          <LogOut className="h-4 w-4" />
          Sair
        </button>
      </div>
    </div>
  )

  return (
    <>
      {/* Desktop sidebar */}
      <aside className="hidden lg:flex w-64 flex-shrink-0 flex-col border-r border-border bg-card h-screen sticky top-0">
        {sidebarContent}
      </aside>

      {/* Mobile sidebar overlay */}
      {mobileOpen && (
        <>
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onMobileClose}
            className="fixed inset-0 z-40 bg-black/60 backdrop-blur-sm lg:hidden"
          />
          <motion.aside
            initial={{ x: "-100%" }}
            animate={{ x: 0 }}
            exit={{ x: "-100%" }}
            transition={{ type: "spring", damping: 30, stiffness: 300 }}
            className="fixed left-0 top-0 bottom-0 z-50 w-64 bg-card border-r border-border lg:hidden"
          >
            {sidebarContent}
          </motion.aside>
        </>
      )}
    </>
  )
}

export function AdminMobileHeader({
  onMenuClick,
  title,
}: {
  onMenuClick: () => void
  title: string
}) {
  return (
    <div className="lg:hidden flex items-center gap-3 p-4 border-b border-border bg-card sticky top-0 z-30">
      <button
        onClick={onMenuClick}
        className="p-2 rounded-lg hover:bg-secondary transition-colors"
        aria-label="Abrir menu"
      >
        <Menu className="h-5 w-5" />
      </button>
      <h1 className="font-display font-bold text-base">{title}</h1>
    </div>
  )
}
