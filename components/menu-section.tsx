"use client"

import { useState, useRef } from "react"
import { motion, AnimatePresence } from "framer-motion"
import { Plus, Minus, Flame, Cookie, CupSoda, Package, Search, UtensilsCrossed } from "lucide-react"
import Image from "next/image"
import { useAdmin } from "@/lib/admin-context"
import { useCart } from "@/lib/cart-context"
import { VariantModal } from "@/components/variant-modal"
import type { MenuItem, MenuItemVariant } from "@/lib/store-data"

const iconMap: Record<string, React.ReactNode> = {
  flame: <Flame className="h-4 w-4" />,
  cookie: <Cookie className="h-4 w-4" />,
  sandwich: <UtensilsCrossed className="h-4 w-4" />,
  "cup-soda": <CupSoda className="h-4 w-4" />,
  package: <Package className="h-4 w-4" />,
}

export function MenuSection() {
  const { categories, menuItems } = useAdmin()
  const [activeCategory, setActiveCategory] = useState(categories[0]?.id || "")
  const [searchQuery, setSearchQuery] = useState("")
  const scrollRef = useRef<HTMLDivElement>(null)

  const filteredItems = menuItems.filter((item) => {
    if (item.available === false) return false
    const matchesCategory = item.category === activeCategory
    const matchesSearch =
      searchQuery === "" ||
      item.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      item.description.toLowerCase().includes(searchQuery.toLowerCase())
    return searchQuery ? matchesSearch : matchesCategory
  })

  return (
    <section id="cardapio" className="py-12 scroll-mt-20">
      <div className="mx-auto max-w-7xl px-4">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.5 }}
        >
          <h2 className="font-display text-2xl font-bold sm:text-3xl">Cardapio</h2>
          <p className="mt-1 text-sm text-muted-foreground">Escolha seus salgados favoritos</p>
        </motion.div>

        {/* Search */}
        <div className="mt-6 relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <input
            type="text"
            placeholder="Buscar no cardapio..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full rounded-xl border border-border bg-card px-10 py-3 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/50 transition-shadow"
            aria-label="Buscar item no cardapio"
          />
          {searchQuery && (
            <button
              onClick={() => setSearchQuery("")}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-muted-foreground hover:text-foreground"
            >
              Limpar
            </button>
          )}
        </div>

        {/* Categories */}
        {!searchQuery && (
          <div ref={scrollRef} className="mt-6 flex gap-2 overflow-x-auto pb-2 scrollbar-hide">
            {categories.map((cat) => (
              <button
                key={cat.id}
                onClick={() => setActiveCategory(cat.id)}
                className={`flex items-center gap-2 whitespace-nowrap rounded-xl px-4 py-2.5 text-sm font-medium transition-all ${
                  activeCategory === cat.id
                    ? "bg-primary text-primary-foreground"
                    : "bg-card border border-border text-muted-foreground hover:text-foreground hover:border-primary/30"
                }`}
              >
                {iconMap[cat.icon]}
                {cat.name}
              </button>
            ))}
          </div>
        )}

        {/* Menu Grid */}
        <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          <AnimatePresence mode="popLayout">
            {filteredItems.map((item, index) => (
              <MenuItemCard key={item.id} item={item} index={index} />
            ))}
          </AnimatePresence>
        </div>

        {filteredItems.length === 0 && (
          <div className="mt-12 text-center">
            <p className="text-muted-foreground">Nenhum item encontrado.</p>
          </div>
        )}
      </div>
    </section>
  )
}

function MenuItemCard({ item, index }: { item: MenuItem; index: number }) {
  const { items, addItem, updateQuantity } = useCart()
  const [variantModalOpen, setVariantModalOpen] = useState(false)

  const hasVariants = item.variants && item.variants.length > 0
  const availableVariants = item.variants?.filter((v) => v.available) || []

  const cartItemsForThis = items.filter((i) => i.itemId === item.id)
  const totalQty = cartItemsForThis.reduce((s, i) => s + i.quantity, 0)

  const handleAdd = () => {
    if (hasVariants && availableVariants.length > 0) {
      setVariantModalOpen(true)
    } else {
      addItem(item)
    }
  }

  const handleSelectVariant = (variant: MenuItemVariant) => {
    addItem(item, variant)
  }

  const canShowQuantity = !hasVariants && totalQty > 0
  const singleCartItem = !hasVariants ? items.find((i) => i.id === item.id) : null

  return (
    <>
      <motion.div
        layout
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95 }}
        transition={{ duration: 0.2 }}
        className="group flex gap-4 rounded-2xl border border-border bg-card p-4 hover:border-primary/30 transition-colors"
      >
        <div className="relative h-24 w-24 flex-shrink-0 overflow-hidden rounded-xl bg-muted">
          <Image
            src={item.image}
            alt={item.name}
            fill
            sizes="96px"
            quality={75}
            loading="lazy"
            className="object-cover group-hover:scale-105 transition-transform duration-300"
          />
        </div>
        <div className="flex flex-1 flex-col justify-between min-w-0">
          <div>
            <h3 className="font-semibold text-sm leading-tight">{item.name}</h3>
            <p className="mt-0.5 text-xs text-muted-foreground line-clamp-2">{item.description}</p>
          </div>
          <div className="flex items-center justify-between mt-2">
            <span className="font-display font-bold text-primary">
              {hasVariants && availableVariants.length > 0 ? (
                <>A partir de R$ {Math.min(...availableVariants.map((v) => v.price)).toFixed(2).replace(".", ",")}</>
              ) : (
                <>R$ {item.price.toFixed(2).replace(".", ",")}</>
              )}
            </span>
            <div className="flex items-center gap-1">
              {canShowQuantity && singleCartItem ? (
                <motion.div
                  initial={{ scale: 0.8, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1 }}
                  className="flex items-center gap-2 rounded-lg bg-secondary px-1"
                >
                  <button
                    onClick={() => updateQuantity(singleCartItem.id, singleCartItem.quantity - 1)}
                    className="p-1.5 rounded-md hover:bg-primary/20 transition-colors"
                    aria-label={`Remover ${item.name}`}
                  >
                    <Minus className="h-3.5 w-3.5" />
                  </button>
                  <span className="text-sm font-semibold min-w-[20px] text-center">{singleCartItem.quantity}</span>
                  <button
                    onClick={() => addItem(item)}
                    className="p-1.5 rounded-md hover:bg-primary/20 transition-colors"
                    aria-label={`Adicionar mais ${item.name}`}
                  >
                    <Plus className="h-3.5 w-3.5" />
                  </button>
                </motion.div>
              ) : (
                <button
                  onClick={handleAdd}
                  className="flex items-center gap-1 rounded-lg bg-primary px-3 py-1.5 text-xs font-semibold text-primary-foreground hover:bg-primary/90 transition-colors"
                  aria-label={`Adicionar ${item.name}`}
                >
                  <Plus className="h-3.5 w-3.5" />
                  Adicionar
                </button>
              )}
            </div>
          </div>
        </div>
      </motion.div>

      <AnimatePresence>
        {variantModalOpen && (
          <VariantModal
            item={item}
            onSelect={handleSelectVariant}
            onClose={() => setVariantModalOpen(false)}
          />
        )}
      </AnimatePresence>
    </>
  )
}
