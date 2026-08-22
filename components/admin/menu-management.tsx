"use client"

import { useState, useEffect } from "react"
import { motion, AnimatePresence } from "framer-motion"
import { Plus, Pencil, Trash2, Search, X, Eye, EyeOff, ImageIcon, Info } from "lucide-react"
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
                          <p className="text-xs text-muted-foreground truncate max-w-[200px] lg:max-w-[360px] 2xl:max-w-[520px]">{item.description}</p>
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
  const [showSaveHint, setShowSaveHint] = useState(false)

  useEffect(() => {
    setShowSaveHint(true)
    const timer = setTimeout(() => setShowSaveHint(false), 7000)
    return () => clearTimeout(timer)
  }, [])

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
        className="modal-panel-md lg:max-w-4xl"
      >
        <div className="flex items-center justify-between px-5 py-4 lg:px-8 lg:py-5 border-b border-border sticky top-0 bg-background z-10">
          <div>
            <h3 className="font-display text-lg lg:text-2xl font-bold">
              {item ? "Editar Item" : "Novo Item"}
            </h3>
            <p className="text-xs lg:text-sm text-muted-foreground mt-0.5">
              {item ? `Altere as informacoes de ${item.name}` : "Preencha as informacoes do novo item"}
            </p>
          </div>
          <button onClick={onClose} className="p-2 rounded-lg hover:bg-secondary transition-colors">
            <X className="h-5 w-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-5 lg:p-8">
          <div className="grid grid-cols-1 lg:grid-cols-[300px_1fr] gap-6 lg:gap-8">
            {/* Coluna esquerda: imagem e preview */}
            <div className="flex flex-col gap-4">
              <div className="relative aspect-square w-full max-w-[280px] mx-auto lg:max-w-none overflow-hidden rounded-2xl border-2 border-dashed border-border bg-secondary/30">
                {form.image ? (
                  <Image
                    src={form.image}
                    alt={form.name || "Preview do item"}
                    fill
                    className="object-cover"
                    sizes="300px"
                    onError={(e) => { (e.target as HTMLImageElement).style.display = "none" }}
                  />
                ) : (
                  <div className="absolute inset-0 flex flex-col items-center justify-center gap-2 text-muted-foreground">
                    <ImageIcon className="h-10 w-10" />
                    <span className="text-xs">Sem imagem</span>
                  </div>
                )}
              </div>
              <div>
                <label className="text-xs font-semibold text-foreground mb-1.5 block">URL da Imagem</label>
                <input
                  type="text"
                  value={form.image}
                  onChange={(e) => setForm({ ...form, image: e.target.value })}
                  className="w-full rounded-xl border border-border bg-card px-4 py-3 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/50 transition-shadow"
                  placeholder="/images/item.jpg"
                />
                <p className="mt-1.5 text-[11px] text-muted-foreground leading-relaxed">
                  Caminho em /public ou URL externa. O preview aparece acima.
                </p>
              </div>

              {/* Preview de como aparece no cardapio */}
              <div className="hidden lg:block rounded-2xl border border-border bg-card p-4">
                <p className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground mb-3">Preview no cardapio</p>
                <div className="flex gap-3">
                  <div className="relative h-20 w-20 flex-shrink-0 overflow-hidden rounded-xl bg-muted">
                    {form.image && (
                      <Image src={form.image} alt="" fill className="object-cover" sizes="80px" />
                    )}
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="font-semibold text-sm leading-tight truncate">{form.name || "Nome do item"}</p>
                    <p className="mt-0.5 text-xs text-muted-foreground line-clamp-2">{form.description || "Descricao do item"}</p>
                    <p className="mt-1 font-display font-bold text-sm text-primary">
                      R$ {(form.variants && form.variants.length > 0
                        ? Math.min(...form.variants.map((v) => v.price))
                        : form.price || 0).toFixed(2).replace(".", ",")}
                    </p>
                  </div>
                </div>
              </div>

              <label className={`flex items-center justify-between gap-3 rounded-2xl border px-4 py-3.5 cursor-pointer transition-colors ${
                form.available !== false
                  ? "border-emerald-500/40 bg-emerald-500/10"
                  : "border-border bg-card"
              }`}>
                <div className="flex items-center gap-2.5">
                  {form.available !== false ? (
                    <Eye className="h-4 w-4 text-emerald-500" />
                  ) : (
                    <EyeOff className="h-4 w-4 text-muted-foreground" />
                  )}
                  <div>
                    <p className="text-sm font-semibold">Disponivel no cardapio</p>
                    <p className="text-[11px] text-muted-foreground">
                      {form.available !== false ? "Visivel para os clientes" : "Oculto dos clientes"}
                    </p>
                  </div>
                </div>
                <input
                  type="checkbox"
                  checked={form.available !== false}
                  onChange={(e) => setForm({ ...form, available: e.target.checked })}
                  className="h-5 w-5 rounded accent-primary"
                />
              </label>
            </div>

            {/* Coluna direita: campos */}
            <div className="flex flex-col gap-5">
              <div>
                <label className="text-xs font-semibold text-foreground mb-1.5 block">Nome do item *</label>
                <input
                  type="text"
                  required
                  value={form.name}
                  onChange={(e) => setForm({ ...form, name: e.target.value })}
                  className="w-full rounded-xl border border-border bg-card px-4 py-3 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/50 transition-shadow"
                  placeholder="Ex: Coxinha de Frango"
                />
              </div>

              <div>
                <label className="text-xs font-semibold text-foreground mb-1.5 block">Descricao *</label>
                <textarea
                  required
                  value={form.description}
                  onChange={(e) => setForm({ ...form, description: e.target.value })}
                  rows={3}
                  className="w-full rounded-xl border border-border bg-card px-4 py-3 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/50 transition-shadow resize-none leading-relaxed"
                  placeholder="Descreva o item de forma atrativa para o cliente"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="text-xs font-semibold text-foreground mb-1.5 block">Preco base (R$)</label>
                  <div className="relative">
                    <span className="absolute left-4 top-1/2 -translate-y-1/2 text-sm text-muted-foreground font-medium">R$</span>
                    <input
                      type="number"
                      min="0"
                      step="0.01"
                      value={form.price || ""}
                      onChange={(e) => setForm({ ...form, price: parseFloat(e.target.value) || 0 })}
                      className="w-full rounded-xl border border-border bg-card pl-11 pr-4 py-3 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/50 transition-shadow"
                      placeholder="0,00"
                    />
                  </div>
                  <p className="mt-1 text-[11px] text-muted-foreground">Usado quando nao ha variantes</p>
                </div>

                <div>
                  <label className="text-xs font-semibold text-foreground mb-1.5 block">Categoria *</label>
                  <select
                    required
                    value={form.category}
                    onChange={(e) => setForm({ ...form, category: e.target.value })}
                    className="w-full rounded-xl border border-border bg-card px-4 py-3 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/50 transition-shadow"
                  >
                    {categories.map((cat) => (
                      <option key={cat.id} value={cat.id}>{cat.name}</option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Variantes */}
              <div className="rounded-2xl border border-border bg-secondary/20 p-4">
                <div className="flex items-center justify-between mb-3">
                  <div>
                    <p className="text-sm font-semibold">Sabores / Variantes</p>
                    <p className="text-[11px] text-muted-foreground mt-0.5">
                      {form.variants?.length
                        ? `${form.variants.length} variante${form.variants.length > 1 ? "s" : ""} cadastrada${form.variants.length > 1 ? "s" : ""}`
                        : "Nenhuma variante — sera usado o preco base"}
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={addVariant}
                    className="flex items-center gap-1.5 rounded-lg bg-primary/10 px-3 py-2 text-xs font-semibold text-primary hover:bg-primary/20 transition-colors"
                  >
                    <Plus className="h-3.5 w-3.5" />
                    Adicionar
                  </button>
                </div>
                {(form.variants || []).length > 0 && (
                  <div className="space-y-2 max-h-48 lg:max-h-64 overflow-y-auto pr-1">
                    {(form.variants || []).map((v, i) => (
                      <div key={i} className="flex gap-2 items-center rounded-xl border border-border p-2.5 bg-card">
                        <input
                          type="text"
                          value={v.name}
                          onChange={(e) => updateVariant(i, { name: e.target.value })}
                          placeholder="Nome (ex: Tradicional)"
                          className="flex-1 min-w-0 rounded-lg border border-border bg-background px-3 py-2 text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/50"
                        />
                        <div className="relative flex-shrink-0">
                          <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-xs text-muted-foreground">R$</span>
                          <input
                            type="number"
                            min="0"
                            step="0.01"
                            value={v.price || ""}
                            onChange={(e) => updateVariant(i, { price: parseFloat(e.target.value) || 0 })}
                            placeholder="0,00"
                            className="w-24 lg:w-28 rounded-lg border border-border bg-background pl-8 pr-2 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/50"
                          />
                        </div>
                        <label className="flex items-center gap-1.5 text-xs font-medium whitespace-nowrap cursor-pointer flex-shrink-0">
                          <input
                            type="checkbox"
                            checked={v.available}
                            onChange={(e) => updateVariant(i, { available: e.target.checked })}
                            className="h-4 w-4 rounded accent-primary"
                          />
                          <span className="hidden sm:inline">Disp.</span>
                        </label>
                        <button
                          type="button"
                          onClick={() => removeVariant(i)}
                          className="p-2 rounded-lg hover:bg-destructive/15 text-destructive transition-colors flex-shrink-0"
                          aria-label="Remover variante"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Acoes */}
          <div className="flex gap-3 pt-6 mt-6 border-t border-border lg:justify-end">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 lg:flex-none lg:w-40 rounded-xl border border-border bg-card py-3 text-sm font-semibold hover:bg-secondary transition-colors"
            >
              Cancelar
            </button>
            <button
              type="submit"
              className="flex-1 lg:flex-none lg:w-40 rounded-xl bg-primary py-3 text-sm font-bold text-primary-foreground hover:bg-primary/90 transition-colors"
            >
              {item ? "Salvar alteracoes" : "Criar item"}
            </button>
          </div>
        </form>

        {/* Aviso flutuante ao abrir o modal */}
        <AnimatePresence>
          {showSaveHint && (
            <motion.div
              initial={{ opacity: 0, y: 32, scale: 0.8, rotate: -3 }}
              animate={{
                opacity: 1,
                y: 0,
                scale: 1,
                rotate: [0, -1.5, 1.5, -1, 0],
              }}
              exit={{ opacity: 0, y: 16, scale: 0.9 }}
              transition={{
                type: "spring",
                damping: 14,
                stiffness: 260,
                rotate: { delay: 0.35, duration: 0.6, ease: "easeInOut" },
              }}
              className="absolute bottom-8 left-6 sm:left-10 z-20 w-[calc(100%-4rem)] sm:w-[calc(100%-6rem)] max-w-md"
            >
              {/* Borda animada */}
              <div className="hint-border-spin absolute -inset-[2px] rounded-[18px]" />
              <div className="relative flex items-start gap-3 rounded-2xl bg-card p-4 shadow-lg shadow-black/20">
                <motion.div
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  transition={{ delay: 0.25, type: "spring", damping: 10, stiffness: 300 }}
                  className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full bg-primary/15"
                >
                  <Info className="h-4 w-4 text-primary" />
                </motion.div>
                <div className="min-w-0 flex-1">
                  <motion.p
                    initial={{ opacity: 0, x: -8 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: 0.15 }}
                    className="text-sm font-semibold leading-snug"
                  >
                    Oi! Não esqueça de salvar!
                  </motion.p>
                  <motion.p
                    initial={{ opacity: 0, x: -8 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: 0.28 }}
                    className="mt-0.5 text-xs text-muted-foreground leading-relaxed"
                  >
                    Role a tela ate o final para ver os botoes. As alterações so serão aplicadas ao clicar em <span className="font-semibold text-foreground">{item ? "Salvar alteracoes" : "Criar item"}</span>.
                  </motion.p>
                </div>
                <button
                  type="button"
                  onClick={() => setShowSaveHint(false)}
                  className="p-1.5 -m-1 rounded-lg text-muted-foreground hover:bg-secondary hover:text-foreground transition-colors flex-shrink-0"
                  aria-label="Fechar aviso"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </motion.div>
    </>
  )
}
