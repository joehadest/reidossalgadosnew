"use client"

import { useState } from "react"
import { motion, AnimatePresence } from "framer-motion"
import { Plus, Pencil, Trash2, X, Flame, Cookie, CupSoda, Package, UtensilsCrossed, ChevronUp, ChevronDown } from "lucide-react"
import { useAdmin } from "@/lib/admin-context"

const iconOptions = [
  { value: "flame", label: "Fogo", icon: <Flame className="h-4 w-4" /> },
  { value: "cookie", label: "Biscoito", icon: <Cookie className="h-4 w-4" /> },
  { value: "sandwich", label: "Lanche", icon: <UtensilsCrossed className="h-4 w-4" /> },
  { value: "cup-soda", label: "Bebida", icon: <CupSoda className="h-4 w-4" /> },
  { value: "package", label: "Combo", icon: <Package className="h-4 w-4" /> },
]

const iconMap: Record<string, React.ReactNode> = {
  flame: <Flame className="h-5 w-5" />,
  cookie: <Cookie className="h-5 w-5" />,
  sandwich: <UtensilsCrossed className="h-5 w-5" />,
  "cup-soda": <CupSoda className="h-5 w-5" />,
  package: <Package className="h-5 w-5" />,
}

export function CategoriesSection() {
  const { categories, menuItems, addCategory, updateCategory, deleteCategory, reorderCategories } = useAdmin()
  const [editingId, setEditingId] = useState<string | null>(null)
  const [isAdding, setIsAdding] = useState(false)
  const [form, setForm] = useState({ name: "", icon: "flame" })
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null)

  async function handleSave() {
    if (!form.name.trim()) return
    try {
      const id = form.name.toLowerCase().replace(/\s+/g, "-")
      if (editingId) {
        await updateCategory(editingId, { name: form.name, icon: form.icon })
      } else {
        await addCategory({ id, name: form.name, icon: form.icon })
      }
      reset()
    } catch {
      // erro ao salvar
    }
  }

  function reset() {
    setForm({ name: "", icon: "flame" })
    setEditingId(null)
    setIsAdding(false)
  }

  function startEdit(id: string) {
    const cat = categories.find((c) => c.id === id)
    if (!cat) return
    setForm({ name: cat.name, icon: cat.icon })
    setEditingId(id)
    setIsAdding(false)
  }

  async function moveCategory(index: number, direction: "up" | "down") {
    const newIndex = direction === "up" ? index - 1 : index + 1
    if (newIndex < 0 || newIndex >= categories.length) return
    const newOrder = [...categories]
    ;[newOrder[index], newOrder[newIndex]] = [newOrder[newIndex], newOrder[index]]
    await reorderCategories(newOrder.map((c) => c.id))
  }

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h2 className="font-display text-2xl font-bold">Categorias</h2>
          <p className="text-sm text-muted-foreground mt-1">{categories.length} categorias</p>
        </div>
        <button
          onClick={() => { setIsAdding(true); setEditingId(null); setForm({ name: "", icon: "flame" }) }}
          className="flex items-center gap-2 rounded-xl bg-primary px-4 py-2.5 text-sm font-semibold text-primary-foreground hover:bg-primary/90 transition-colors"
        >
          <Plus className="h-4 w-4" />
          Nova Categoria
        </button>
      </div>

      {/* Add/Edit Form */}
      <AnimatePresence>
        {(isAdding || editingId) && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            className="rounded-2xl border border-primary/20 bg-primary/5 p-4 overflow-hidden"
          >
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-semibold text-sm">{editingId ? "Editar Categoria" : "Nova Categoria"}</h3>
              <button onClick={reset} className="p-1 rounded hover:bg-secondary transition-colors">
                <X className="h-4 w-4" />
              </button>
            </div>
            <div className="flex flex-col gap-3">
              <div>
                <label className="text-xs text-muted-foreground mb-1 block">Nome</label>
                <input
                  type="text"
                  value={form.name}
                  onChange={(e) => setForm({ ...form, name: e.target.value })}
                  className="w-full rounded-xl border border-border bg-card px-3 py-2.5 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/50"
                  placeholder="Nome da categoria"
                  autoFocus
                />
              </div>
              <div>
                <label className="text-xs text-muted-foreground mb-1 block">Icone</label>
                <div className="flex flex-wrap gap-2">
                  {iconOptions.map((opt) => (
                    <button
                      key={opt.value}
                      type="button"
                      onClick={() => setForm({ ...form, icon: opt.value })}
                      className={`flex items-center gap-2 rounded-xl border px-3 py-2 text-sm transition-all ${
                        form.icon === opt.value
                          ? "border-primary bg-primary/10 text-primary"
                          : "border-border bg-card text-muted-foreground hover:border-primary/30"
                      }`}
                    >
                      {opt.icon}
                      {opt.label}
                    </button>
                  ))}
                </div>
              </div>
              <div className="flex gap-3 pt-2">
                <button
                  onClick={reset}
                  className="flex-1 rounded-xl border border-border bg-card py-2.5 text-sm font-semibold hover:bg-secondary transition-colors"
                >
                  Cancelar
                </button>
                <button
                  onClick={handleSave}
                  className="flex-1 rounded-xl bg-primary py-2.5 text-sm font-bold text-primary-foreground hover:bg-primary/90 transition-colors"
                >
                  Salvar
                </button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Categories List */}
      <div className="flex flex-col gap-3">
        {categories.map((cat, index) => {
          const itemCount = menuItems.filter((i) => i.category === cat.id).length
          return (
            <motion.div
              key={cat.id}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.05 }}
              className="flex items-center justify-between rounded-2xl border border-border bg-card p-4"
            >
              <div className="flex items-center gap-4">
                <div className="flex flex-col gap-0.5">
                  <button
                    onClick={() => moveCategory(index, "up")}
                    disabled={index === 0}
                    className="p-1 rounded hover:bg-secondary text-muted-foreground hover:text-foreground disabled:opacity-30 disabled:cursor-not-allowed"
                    aria-label="Mover para cima"
                  >
                    <ChevronUp className="h-4 w-4" />
                  </button>
                  <button
                    onClick={() => moveCategory(index, "down")}
                    disabled={index === categories.length - 1}
                    className="p-1 rounded hover:bg-secondary text-muted-foreground hover:text-foreground disabled:opacity-30 disabled:cursor-not-allowed"
                    aria-label="Mover para baixo"
                  >
                    <ChevronDown className="h-4 w-4" />
                  </button>
                </div>
                <div className="h-10 w-10 rounded-xl bg-primary/10 flex items-center justify-center text-primary">
                  {iconMap[cat.icon] || <Package className="h-5 w-5" />}
                </div>
                <div>
                  <p className="font-medium text-sm">{cat.name}</p>
                  <p className="text-xs text-muted-foreground">{itemCount} itens</p>
                </div>
              </div>
              <div className="flex items-center gap-1">
                <button
                  onClick={() => startEdit(cat.id)}
                  className="p-2 rounded-lg hover:bg-primary/10 text-muted-foreground hover:text-primary transition-colors"
                  aria-label={`Editar ${cat.name}`}
                >
                  <Pencil className="h-4 w-4" />
                </button>
                {deleteConfirm === cat.id ? (
                  <div className="flex items-center gap-1">
                    <button
                      onClick={async () => { await deleteCategory(cat.id); setDeleteConfirm(null) }}
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
                    onClick={() => setDeleteConfirm(cat.id)}
                    className="p-2 rounded-lg hover:bg-destructive/10 text-muted-foreground hover:text-destructive transition-colors"
                    aria-label={`Excluir ${cat.name}`}
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                )}
              </div>
            </motion.div>
          )
        })}
      </div>
    </div>
  )
}
