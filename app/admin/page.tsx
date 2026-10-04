"use client"

import { useState, useEffect, useRef } from "react"
import { useSearchParams, useRouter } from "next/navigation"
import { motion, AnimatePresence, MotionConfig } from "framer-motion"
import { toast } from "sonner"
import { AdminLogin } from "@/components/admin/admin-login"
import { AdminSidebar, AdminMobileHeader, type AdminSection } from "@/components/admin/admin-sidebar"
import { DashboardSection } from "@/components/admin/dashboard-section"
import { MenuManagement } from "@/components/admin/menu-management"
import { CategoriesSection } from "@/components/admin/categories-section"
import { StoreInfoSection, type StoreNavigationGuard } from "@/components/admin/store-info-section"
import { DeliverySection } from "@/components/admin/delivery-section"
import { HoursSection } from "@/components/admin/hours-section"
import { PaymentsSection } from "@/components/admin/payments-section"
import { OrdersSection } from "@/components/admin/orders-section"
import { DailyProfitSection } from "@/components/admin/daily-profit-section"
import { PasswordSection } from "@/components/admin/password-section"
import { playNotificationSound } from "@/lib/notification-sound"

const VALID_SECTIONS: AdminSection[] = [
  "dashboard", "menu", "categories", "store-info", "delivery", "hours", "payments", "orders", "profit", "security"
]

const sectionLabels: Record<AdminSection, string> = {
  dashboard: "Dashboard",
  menu: "Cardápio",
  categories: "Categorias",
  "store-info": "Informações da loja",
  delivery: "Taxas de Entrega",
  hours: "Horários",
  payments: "Pagamentos",
  orders: "Pedidos",
  profit: "Faturamento",
  security: "Alterar senha",
}

const POLL_INTERVAL_MS = 20000

export default function AdminPage() {
  const searchParams = useSearchParams()
  const router = useRouter()
  const [authenticated, setAuthenticated] = useState(false)
  const [activeSection, setActiveSection] = useState<AdminSection>(() => {
    if (typeof window === "undefined") return "dashboard"
    const s = new URLSearchParams(window.location.search).get("section")
    return (s && VALID_SECTIONS.includes(s as AdminSection)) ? s as AdminSection : "dashboard"
  })
  const [mobileOpen, setMobileOpen] = useState(false)
  const [hydrated, setHydrated] = useState(false)
  const [ordersBadge, setOrdersBadge] = useState(0)
  const lastPollTimeRef = useRef<number | null>(null)
  const flashIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null)
  const originalTitleRef = useRef<string>("")
  const storeNavigationGuard = useRef<StoreNavigationGuard>(null)

  useEffect(() => {
    const auth = localStorage.getItem("rs-admin-auth")
    if (auth === "true") setAuthenticated(true)
    setHydrated(true)
  }, [])

  useEffect(() => {
    const section = searchParams.get("section")
    if (section && VALID_SECTIONS.includes(section as AdminSection) && section !== activeSection) {
      if ((activeSection === "store-info" || activeSection === "hours" || activeSection === "security") && storeNavigationGuard.current) {
        const restored = new URLSearchParams(searchParams.toString())
        restored.set("section", activeSection)
        router.replace(`/admin?${restored.toString()}`, { scroll: false })
        storeNavigationGuard.current(() => applySectionChange(section as AdminSection))
      } else setActiveSection(section as AdminSection)
    }
  }, [searchParams])

  function handleSectionChange(section: AdminSection) {
    if (section === activeSection) return
    if ((activeSection === "store-info" || activeSection === "hours" || activeSection === "security") && storeNavigationGuard.current) {
      storeNavigationGuard.current(() => applySectionChange(section))
      return
    }
    applySectionChange(section)
  }

  function applySectionChange(section: AdminSection) {
    setActiveSection(section)
    if (section === "orders") setOrdersBadge(0)
    const params = new URLSearchParams(searchParams.toString())
    params.set("section", section)
    router.replace(`/admin?${params.toString()}`, { scroll: false })
  }

  useEffect(() => {
    if (!authenticated) return
    if ("Notification" in window && Notification.permission === "default") {
      Notification.requestPermission()
    }
  }, [authenticated])

  function stopTitleFlash() {
    if (flashIntervalRef.current) {
      clearInterval(flashIntervalRef.current)
      flashIntervalRef.current = null
    }
    if (originalTitleRef.current) {
      document.title = originalTitleRef.current
    }
  }

  function startTitleFlash(message: string) {
    if (!originalTitleRef.current) {
      originalTitleRef.current = document.title
    }
    if (flashIntervalRef.current) clearInterval(flashIntervalRef.current)
    let showAlert = true
    flashIntervalRef.current = setInterval(() => {
      document.title = showAlert ? message : originalTitleRef.current
      showAlert = !showAlert
    }, 1200)
  }

  useEffect(() => {
    if (!authenticated) return
    document.addEventListener("visibilitychange", stopTitleFlash)
    return () => {
      document.removeEventListener("visibilitychange", stopTitleFlash)
      stopTitleFlash()
    }
  }, [authenticated])

  useEffect(() => {
    if (!authenticated) return

    async function poll() {
      try {
        const newRes = await fetch("/api/orders?new=true")
        if (newRes.ok) {
          const newData = await newRes.json()
          const orders = newData.orders ?? []
          const now = Date.now()
          if (lastPollTimeRef.current !== null) {
            const newOrders = orders.filter((o: { createdAt: string }) => new Date(o.createdAt).getTime() > lastPollTimeRef.current!)
            if (newOrders.length > 0) {
              setOrdersBadge((prev) => prev + newOrders.length)
              playNotificationSound()
              if (navigator.vibrate) navigator.vibrate([300, 100, 300, 100, 300])
              const title = newOrders.length === 1 ? "Novo pedido!" : `${newOrders.length} novos pedidos!`
              toast.success(title, { description: `${newOrders.length} pedido(s) recebido(s)` })
              if ("Notification" in window && Notification.permission === "granted") {
                const body = newOrders.length === 1
                  ? `${newOrders[0].name} - R$ ${Number(newOrders[0].total).toFixed(2).replace(".", ",")}`
                  : `${newOrders.length} pedido(s) recebido(s)`
                new Notification(title, {
                  body,
                  icon: "/logo/logoreidossalgados.png",
                })
              }
              if (document.hidden) {
                startTitleFlash(`🔔 ${title}`)
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
    if ((activeSection === "store-info" || activeSection === "hours" || activeSection === "security") && storeNavigationGuard.current) {
      storeNavigationGuard.current(logout)
      return
    }
    logout()
  }

  function logout() {
    localStorage.removeItem("rs-admin-auth")
    setMobileOpen(false)
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
    return <AdminLogin onLogin={() => { setMobileOpen(false); setAuthenticated(true) }} />
  }

  return (
    <MotionConfig reducedMotion="user">
    <div className="admin-workspace min-h-screen bg-background flex">
      <a href="#admin-main" className="admin-skip-link">Pular para o conteúdo</a>
      <AdminSidebar
        activeSection={activeSection}
        onSectionChange={handleSectionChange}
        onLogout={handleLogout}
        mobileOpen={mobileOpen}
        onMobileClose={() => setMobileOpen(false)}
        ordersBadge={ordersBadge}
      />

      <div className="flex-1 min-w-0 w-full">
        <AdminMobileHeader
          onMenuClick={() => setMobileOpen(true)}
          title={sectionLabels[activeSection]}
          mobileOpen={mobileOpen}
        />

        <main id="admin-main" tabIndex={-1} className="p-4 sm:p-6 lg:p-8 2xl:p-10 w-full max-w-[1600px] mx-auto">
          <AnimatePresence mode="wait">
            <motion.div
              key={activeSection}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              transition={{ duration: 0.2 }}
            >
              {activeSection === "dashboard" && (
                <DashboardSection onNavigate={handleSectionChange} />
              )}
              {activeSection === "menu" && <MenuManagement />}
              {activeSection === "categories" && <CategoriesSection />}
              {activeSection === "store-info" && <StoreInfoSection onNavigate={handleSectionChange} onRegisterGuard={(guard) => { storeNavigationGuard.current = guard }} />}
              {activeSection === "delivery" && <DeliverySection />}
              {activeSection === "hours" && <HoursSection onRegisterGuard={(guard) => { storeNavigationGuard.current = guard }} />}
              {activeSection === "payments" && <PaymentsSection />}
              {activeSection === "orders" && <OrdersSection />}
              {activeSection === "profit" && <DailyProfitSection />}
              {activeSection === "security" && <PasswordSection onRegisterGuard={(guard) => { storeNavigationGuard.current = guard }} />}
            </motion.div>
          </AnimatePresence>
        </main>
      </div>
    </div>
    </MotionConfig>
  )
}
