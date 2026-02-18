"use client"

import { useState, useEffect, useRef } from "react"
import { motion, AnimatePresence } from "framer-motion"
import { toast } from "sonner"
import { AdminLogin } from "@/components/admin/admin-login"
import { AdminSidebar, AdminMobileHeader, type AdminSection } from "@/components/admin/admin-sidebar"
import { DashboardSection } from "@/components/admin/dashboard-section"
import { MenuManagement } from "@/components/admin/menu-management"
import { CategoriesSection } from "@/components/admin/categories-section"
import { StoreInfoSection } from "@/components/admin/store-info-section"
import { DeliverySection } from "@/components/admin/delivery-section"
import { HoursSection } from "@/components/admin/hours-section"
import { PaymentsSection } from "@/components/admin/payments-section"
import { OrdersSection } from "@/components/admin/orders-section"
import { playNotificationSound } from "@/lib/notification-sound"

const sectionLabels: Record<AdminSection, string> = {
  dashboard: "Dashboard",
  menu: "Cardapio",
  categories: "Categorias",
  "store-info": "Info da Loja",
  delivery: "Taxas de Entrega",
  hours: "Horarios",
  payments: "Pagamentos",
  orders: "Pedidos",
}

const POLL_INTERVAL_MS = 20000

export default function AdminPage() {
  const [authenticated, setAuthenticated] = useState(false)
  const [activeSection, setActiveSection] = useState<AdminSection>("dashboard")
  const [mobileOpen, setMobileOpen] = useState(false)
  const [hydrated, setHydrated] = useState(false)
  const [ordersBadge, setOrdersBadge] = useState(0)
  const lastPollTimeRef = useRef<number | null>(null)

  useEffect(() => {
    const auth = localStorage.getItem("rs-admin-auth")
    if (auth === "true") setAuthenticated(true)
    setHydrated(true)
  }, [])

  useEffect(() => {
    if (!authenticated) return
    if ("Notification" in window && Notification.permission === "default") {
      Notification.requestPermission()
    }
  }, [authenticated])

  useEffect(() => {
    if (!authenticated) return

    async function fetchBadge() {
      try {
        const res = await fetch("/api/orders?status=recebido&limit=1")
        if (!res.ok) return
        const data = await res.json()
        setOrdersBadge(data.total ?? 0)
      } catch {
        // ignore
      }
    }

    fetchBadge()
  }, [authenticated])

  useEffect(() => {
    if (!authenticated) return

    async function poll() {
      try {
        const [badgeRes, newRes] = await Promise.all([
          fetch("/api/orders?status=recebido&limit=1"),
          fetch("/api/orders?new=true"),
        ])
        if (badgeRes.ok) {
          const badgeData = await badgeRes.json()
          setOrdersBadge(badgeData.total ?? 0)
        }
        if (newRes.ok) {
          const newData = await newRes.json()
          const orders = newData.orders ?? []
          const now = Date.now()
          if (lastPollTimeRef.current !== null) {
            const newOrders = orders.filter((o: { createdAt: string }) => new Date(o.createdAt).getTime() > lastPollTimeRef.current!)
            if (newOrders.length > 0) {
              playNotificationSound()
              toast.success("Novo pedido!", { description: `${newOrders.length} pedido(s) recebido(s)` })
              if ("Notification" in window && Notification.permission === "granted") {
                const title = newOrders.length === 1 ? "Novo pedido!" : `${newOrders.length} novos pedidos!`
                const body = newOrders.length === 1
                  ? `${newOrders[0].name} - R$ ${Number(newOrders[0].total).toFixed(2).replace(".", ",")}`
                  : `${newOrders.length} pedido(s) recebido(s)`
                new Notification(title, {
                  body,
                  icon: "/logo/logoreidossalgados.png",
                })
              }
            }
          }
          lastPollTimeRef.current = now
        }
      } catch {
        // ignore
      }
    }

    const id = setInterval(poll, POLL_INTERVAL_MS)
    return () => clearInterval(id)
  }, [authenticated])

  function handleLogout() {
    localStorage.removeItem("rs-admin-auth")
    setAuthenticated(false)
  }

  if (!hydrated) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="h-8 w-8 rounded-full border-2 border-primary border-t-transparent animate-spin" />
      </div>
    )
  }

  if (!authenticated) {
    return <AdminLogin onLogin={() => setAuthenticated(true)} />
  }

  return (
    <div className="min-h-screen bg-background flex">
      <AdminSidebar
        activeSection={activeSection}
        onSectionChange={setActiveSection}
        onLogout={handleLogout}
        mobileOpen={mobileOpen}
        onMobileClose={() => setMobileOpen(false)}
        ordersBadge={ordersBadge}
      />

      <div className="flex-1 min-w-0">
        <AdminMobileHeader
          onMenuClick={() => setMobileOpen(true)}
          title={sectionLabels[activeSection]}
        />

        <main className="p-4 sm:p-6 lg:p-8 max-w-5xl">
          <AnimatePresence mode="wait">
            <motion.div
              key={activeSection}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              transition={{ duration: 0.2 }}
            >
              {activeSection === "dashboard" && (
                <DashboardSection onNavigate={setActiveSection} />
              )}
              {activeSection === "menu" && <MenuManagement />}
              {activeSection === "categories" && <CategoriesSection />}
              {activeSection === "store-info" && <StoreInfoSection />}
              {activeSection === "delivery" && <DeliverySection />}
              {activeSection === "hours" && <HoursSection />}
              {activeSection === "payments" && <PaymentsSection />}
              {activeSection === "orders" && <OrdersSection />}
            </motion.div>
          </AnimatePresence>
        </main>
      </div>
    </div>
  )
}
