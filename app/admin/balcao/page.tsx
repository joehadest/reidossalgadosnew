"use client"

import { useState, useEffect } from "react"
import Link from "next/link"
import Image from "next/image"
import { motion, AnimatePresence } from "framer-motion"
import { ArrowLeft, Plus, Minus, Trash2, CreditCard, CheckCircle2 } from "lucide-react"
import { toast } from "sonner"
import { useAdmin } from "@/lib/admin-context"
import { VariantModal } from "@/components/variant-modal"
import type { MenuItem, MenuItemVariant } from "@/lib/store-data"

interface BalcaoCartItem {
  id: string
  itemId: string
  variantId?: string
  name: string
  variantName?: string
  price: number
  quantity: number
}

const iconMap: Record<string, string> = {
  flame: "🔥",
  cookie: "🍪",
  sandwich: "🥪",
  "cup-soda": "🥤",
  package: "📦",
}

export default function BalcaoPage() {
  const { store, categories, menuItems } = useAdmin()
  const [authenticated, setAuthenticated] = useState(false)
  const [hydrated, setHydrated] = useState(false)
  const [cart, setCart] = useState<BalcaoCartItem[]>([])
  const [activeCategory, setActiveCategory] = useState("")
  const [paymentMethod, setPaymentMethod] = useState("")
  const [customerName, setCustomerName] = useState("Cliente")
  const [submitting, setSubmitting] = useState(false)
  const [variantModalItem, setVariantModalItem] = useState<MenuItem | null>(null)

  useEffect(() => {
    const auth = localStorage.getItem("rs-admin-auth")
    if (auth === "true") setAuthenticated(true)
    setHydrated(true)
  }, [])

  useEffect(() => {
    if (categories.length > 0 && !activeCategory) {
      setActiveCategory(categories[0].id)
    }
  }, [categories, activeCategory])

  useEffect(() => {
    if (store.paymentMethods.length > 0 && !paymentMethod) {
      setPaymentMethod(store.paymentMethods[0])
    }
  }, [store.paymentMethods, paymentMethod])

  const filteredItems = menuItems.filter(
    (item) => item.available !== false && item.category === activeCategory
  )

  function addItem(item: MenuItem, variant?: MenuItemVariant) {
    const price = variant ? variant.price : item.price
    const name = item.name
    const variantName = variant?.name
    const variantId = variant?.id
    const existing = cart.find(
      (c) => c.itemId === item.id && c.variantId === (variantId || undefined)
    )
    if (existing) {
      setCart((prev) =>
        prev.map((c) =>
          c.id === existing.id ? { ...c, quantity: c.quantity + 1 } : c
        )
      )
    } else {
      setCart((prev) => [
        ...prev,
        {
          id: `${item.id}-${variantId || "base"}-${Date.now()}`,
          itemId: item.id,
          variantId,
          name,
          variantName,
          price,
          quantity: 1,
        },
      ])
    }
  }

  function updateQuantity(id: string, delta: number) {
    setCart((prev) => {
      const item = prev.find((c) => c.id === id)
      if (!item) return prev
      const newQty = item.quantity + delta
      if (newQty <= 0) return prev.filter((c) => c.id !== id)
      return prev.map((c) => (c.id === id ? { ...c, quantity: newQty } : c))
    })
  }

  function removeItem(id: string) {
    setCart((prev) => prev.filter((c) => c.id !== id))
  }

  const subtotal = cart.reduce((s, i) => s + i.price * i.quantity, 0)
  const deliveryFee = 0
  const total = subtotal + deliveryFee

  async function handleFinish() {
    if (cart.length === 0) {
      toast.error("Adicione itens ao pedido")
      return
    }
    if (!paymentMethod) {
      toast.error("Selecione a forma de pagamento")
      return
    }
    setSubmitting(true)
    try {
      const res = await fetch("/api/orders", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: customerName.trim() || "Cliente",
          phone: "-",
          address: "Balcão",
          neighborhood: "-",
          complement: null,
          paymentMethod,
          changeFor: null,
          subtotal,
          deliveryFee,
          total,
          items: cart.map((i) => ({
            itemId: i.itemId,
            variantId: i.variantId || undefined,
            name: i.name,
            variantName: i.variantName || undefined,
            price: i.price,
            quantity: i.quantity,
          })),
        }),
      })
      if (!res.ok) {
        const err = await res.json().catch(() => ({}))
        throw new Error(err.error || "Erro ao criar pedido")
      }
      setCart([])
      setCustomerName("Cliente")
      toast.success("Pedido registrado!", { description: `Total: R$ ${total.toFixed(2).replace(".", ",")}` })
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Erro ao registrar pedido")
    } finally {
      setSubmitting(false)
    }
  }

  if (!hydrated) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="h-8 w-8 rounded-full border-2 border-primary border-t-transparent animate-spin" />
      </div>
    )
  }

  if (!authenticated) {
    return (
      <div className="min-h-screen bg-background flex flex-col items-center justify-center p-6">
        <p className="text-muted-foreground mb-4">Acesso restrito. Faça login no painel admin.</p>
        <Link
          href="/admin"
          className="flex items-center gap-2 rounded-xl bg-primary px-6 py-3 text-sm font-semibold text-primary-foreground hover:bg-primary/90"
        >
          <ArrowLeft className="h-4 w-4" />
          Ir para Admin
        </Link>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-background flex flex-col">
      {/* Header */}
      <header className="sticky top-0 z-20 flex items-center justify-between gap-4 p-4 border-b border-border bg-background/95 backdrop-blur">
        <Link
          href="/admin"
          className="flex items-center gap-2 text-sm font-medium text-muted-foreground hover:text-foreground"
        >
          <ArrowLeft className="h-4 w-4" />
          Voltar
        </Link>
        <h1 className="font-display font-bold text-lg">Balcão</h1>
        <div className="w-20" />
      </header>

      <div className="flex-1 flex flex-col lg:flex-row min-h-0">
        {/* Menu */}
        <div className="flex-1 overflow-auto p-4">
          <div className="flex gap-2 overflow-x-auto pb-2 mb-4">
            {categories.map((cat) => (
              <button
                key={cat.id}
                onClick={() => setActiveCategory(cat.id)}
                className={`flex items-center gap-2 whitespace-nowrap rounded-xl px-4 py-2.5 text-sm font-medium transition-all ${
                  activeCategory === cat.id
                    ? "bg-primary text-primary-foreground"
                    : "bg-card border border-border hover:border-primary/30"
                }`}
              >
                <span>{iconMap[cat.icon] || "•"}</span>
                {cat.name}
              </button>
            ))}
          </div>

          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {filteredItems.map((item) => {
              const hasVariants = item.variants && item.variants.filter((v) => v.available).length > 0
              const availableVariants = item.variants?.filter((v) => v.available) || []
              return (
                <motion.button
                  key={item.id}
                  layout
                  onClick={() => {
                    if (hasVariants && availableVariants.length > 0) {
                      setVariantModalItem(item)
                    } else {
                      addItem(item)
                    }
                  }}
                  className="flex gap-3 rounded-xl border border-border bg-card p-3 text-left hover:border-primary/50 transition-colors"
                >
                  <div className="relative h-16 w-16 flex-shrink-0 rounded-lg overflow-hidden bg-muted">
                    <Image
                      src={item.image}
                      alt={item.name}
                      fill
                      sizes="64px"
                      className="object-cover"
                    />
                  </div>
                  <div className="flex-1 min-w-0">
                    <h3 className="font-semibold text-sm leading-tight">{item.name}</h3>
                    <p className="text-xs text-muted-foreground mt-0.5">
                      {hasVariants
                        ? `A partir de R$ ${Math.min(...availableVariants.map((v) => v.price)).toFixed(2).replace(".", ",")}`
                        : `R$ ${item.price.toFixed(2).replace(".", ",")}`}
                    </p>
                  </div>
                  <Plus className="h-5 w-5 text-primary flex-shrink-0 self-center" />
                </motion.button>
              )
            })}
          </div>
        </div>

        {/* Cart */}
        <aside className="w-full lg:w-96 border-t lg:border-t-0 lg:border-l border-border bg-card flex flex-col">
          <div className="p-4 border-b border-border">
            <h2 className="font-semibold text-sm">Pedido</h2>
            <input
              type="text"
              placeholder="Nome do cliente"
              value={customerName}
              onChange={(e) => setCustomerName(e.target.value)}
              className="mt-2 w-full rounded-lg border border-border bg-background px-3 py-2 text-sm"
            />
          </div>

          <div className="flex-1 overflow-auto p-4">
            {cart.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-8">Nenhum item no pedido</p>
            ) : (
              <div className="space-y-2">
                <AnimatePresence>
                  {cart.map((item) => (
                    <motion.div
                      key={item.id}
                      layout
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, x: -20 }}
                      className="flex items-center gap-3 rounded-xl border border-border bg-background p-3"
                    >
                      <div className="flex-1 min-w-0">
                        <p className="font-medium text-sm truncate">
                          {item.name}
                          {item.variantName && (
                            <span className="text-muted-foreground"> ({item.variantName})</span>
                          )}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          R$ {item.price.toFixed(2).replace(".", ",")} x {item.quantity}
                        </p>
                      </div>
                      <div className="flex items-center gap-1">
                        <button
                          onClick={() => updateQuantity(item.id, -1)}
                          className="p-1.5 rounded-lg hover:bg-secondary"
                        >
                          <Minus className="h-4 w-4" />
                        </button>
                        <span className="text-sm font-semibold w-6 text-center">{item.quantity}</span>
                        <button
                          onClick={() => updateQuantity(item.id, 1)}
                          className="p-1.5 rounded-lg hover:bg-secondary"
                        >
                          <Plus className="h-4 w-4" />
                        </button>
                        <button
                          onClick={() => removeItem(item.id)}
                          className="p-1.5 rounded-lg hover:bg-destructive/20 text-destructive"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </div>
                    </motion.div>
                  ))}
                </AnimatePresence>
              </div>
            )}
          </div>

          <div className="p-4 border-t border-border space-y-3">
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">Subtotal</span>
              <span>R$ {subtotal.toFixed(2).replace(".", ",")}</span>
            </div>
            <div>
              <label className="text-xs text-muted-foreground block mb-1">Forma de pagamento</label>
              <select
                value={paymentMethod}
                onChange={(e) => setPaymentMethod(e.target.value)}
                className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm"
              >
                {store.paymentMethods.map((pm) => (
                  <option key={pm} value={pm}>
                    {pm}
                  </option>
                ))}
              </select>
            </div>
            <div className="flex justify-between font-bold text-lg">
              <span>Total</span>
              <span className="text-primary">R$ {total.toFixed(2).replace(".", ",")}</span>
            </div>
            <button
              onClick={handleFinish}
              disabled={cart.length === 0 || submitting}
              className="w-full flex items-center justify-center gap-2 rounded-xl bg-primary py-3 text-sm font-bold text-primary-foreground hover:bg-primary/90 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {submitting ? (
                <div className="h-4 w-4 rounded-full border-2 border-primary-foreground border-t-transparent animate-spin" />
              ) : (
                <>
                  <CheckCircle2 className="h-4 w-4" />
                  Finalizar pedido
                </>
              )}
            </button>
          </div>
        </aside>
      </div>

      <AnimatePresence>
        {variantModalItem && (
          <VariantModal
            item={variantModalItem}
            onSelect={(v) => {
              addItem(variantModalItem, v)
              setVariantModalItem(null)
            }}
            onClose={() => setVariantModalItem(null)}
          />
        )}
      </AnimatePresence>
    </div>
  )
}
