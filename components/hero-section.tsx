"use client"

import { motion } from "framer-motion"
import { MapPin, Star, ChevronDown } from "lucide-react"
import Image from "next/image"
import { useAdmin } from "@/lib/admin-context"

export function HeroSection() {
  const { store } = useAdmin()

  return (
    <section className="relative min-h-[100vh] flex items-end overflow-hidden">
      <div className="absolute inset-0">
        <Image
          src="/banner/banner-hero-1920x1080.png"
          alt="Rei dos Salgados - O Melhor da Cidade"
          fill
          className="object-cover object-top sm:object-center"
          priority
          sizes="100vw"
          unoptimized
        />
        <div className="absolute inset-0 bg-gradient-to-t from-background via-background/80 to-transparent" />
      </div>

      <div className="relative mx-auto max-w-7xl px-4 pb-12 pt-24 w-full">
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.7, delay: 0.2 }}
          className="flex flex-col gap-6"
        >
          <div className="flex items-center gap-2">
            <span className="inline-flex items-center gap-1.5 rounded-full bg-primary/15 px-3 py-1 text-xs font-medium text-primary border border-primary/20">
              <Star className="h-3 w-3 fill-primary" />
              O Melhor da Cidade
            </span>
          </div>

          <div>
            <h2 className="font-display text-4xl font-bold tracking-tight sm:text-5xl lg:text-6xl text-balance">
              {store.name}
            </h2>
            <p className="mt-3 max-w-md text-base text-muted-foreground leading-relaxed">
              {store.about} Salgados frescos, feitos com amor e os melhores ingredientes.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-4">
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <MapPin className="h-4 w-4 text-primary" />
              <span>{store.city}</span>
            </div>
            {store.deliveryFees.length > 0 && (
              <>
                <span className="hidden sm:inline text-border">|</span>
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <span className="text-primary font-medium">Delivery</span>
                  <span>a partir de R$ {Math.min(...store.deliveryFees.map(f => f.fee)).toFixed(2).replace(".", ",")}</span>
                </div>
              </>
            )}
          </div>

          <div className="flex flex-wrap gap-3 pt-2">
            <a
              href="#cardapio"
              className="inline-flex items-center gap-2 rounded-xl bg-primary px-6 py-3 text-sm font-semibold text-primary-foreground hover:bg-primary/90 transition-colors"
            >
              Ver Cardapio
              <ChevronDown className="h-4 w-4" />
            </a>
            <a
              href={`https://wa.me/${store.whatsapp}?text=Ola! Gostaria de fazer um pedido.`}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 rounded-xl border border-border bg-card px-6 py-3 text-sm font-semibold text-foreground hover:bg-secondary transition-colors"
            >
              Pedir via WhatsApp
            </a>
          </div>
        </motion.div>
      </div>
    </section>
  )
}
