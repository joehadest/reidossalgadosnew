"use client"

import { useState } from "react"
import { CartProvider } from "@/lib/cart-context"
import { Header } from "@/components/header"
import { HeroSection } from "@/components/hero-section"
import { MenuSection } from "@/components/menu-section"
import { CartDrawer } from "@/components/cart-drawer"
import { CheckoutModal } from "@/components/checkout-modal"
import { StoreInfoModal } from "@/components/store-info-modal"
import { Footer } from "@/components/footer"
import { FloatingCart } from "@/components/floating-cart"

export default function HomePage() {
  return (
    <CartProvider>
      <AppContent />
    </CartProvider>
  )
}

function AppContent() {
  const [cartOpen, setCartOpen] = useState(false)
  const [checkoutOpen, setCheckoutOpen] = useState(false)
  const [infoOpen, setInfoOpen] = useState(false)

  return (
    <div className="min-h-screen bg-background text-foreground">
      <Header
        onCartClick={() => setCartOpen(true)}
        onInfoClick={() => setInfoOpen(true)}
      />
      <main className="pt-0">
        <HeroSection />
        <MenuSection />
      </main>
      <Footer />

      <CartDrawer
        isOpen={cartOpen}
        onClose={() => setCartOpen(false)}
        onCheckout={() => {
          setCartOpen(false)
          setCheckoutOpen(true)
        }}
      />
      <CheckoutModal
        isOpen={checkoutOpen}
        onClose={() => setCheckoutOpen(false)}
      />
      <StoreInfoModal
        isOpen={infoOpen}
        onClose={() => setInfoOpen(false)}
      />
      <FloatingCart onClick={() => setCartOpen(true)} />
    </div>
  )
}
