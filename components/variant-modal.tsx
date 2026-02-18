"use client"

import { motion } from "framer-motion"
import { X } from "lucide-react"
import Image from "next/image"
import type { MenuItem, MenuItemVariant } from "@/lib/store-data"

interface VariantModalProps {
  item: MenuItem
  onSelect: (variant: MenuItemVariant) => void
  onClose: () => void
}

export function VariantModal({ item, onSelect, onClose }: VariantModalProps) {
  const variants = item.variants?.filter((v) => v.available) || []

  return (
    <>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        onClick={onClose}
        className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm"
      />
      <motion.div
        initial={{ opacity: 0, scale: 0.95, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95, y: 20 }}
        transition={{ type: "spring", damping: 25, stiffness: 300 }}
        className="fixed inset-4 z-50 m-auto max-w-md max-h-[90vh] overflow-hidden rounded-2xl bg-background border border-border flex flex-col"
      >
        <div className="flex items-center justify-between p-4 border-b border-border">
          <div className="flex items-center gap-3">
            <div className="relative h-12 w-12 flex-shrink-0 rounded-lg overflow-hidden bg-muted">
              <Image
                src={item.image}
                alt={item.name}
                fill
                sizes="48px"
                quality={60}
                loading="lazy"
                className="object-cover"
              />
            </div>
            <div>
              <h3 className="font-display font-semibold">{item.name}</h3>
              <p className="text-xs text-muted-foreground line-clamp-1">
                {item.description}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-lg hover:bg-secondary transition-colors"
            aria-label="Fechar"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="p-4 overflow-y-auto flex-1">
          <p className="text-xs text-muted-foreground mb-3">
            Escolha o sabor ou opcao:
          </p>
          <div className="flex flex-col gap-2">
            {variants.map((variant) => (
              <button
                key={variant.id}
                onClick={() => {
                  onSelect(variant)
                  onClose()
                }}
                className="flex items-center justify-between rounded-xl border border-border bg-card p-4 hover:border-primary/50 hover:bg-primary/5 transition-colors text-left"
              >
                <span className="font-medium text-sm">{variant.name}</span>
                <span className="font-display font-bold text-primary">
                  R$ {variant.price.toFixed(2).replace(".", ",")}
                </span>
              </button>
            ))}
          </div>
        </div>
      </motion.div>
    </>
  )
}
