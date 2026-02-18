"use client"

import { motion, AnimatePresence } from "framer-motion"
import { ShoppingBag } from "lucide-react"
import { useCart } from "@/lib/cart-context"

interface FloatingCartProps {
  onClick: () => void
}

export function FloatingCart({ onClick }: FloatingCartProps) {
  const { totalItems, totalPrice } = useCart()

  return (
    <AnimatePresence>
      {totalItems > 0 && (
        <motion.button
          initial={{ y: 100, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          exit={{ y: 100, opacity: 0 }}
          transition={{ type: "spring", damping: 20, stiffness: 300 }}
          onClick={onClick}
          className="fixed bottom-6 left-4 right-4 z-40 mx-auto max-w-md flex items-center justify-between rounded-2xl bg-primary px-5 py-4 text-primary-foreground shadow-lg shadow-primary/25 hover:bg-primary/90 transition-colors md:hidden"
          aria-label={`Ver carrinho - ${totalItems} itens`}
        >
          <div className="flex items-center gap-3">
            <div className="relative">
              <ShoppingBag className="h-5 w-5" />
              <span className="absolute -top-1.5 -right-1.5 h-4 w-4 rounded-full bg-background text-foreground text-[10px] font-bold flex items-center justify-center">
                {totalItems}
              </span>
            </div>
            <span className="text-sm font-semibold">Ver Carrinho</span>
          </div>
          <span className="font-display font-bold">
            R$ {totalPrice.toFixed(2).replace(".", ",")}
          </span>
        </motion.button>
      )}
    </AnimatePresence>
  )
}
