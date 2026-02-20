"use client"

import { useState } from "react"
import { motion, AnimatePresence } from "framer-motion"
import { X, Minus, Plus, Trash2, ShoppingBag, ArrowRight } from "lucide-react"
import Image from "next/image"
import { useCart } from "@/lib/cart-context"
import { useAdmin } from "@/lib/admin-context"
import { getStoreStatus } from "@/lib/store-status"

interface CartDrawerProps {
  isOpen: boolean
  onClose: () => void
  onCheckout: () => void
}

export function CartDrawer({ isOpen, onClose, onCheckout }: CartDrawerProps) {
  const { items, updateQuantity, removeItem, clearCart, totalPrice, totalItems } = useCart()
  const { store } = useAdmin()
  const isStoreOpen = getStoreStatus(store.hours)
  const [selectedNeighborhood, setSelectedNeighborhood] = useState("")

  const deliveryFee =
    store.deliveryFees.find((f) => f.neighborhood === selectedNeighborhood)?.fee || 0
  const finalTotal = totalPrice + deliveryFee

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm"
          />

          <motion.div
            initial={{ x: "100%" }}
            animate={{ x: 0 }}
            exit={{ x: "100%" }}
            transition={{ type: "spring", damping: 30, stiffness: 300 }}
            className="fixed right-0 top-0 bottom-0 z-50 w-full max-w-md bg-background border-l border-border flex flex-col"
          >
            {/* Header */}
            <div className="flex items-center justify-between p-4 border-b border-border">
              <div className="flex items-center gap-2">
                <ShoppingBag className="h-5 w-5 text-primary" />
                <h2 className="font-display text-lg font-bold">Seu Pedido</h2>
                {totalItems > 0 && (
                  <span className="rounded-full bg-primary px-2 py-0.5 text-xs font-bold text-primary-foreground">
                    {totalItems}
                  </span>
                )}
              </div>
              <button
                onClick={onClose}
                className="p-2 rounded-lg hover:bg-secondary transition-colors"
                aria-label="Fechar carrinho"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {/* Items */}
            <div className="flex-1 overflow-y-auto p-4">
              {items.length === 0 ? (
                <div className="flex flex-col items-center justify-center h-full gap-4 text-center">
                  <div className="h-16 w-16 rounded-2xl bg-secondary flex items-center justify-center">
                    <ShoppingBag className="h-8 w-8 text-muted-foreground" />
                  </div>
                  <div>
                    <p className="font-semibold">Carrinho vazio</p>
                    <p className="text-sm text-muted-foreground mt-1">Adicione itens do cardapio</p>
                  </div>
                </div>
              ) : (
                <div className="flex flex-col gap-3">
                  <AnimatePresence>
                    {items.map((item) => (
                      <motion.div
                        key={item.id}
                        layout
                        initial={{ opacity: 0, x: 20 }}
                        animate={{ opacity: 1, x: 0 }}
                        exit={{ opacity: 0, x: -20, height: 0 }}
                        className="flex gap-3 rounded-xl border border-border bg-card p-3"
                      >
                        <div className="relative h-16 w-16 flex-shrink-0 overflow-hidden rounded-lg bg-muted">
                          <Image src={item.image} alt={item.name} fill className="object-cover" sizes="64px" quality={70} loading="lazy" />
                        </div>
                        <div className="flex flex-1 flex-col justify-between min-w-0">
                          <div className="flex items-start justify-between gap-2">
                            <div className="min-w-0">
                              <h3 className="text-sm font-semibold leading-tight truncate">{item.name}</h3>
                              {item.variantName && (
                                <p className="text-xs text-muted-foreground truncate">{item.variantName}</p>
                              )}
                            </div>
                            <button
                              onClick={() => removeItem(item.id)}
                              className="p-1 rounded hover:bg-destructive/10 text-muted-foreground hover:text-destructive transition-colors flex-shrink-0"
                              aria-label={`Remover ${item.name}`}
                            >
                              <Trash2 className="h-3.5 w-3.5" />
                            </button>
                          </div>
                          <div className="flex items-center justify-between">
                            <span className="text-sm font-bold text-primary">
                              R$ {(item.price * item.quantity).toFixed(2).replace(".", ",")}
                            </span>
                            <div className="flex items-center gap-1.5 rounded-lg bg-secondary px-1">
                              <button
                                onClick={() => updateQuantity(item.id, item.quantity - 1)}
                                className="p-1 rounded hover:bg-primary/20 transition-colors"
                                aria-label="Diminuir quantidade"
                              >
                                <Minus className="h-3 w-3" />
                              </button>
                              <span className="text-xs font-bold min-w-[16px] text-center">{item.quantity}</span>
                              <button
                                onClick={() => updateQuantity(item.id, item.quantity + 1)}
                                className="p-1 rounded hover:bg-primary/20 transition-colors"
                                aria-label="Aumentar quantidade"
                              >
                                <Plus className="h-3 w-3" />
                              </button>
                            </div>
                          </div>
                        </div>
                      </motion.div>
                    ))}
                  </AnimatePresence>

                  <button
                    onClick={clearCart}
                    className="text-xs text-muted-foreground hover:text-destructive transition-colors self-end mt-1"
                  >
                    Limpar carrinho
                  </button>
                </div>
              )}
            </div>

            {/* Footer */}
            {items.length > 0 && (
              <div className="border-t border-border p-4 flex flex-col gap-4">
                {!isStoreOpen && (
                  <div className="rounded-xl border border-amber-500/30 bg-amber-500/10 p-3 text-center">
                    <p className="text-sm font-medium text-amber-600 dark:text-amber-400">Estamos fechados no momento</p>
                    <p className="text-xs text-muted-foreground mt-0.5">Pedidos temporariamente indisponiveis</p>
                  </div>
                )}
                {/* Delivery Neighborhood */}
                {isStoreOpen && <div>
                  <label className="text-xs text-muted-foreground mb-1.5 block">Bairro para entrega</label>
                  <select
                    value={selectedNeighborhood}
                    onChange={(e) => setSelectedNeighborhood(e.target.value)}
                    className="w-full rounded-lg border border-border bg-card px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/50"
                    aria-label="Selecione o bairro"
                  >
                    <option value="">Selecione o bairro</option>
                    {store.deliveryFees.map((f) => (
                      <option key={f.neighborhood} value={f.neighborhood}>
                        {f.neighborhood} - R$ {f.fee.toFixed(2).replace(".", ",")}
                      </option>
                    ))}
                    <option value="retirada">Retirar no local</option>
                  </select>
                </div>}

                {/* Totals */}
                <div className="flex flex-col gap-1.5 text-sm">
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Subtotal</span>
                    <span>R$ {totalPrice.toFixed(2).replace(".", ",")}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Entrega</span>
                    <span>
                      {selectedNeighborhood === "retirada"
                        ? "Gratis"
                        : deliveryFee > 0
                        ? `R$ ${deliveryFee.toFixed(2).replace(".", ",")}`
                        : "--"}
                    </span>
                  </div>
                  <div className="flex justify-between font-bold text-base pt-2 border-t border-border">
                    <span>Total</span>
                    <span className="text-primary">
                      R$ {finalTotal.toFixed(2).replace(".", ",")}
                    </span>
                  </div>
                </div>

                <button
                  onClick={() => isStoreOpen && onCheckout()}
                  disabled={!isStoreOpen}
                  className="flex items-center justify-center gap-2 w-full rounded-xl bg-primary py-3 text-sm font-bold text-primary-foreground hover:bg-primary/90 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Finalizar Pedido
                  <ArrowRight className="h-4 w-4" />
                </button>
              </div>
            )}
          </motion.div>
        </>
      )}
    </AnimatePresence>
  )
}
