"use client"

import Image from "next/image"
import { useEffect } from "react"
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
  Menu,
  ShoppingBag,
  Lock,
  DollarSign,
  ChevronRight,
  ExternalLink,
} from "lucide-react"
import { NotificationBell } from "./notification-bell"
import { Sheet, SheetContent, SheetDescription, SheetTitle } from "@/components/ui/sheet"

export type AdminSection =
  | "dashboard"
  | "menu"
  | "categories"
  | "store-info"
  | "delivery"
  | "hours"
  | "payments"
  | "orders"
  | "profit"
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
  { id: "menu", label: "Cardápio", icon: <UtensilsCrossed className="h-4 w-4" /> },
  { id: "categories", label: "Categorias", icon: <Tag className="h-4 w-4" /> },
  { id: "store-info", label: "Informações da loja", icon: <Store className="h-4 w-4" /> },
  { id: "delivery", label: "Taxas de Entrega", icon: <Truck className="h-4 w-4" /> },
  { id: "hours", label: "Horários", icon: <Clock className="h-4 w-4" /> },
  { id: "payments", label: "Pagamentos", icon: <CreditCard className="h-4 w-4" /> },
  { id: "orders", label: "Pedidos", icon: <ShoppingBag className="h-4 w-4" /> },
  { id: "profit", label: "Faturamento", icon: <DollarSign className="h-4 w-4" /> },
  { id: "security", label: "Alterar senha", icon: <Lock className="h-4 w-4" /> },
]

export function AdminSidebar({
  activeSection,
  onSectionChange,
  onLogout,
  mobileOpen,
  onMobileClose,
  ordersBadge = 0,
}: AdminSidebarProps) {
  useEffect(() => {
    if (!mobileOpen) return
    const desktop = window.matchMedia("(min-width: 1024px)")
    const closeOnDesktop = () => { if (desktop.matches) onMobileClose() }
    closeOnDesktop()
    desktop.addEventListener("change", closeOnDesktop)
    return () => desktop.removeEventListener("change", closeOnDesktop)
  }, [mobileOpen, onMobileClose])

  const sidebarContent = (
    <div className="admin-navigation flex h-full min-h-0 flex-col">
      <div className="flex items-center gap-3 border-b border-border px-5 py-6">
        <div className="flex items-center gap-3">
          <div className="relative h-10 w-10 rounded-xl overflow-hidden flex-shrink-0 ring-1 ring-white/10">
            <Image
              src="/logo/logoreidossalgados.png"
              alt="Rei dos Salgados"
              fill
              className="object-cover"
              sizes="40px"
            />
          </div>
          <div>
            <p className="font-display font-bold text-sm leading-tight">Rei dos Salgados</p>
            <p className="mt-1 text-[10px] uppercase tracking-[0.16em] text-muted-foreground">Administração</p>
          </div>
        </div>
      </div>

      <nav aria-label="Navegação administrativa" className="flex-1 overflow-y-auto px-3 py-5">
        {[
          { label: "Operação", ids: ["dashboard", "orders", "profit"] },
          { label: "Gestão da loja", ids: ["menu", "categories", "store-info", "delivery", "hours", "payments"] },
          { label: "Conta", ids: ["security"] },
        ].map((group) => (
          <div key={group.label} className="mb-5 last:mb-0">
            <p className="mb-2 px-3 text-[10px] font-semibold uppercase tracking-[0.14em] text-muted-foreground/80">{group.label}</p>
            <div className="flex flex-col gap-1">
        {group.ids.map((id) => navItems.find((item) => item.id === id)!).map((item) => (
          <button
            key={item.id}
            onClick={() => {
              onSectionChange(item.id)
              onMobileClose()
            }}
            aria-current={activeSection === item.id ? "page" : undefined}
            className={`relative flex min-h-11 w-full items-center gap-3 rounded-xl px-3 py-2.5 text-left text-xs font-medium transition-colors ${
              activeSection === item.id
                ? "bg-primary/10 text-primary ring-1 ring-inset ring-primary/15"
                : "text-muted-foreground hover:text-foreground hover:bg-secondary"
            }`}
          >
            {item.icon}
            {item.label}
            {activeSection === item.id && item.id !== "orders" && <ChevronRight className="ml-auto h-3.5 w-3.5" />}
            {item.id === "orders" && ordersBadge > 0 && (
              <span className="ml-auto min-w-5 h-5 rounded-full bg-amber-500 text-amber-950 text-xs font-bold flex items-center justify-center">
                {ordersBadge > 99 ? "99+" : ordersBadge}
              </span>
            )}
          </button>
        ))}
            </div>
          </div>
        ))}
      </nav>

      <div className="p-3 border-t border-border flex flex-col gap-1">
        <NotificationBell />
        <Link
          href="/admin/balcao"
          onClick={onMobileClose}
          className="flex min-h-11 items-center gap-3 rounded-xl border border-primary/15 bg-primary/5 px-3 py-2.5 text-xs font-medium text-primary hover:bg-primary/10 transition-colors"
        >
          <Store className="h-4 w-4" />
          Balcão
        </Link>
        <a
          href="/"
          className="flex min-h-11 items-center gap-3 rounded-xl px-3 py-2.5 text-xs font-medium text-muted-foreground hover:text-foreground hover:bg-secondary transition-colors"
        >
          <ArrowLeft className="h-4 w-4" />
          Voltar ao Site
        </a>
        <button
          onClick={onLogout}
          className="flex min-h-11 items-center gap-3 rounded-xl px-3 py-2.5 text-xs font-medium text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-colors"
        >
          <LogOut className="h-4 w-4" />
          Sair
        </button>
      </div>
    </div>
  )

  return (
    <>
      <aside className="hidden lg:flex w-60 flex-shrink-0 flex-col border-r border-border bg-card h-dvh sticky top-0">
        {sidebarContent}
      </aside>

      <Sheet open={mobileOpen} onOpenChange={(open) => { if (!open) onMobileClose() }}>
        <SheetContent side="left" closeLabel="Fechar menu" className="admin-mobile-navigation w-[min(90vw,19rem)] p-0"
          onCloseAutoFocus={(event) => { event.preventDefault(); document.getElementById("admin-menu-trigger")?.focus() }}>
          <SheetTitle className="sr-only">Menu administrativo</SheetTitle>
          <SheetDescription className="sr-only">Navegue entre as seções de gestão da loja.</SheetDescription>
          {sidebarContent}
        </SheetContent>
      </Sheet>
    </>
  )
}

export function AdminMobileHeader({
  onMenuClick,
  title,
  mobileOpen,
}: {
  onMenuClick: () => void
  title: string
  mobileOpen: boolean
}) {
  return (
    <div className="admin-topbar sticky top-0 z-30 flex min-h-[72px] items-center justify-between gap-3 border-b border-border bg-background/90 px-4 backdrop-blur-xl sm:px-6 lg:px-8">
      <div className="flex min-w-0 items-center gap-3">
      <button
        id="admin-menu-trigger"
        onClick={onMenuClick}
        className="lg:hidden flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border border-border hover:bg-secondary transition-colors"
        aria-label="Abrir menu"
        aria-expanded={mobileOpen}
        aria-haspopup="dialog"
      >
        <Menu className="h-5 w-5" />
      </button>
      <span className="hidden text-xs text-muted-foreground lg:inline">Administração</span>
      <ChevronRight className="hidden h-3.5 w-3.5 text-muted-foreground lg:block" />
      <span className="truncate text-sm font-medium">{title}</span>
      </div>
      <Link href="/" target="_blank" rel="noopener noreferrer" aria-label="Visualizar loja (abre em nova aba)" className="inline-flex min-h-11 shrink-0 items-center gap-2 text-xs text-muted-foreground transition-colors hover:text-primary">
        <span className="hidden sm:inline">Ver loja</span><ExternalLink className="h-4 w-4" /><span className="sr-only">(abre em nova aba)</span>
      </Link>
    </div>
  )
}
