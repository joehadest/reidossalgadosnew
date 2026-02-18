"use client"

import { useState, useEffect } from "react"
import { motion, AnimatePresence } from "framer-motion"
import Image from "next/image"
import { ShoppingBag, Menu, X, Clock, MapPin, Phone } from "lucide-react"
import { useCart } from "@/lib/cart-context"
import { useAdmin } from "@/lib/admin-context"

interface HeaderProps {
  onCartClick: () => void
  onInfoClick: () => void
}

export function Header({ onCartClick, onInfoClick }: HeaderProps) {
  const { totalItems } = useCart()
  const { store } = useAdmin()
  const [scrolled, setScrolled] = useState(false)
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)

  useEffect(() => {
    const handleScroll = () => setScrolled(window.scrollY > 20)
    window.addEventListener("scroll", handleScroll)
    return () => window.removeEventListener("scroll", handleScroll)
  }, [])

  const isOpen = getStoreStatus(store.hours)

  return (
    <motion.header
      className={`fixed top-0 left-0 right-0 z-50 transition-colors duration-300 ${
        scrolled ? "bg-background/95 backdrop-blur-md border-b border-border" : "bg-transparent"
      }`}
      initial={{ y: -100 }}
      animate={{ y: 0 }}
      transition={{ duration: 0.5, ease: "easeOut" }}
    >
      <div className="mx-auto max-w-7xl px-4 py-3 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <button
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            className="md:hidden p-2 rounded-lg hover:bg-secondary transition-colors"
            aria-label={mobileMenuOpen ? "Fechar menu" : "Abrir menu"}
          >
            {mobileMenuOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
          </button>
          <div className="flex items-center gap-2">
            <div className="relative h-9 w-9 rounded-full overflow-hidden flex-shrink-0">
              <Image
                src="/logo/logoreidossalgados.png"
                alt={store.name}
                fill
                className="object-cover"
                sizes="36px"
              />
            </div>
            <div>
              <h1 className="font-display font-bold text-base leading-tight">{store.name}</h1>
              <div className="flex items-center gap-1">
                <span className={`h-2 w-2 rounded-full ${isOpen ? "bg-green-500" : "bg-red-500"}`} />
                <span className="text-xs text-muted-foreground">{isOpen ? "Aberto agora" : "Fechado"}</span>
              </div>
            </div>
          </div>
        </div>

        <nav className="hidden md:flex items-center gap-6">
          <button onClick={onInfoClick} className="text-sm text-muted-foreground hover:text-foreground transition-colors">
            Sobre
          </button>
          <a href="#cardapio" className="text-sm text-muted-foreground hover:text-foreground transition-colors">
            Cardapio
          </a>
          <a
            href={`https://wa.me/${store.whatsapp}`}
            target="_blank"
            rel="noopener noreferrer"
            className="text-sm text-muted-foreground hover:text-foreground transition-colors"
          >
            Contato
          </a>
        </nav>

        <button
          onClick={onCartClick}
          className="relative p-2.5 rounded-xl bg-primary text-primary-foreground hover:bg-primary/90 transition-colors"
          aria-label={`Carrinho com ${totalItems} itens`}
        >
          <ShoppingBag className="h-5 w-5" />
          <AnimatePresence>
            {totalItems > 0 && (
              <motion.span
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                exit={{ scale: 0 }}
                className="absolute -top-1.5 -right-1.5 h-5 w-5 rounded-full bg-foreground text-background text-xs font-bold flex items-center justify-center"
              >
                {totalItems}
              </motion.span>
            )}
          </AnimatePresence>
        </button>
      </div>

      <AnimatePresence>
        {mobileMenuOpen && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.3 }}
            className="md:hidden overflow-hidden bg-card border-t border-border"
          >
            <div className="px-4 py-4 flex flex-col gap-3">
              <button
                onClick={() => { onInfoClick(); setMobileMenuOpen(false) }}
                className="flex items-center gap-3 p-3 rounded-lg hover:bg-secondary transition-colors text-left"
              >
                <Clock className="h-4 w-4 text-primary" />
                <span className="text-sm">Horarios e Informacoes</span>
              </button>
              <a
                href="#cardapio"
                onClick={() => setMobileMenuOpen(false)}
                className="flex items-center gap-3 p-3 rounded-lg hover:bg-secondary transition-colors"
              >
                <MapPin className="h-4 w-4 text-primary" />
                <span className="text-sm">Cardapio</span>
              </a>
              <a
                href={`https://wa.me/${store.whatsapp}`}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-3 p-3 rounded-lg hover:bg-secondary transition-colors"
              >
                <Phone className="h-4 w-4 text-primary" />
                <span className="text-sm">Contato via WhatsApp</span>
              </a>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.header>
  )
}

function getStoreStatus(hours: { day: string; open: string; close: string; closed?: boolean }[]): boolean {
  const now = new Date()
  const dayIndex = now.getDay()
  const days = ["Domingo", "Segunda", "Terca", "Quarta", "Quinta", "Sexta", "Sabado"]
  const today = days[dayIndex]
  const schedule = hours.find((h) => h.day === today)
  if (!schedule) return false
  if (schedule.closed) return false

  const [openH, openM] = schedule.open.split(":").map(Number)
  const [closeH, closeM] = schedule.close.split(":").map(Number)
  const currentMinutes = now.getHours() * 60 + now.getMinutes()
  const openMinutes = openH * 60 + openM
  const closeMinutes = closeH * 60 + closeM

  return currentMinutes >= openMinutes && currentMinutes <= closeMinutes
}
