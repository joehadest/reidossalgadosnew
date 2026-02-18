"use client"

import { useState, useEffect } from "react"
import { motion, AnimatePresence } from "framer-motion"
import { Plus, Pencil, Trash2, Search, X, Eye, EyeOff } from "lucide-react"
import Image from "next/image"
import { useAdmin } from "@/lib/admin-context"
import type { MenuItem, MenuItemVariant } from "@/lib/store-data"

export function MenuManagement() {
  const { menuItems, categories, addMenuItem, updateMenuItem, deleteMenuItem } = useAdmin()
  const [searchQuery, setSearchQuery] = useState("")
  const [filterCategory, setFilterCategory] = useState("")
  const [editingItem, setEditingItem] = useState<MenuItem | null>(null)
  const [isAdding, setIsAdding] = useState(false)
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null)

  const filteredItems = menuItems.filter((item) => {
    const matchesSearch =
      searchQuery === "" ||
      item.name.toLowerCase().includes(searchQuery.toLowerCase())
    const matchesCategory = filterCategory === "" || item.category === filterCategory
    return matchesSearch && matchesCategory
  })

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h2 className="font-display text-2xl font-bold">Cardapio</h2>
          <p className="text-sm text-muted-foreground mt-1">{menuItems.length} itens cadastrados</p>
        </div>
        <button
          onClick={() => { setIsAdding(true); setEditingItem(null) }}
          className="flex items-center gap-2 rounded-xl bg-primary px-4 py-2.5 text-sm font-semibold text-primary-foreground hover:bg-primary/90 transition-colors"
        >
          <Plus className="h-4 w-4" />
          Novo Item
        </button>
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <input
            type="text"
            placeholder="Buscar item..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full rounded-xl border border-border bg-card px-10 py-2.5 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/50"
          />
        </div>
        <select
          value={filterCategory}
          onChange={(e) => setFilterCategory(e.target.value)}
          className="rounded-xl border border-border bg-card px-3 py-2.5 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/50"
        >
          <option value="">Todas as categorias</option>
          {categories.map((cat) => (
            <option key={cat.id} value={cat.id}>{cat.name}</option>
          ))}
        </select>
      </div>

      {/* Items Table */}
      <div className="rounded-2xl border border-border bg-card overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border bg-secondary/50">
                <th className="text-left px-4 py-3 font-medium text-muted-foreground">Item</th>
                <th className="text-left px-4 py-3 font-medium text-muted-foreground hidden sm:table-cell">Categoria</th>
                <th className="text-right px-4 py-3 font-medium text-muted-foreground">Preco</th>
                <th className="text-right px-4 py-3 font-medium text-muted-foreground w-24">Acoes</th>
              </tr>
            </thead>
            <tbody>
              <AnimatePresence>
                {filteredItems.map((item) => (
                  <motion.tr
                    key={item.id}
                    layout
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    className="border-b border-border last:border-0 hover:bg-secondary/30 transition-colors"
                  >
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-3">
                        <div className="relative h-10 w-10 flex-shrink-0 rounded-lg overflow-hidden bg-muted">
                          <Image src={item.image} alt={item.name} fill className="object-cover" sizes="40px" quality={60} loading="lazy" />
                        </div>
                        <div className="min-w-0">
                          <p className={`font-medium truncate ${item.available === false ? "text-muted-foreground" : ""}`}>
                            {item.name}
                            {item.available === false && (
                              <span className="ml-1.5 text-xs font-normal text-amber-600">(indisponível)</span>
                            )}
                          </p>
                          <p className="text-xs text-muted-foreground truncate max-w-[200px]">{item.description}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-3 hidden sm:table-cell">
                      <span className="inline-flex rounded-lg bg-secondary px-2 py-1 text-xs font-medium">
                        {categories.find((c) => c.id === item.category)?.name || item.category}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-right font-bold text-primary whitespace-nowrap">
                      {item.variants && item.variants.length > 0 ? (
                        <span className="text-xs">
                          {item.variants.length} sabor(es)
                        </span>
                      ) : (
                        <>R$ {item.price.toFixed(2).replace(".", ",")}</>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center justify-end gap-1">
                        <button
                          onClick={async () => {
                            try {
                              await updateMenuItem(item.id, { available: !(item.available !== false) })
                            } catch (e) {
                              alert(e instanceof Error ? e.message : "Erro ao atualizar")
                            }
                          }}
                          className={`p-2 rounded-lg transition-colors ${
                            item.available !== false
                              ? "hover:bg-amber-500/10 text-muted-foreground hover:text-amber-600"
                              : "bg-amber-500/15 text-amber-600 hover:bg-amber-500/20"
                          }`}
                          title={item.available !== false ? "Marcar como indisponível" : "Marcar como disponível"}
                          aria-label={item.available !== false ? "Indisponível" : "Disponível"}
                        >
                          {item.available !== false ? <Eye className="h-4 w-4" /> : <EyeOff className="h-4 w-4" />}
                        </button>
                        <button
                          onClick={() => { setEditingItem(item); setIsAdding(false) }}
                          className="p-2 rounded-lg hover:bg-primary/10 text-muted-foreground hover:text-primary transition-colors"
                          aria-label={`Editar ${item.name}`}
                        >
                          <Pencil className="h-4 w-4" />
                        </button>
                        {deleteConfirm === item.id ? (
                          <div className="flex items-center gap-1">
                            <button
                              onClick={async () => { await deleteMenuItem(item.id); setDeleteConfirm(null) }}
                              className="px-2 py-1 rounded-lg bg-destructive text-destructive-foreground text-xs font-medium"
                            >
                              Sim
                            </button>
                            <button
                              onClick={() => setDeleteConfirm(null)}
                              className="px-2 py-1 rounded-lg bg-secondary text-xs font-medium"
                            >
                              Nao
                            </button>
                          </div>
                        ) : (
                          <button
                            onClick={() => setDeleteConfirm(item.id)}
                            className="p-2 rounded-lg hover:bg-destructive/10 text-muted-foreground hover:text-destructive transition-colors"
                            aria-label={`Excluir ${item.name}`}
                          >
                            <Trash2 className="h-4 w-4" />
                          </button>
                        )}
                      </div>
                    </td>
                  </motion.tr>
                ))}
              </AnimatePresence>
            </tbody>
          </table>
        </div>
        {filteredItems.length === 0 && (
          <div className="p-8 text-center text-muted-foreground text-sm">
            Nenhum item encontrado.
          </div>
        )}
      </div>

      {/* Add/Edit Modal */}
      <AnimatePresence>
        {(isAdding || editingItem) && (
          <MenuItemModal
            item={editingItem}
            categories={categories}
            onSave={async (item) => {
              try {
                if (editingItem) {
                  await updateMenuItem(editingItem.id, item)
                } else {
                  await addMenuItem({ ...item, id: `item-${Date.now()}` })
                }
                setEditingItem(null)
                setIsAdding(false)
              } catch {
                // erro ao salvar
              }
            }}
            onClose={() => { setEditingItem(null); setIsAdding(false) }}
          />
        )}
      </AnimatePresence>
    </div>
  )
}

function MenuItemModal({
  item,
  categories,
  onSave,
  onClose,
}: {
  item: MenuItem | null
  categories: { id: string; name: string }[]
  onSave: (data: MenuItem) => void
  onClose: () => void
}) {
  const [form, setForm] = useState<MenuItem>(
    item
      ? { ...item, variants: item.variants || [] }
      : {
          id: "",
          name: "",
          description: "",
          price: 0,
          image: "/images/hero-bg.jpg",
          category: categories[0]?.id || "",
          available: true,
          variants: [],
        }
  )

  useEffect(() => {
    if (item) {
      setForm({ ...item, variants: item.variants || [] })
    } else {
      setForm({
        id: "",
        name: "",
        description: "",
        price: 0,
        image: "/images/hero-bg.jpg",
        category: categories[0]?.id || "",
        available: true,
        variants: [],
      })
    }
  }, [item, categories])

  function addVariant() {
    setForm((prev) => ({
      ...prev,
      variants: [...(prev.variants || []), { id: "", name: "", price: 0, available: true }],
    }))
  }

  function updateVariant(index: number, data: Partial<MenuItemVariant>) {
    setForm((prev) => {
      const v = [...(prev.variants || [])]
      v[index] = { ...v[index], ...data } as MenuItemVariant
      return { ...prev, variants: v }
    })
  }

  function removeVariant(index: number) {
    setForm((prev) => ({
      ...prev,
      variants: prev.variants?.filter((_, i) => i !== index) || [],
    }))
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    const price =
      form.variants && form.variants.length > 0
        ? Math.min(...form.variants.map((v) => v.price))
        : form.price
    onSave({ ...form, price })
  }

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
        className="fixed inset-4 z-50 m-auto max-w-md max-h-[90vh] overflow-y-auto rounded-2xl bg-background border border-border"
      >
        <div className="flex items-center justify-between p-4 border-b border-border sticky top-0 bg-background z-10">
          <h3 className="font-display text-lg font-bold">
            {item ? "Editar Item" : "Novo Item"}
          </h3>
          <button onClick={onClose} className="p-2 rounded-lg hover:bg-secondary transition-colors">
            <X className="h-5 w-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-4 flex flex-col gap-4">
          <div>
            <label className="text-xs text-muted-foreground mb-1 block">Nome *</label>
            <input
              type="text"
              required
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
              className="w-full rounded-xl border border-border bg-card px-3 py-2.5 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/50"
              placeholder="Nome do item"
            />
          </div>

          <div>
            <label className="text-xs text-muted-foreground mb-1 block">Descricao *</label>
            <textarea
              required
              value={form.description}
              onChange={(e) => setForm({ ...form, description: e.target.value })}
              rows={3}
              className="w-full rounded-xl border border-border bg-card px-3 py-2.5 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/50 resize-none"
              placeholder="Descricao do item"
            />
          </div>

          <div>
            <label className="text-xs text-muted-foreground mb-1 block">Preco base (R$) - usado quando nao ha variantes</label>
            <input
              type="number"
              min="0"
              step="0.01"
              value={form.price || ""}
              onChange={(e) => setForm({ ...form, price: parseFloat(e.target.value) || 0 })}
              className="w-full rounded-xl border border-border bg-card px-3 py-2.5 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/50"
              placeholder="0,00"
            />
          </div>

          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="text-xs text-muted-foreground block">Sabores / Variantes</label>
              <button
                type="button"
                onClick={addVariant}
                className="text-xs text-primary font-medium hover:underline"
              >
                + Adicionar
              </button>
            </div>
            <div className="space-y-2 max-h-40 overflow-y-auto">
              {(form.variants || []).map((v, i) => (
                <div key={i} className="flex gap-2 items-center rounded-lg border border-border p-2 bg-secondary/30">
                  <input
                    type="text"
                    value={v.name}
                    onChange={(e) => updateVariant(i, { name: e.target.value })}
                    placeholder="Nome (ex: Tradicional)"
                    className="flex-1 rounded-lg border border-border bg-card px-2 py-1.5 text-sm"
                  />
                  <input
                    type="number"
                    min="0"
                    step="0.01"
                    value={v.price || ""}
                    onChange={(e) => updateVariant(i, { price: parseFloat(e.target.value) || 0 })}
                    placeholder="R$"
                    className="w-20 rounded-lg border border-border bg-card px-2 py-1.5 text-sm"
                  />
                  <label className="flex items-center gap-1 text-xs whitespace-nowrap">
                    <input
                      type="checkbox"
                      checked={v.available}
                      onChange={(e) => updateVariant(i, { available: e.target.checked })}
                    />
                    Disp.
                  </label>
                  <button
                    type="button"
                    onClick={() => removeVariant(i)}
                    className="p-1 rounded hover:bg-destructive/20 text-destructive"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              ))}
            </div>
          </div>

          <label className="flex items-center gap-2 cursor-pointer">
            <input
              type="checkbox"
              checked={form.available !== false}
              onChange={(e) => setForm({ ...form, available: e.target.checked })}
              className="rounded border-border"
            />
            <span className="text-sm font-medium">Disponível no cardápio</span>
          </label>

          <div>
            <label className="text-xs text-muted-foreground mb-1 block">Categoria *</label>
            <select
              required
              value={form.category}
              onChange={(e) => setForm({ ...form, category: e.target.value })}
              className="w-full rounded-xl border border-border bg-card px-3 py-2.5 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/50"
            >
              {categories.map((cat) => (
                <option key={cat.id} value={cat.id}>{cat.name}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="text-xs text-muted-foreground mb-1 block">URL da Imagem</label>
            <div className="flex items-center gap-3">
              <input
                type="text"
                value={form.image}
                onChange={(e) => setForm({ ...form, image: e.target.value })}
                className="flex-1 rounded-xl border border-border bg-card px-3 py-2.5 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/50"
                placeholder="/images/item.jpg"
              />
              {form.image && (
                <div className="relative h-10 w-10 flex-shrink-0 rounded-lg overflow-hidden border border-border">
                  <Image src={form.image} alt="Preview" fill className="object-cover" sizes="40px" />
                </div>
              )}
            </div>
          </div>

          <div className="flex gap-3 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 rounded-xl border border-border bg-card py-2.5 text-sm font-semibold hover:bg-secondary transition-colors"
            >
              Cancelar
            </button>
            <button
              type="submit"
              className="flex-1 rounded-xl bg-primary py-2.5 text-sm font-bold text-primary-foreground hover:bg-primary/90 transition-colors"
            >
              Salvar
            </button>
          </div>
        </form>
      </motion.div>
    </>
  )
}
