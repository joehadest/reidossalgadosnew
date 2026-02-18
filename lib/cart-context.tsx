"use client"

import { createContext, useContext, useState, useCallback, type ReactNode } from "react"
import type { MenuItem, MenuItemVariant } from "./store-data"

export interface CartItem extends MenuItem {
  quantity: number
  /** ID original do item no cardapio (para agrupar variantes) */
  itemId: string
  variantId?: string
  variantName?: string
  /** Preco efetivo (variante ou item) */
  price: number
}

interface CartContextType {
  items: CartItem[]
  addItem: (item: MenuItem, variant?: MenuItemVariant) => void
  removeItem: (id: string) => void
  updateQuantity: (id: string, quantity: number) => void
  clearCart: () => void
  totalItems: number
  totalPrice: number
}

const CartContext = createContext<CartContextType | undefined>(undefined)

function getCartItemId(item: MenuItem, variant?: MenuItemVariant): string {
  return variant ? `${item.id}-${variant.id}` : item.id
}

export function CartProvider({ children }: { children: ReactNode }) {
  const [items, setItems] = useState<CartItem[]>([])

  const addItem = useCallback((item: MenuItem, variant?: MenuItemVariant) => {
    const cartId = getCartItemId(item, variant)
    const price = variant ? variant.price : item.price
    const cartItem: CartItem = {
      ...item,
      id: cartId,
      itemId: item.id,
      price,
      quantity: 1,
      variantId: variant?.id,
      variantName: variant?.name,
    }
    setItems((prev) => {
      const existing = prev.find((i) => i.id === cartId)
      if (existing) {
        return prev.map((i) =>
          i.id === cartId ? { ...i, quantity: i.quantity + 1 } : i
        )
      }
      return [...prev, cartItem]
    })
  }, [])

  const removeItem = useCallback((id: string) => {
    setItems((prev) => prev.filter((i) => i.id !== id))
  }, [])

  const updateQuantity = useCallback((cartItemId: string, quantity: number) => {
    if (quantity <= 0) {
      setItems((prev) => prev.filter((i) => i.id !== cartItemId))
    } else {
      setItems((prev) =>
        prev.map((i) => (i.id === cartItemId ? { ...i, quantity } : i))
      )
    }
  }, [])

  const clearCart = useCallback(() => {
    setItems([])
  }, [])

  const totalItems = items.reduce((sum, item) => sum + item.quantity, 0)
  const totalPrice = items.reduce((sum, item) => sum + item.price * item.quantity, 0)

  return (
    <CartContext.Provider
      value={{ items, addItem, removeItem, updateQuantity, clearCart, totalItems, totalPrice }}
    >
      {children}
    </CartContext.Provider>
  )
}

export function useCart() {
  const context = useContext(CartContext)
  if (!context) throw new Error("useCart must be used within CartProvider")
  return context
}
