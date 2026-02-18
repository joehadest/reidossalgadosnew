"use client"

import { useState } from "react"
import { motion, AnimatePresence } from "framer-motion"
import { Plus, Pencil, Trash2, X } from "lucide-react"
import { useAdmin } from "@/lib/admin-context"

export function DeliverySection() {
  const { store, addDeliveryFee, updateDeliveryFee, deleteDeliveryFee } = useAdmin()
  const [isAdding, setIsAdding] = useState(false)
  const [editingNeighborhood, setEditingNeighborhood] = useState<string | null>(null)
  const [form, setForm] = useState({ neighborhood: "", fee: 0 })
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null)

  async function handleSave() {
    if (!form.neighborhood.trim()) return
    try {
      if (editingNeighborhood) {
        await updateDeliveryFee(editingNeighborhood, { neighborhood: form.neighborhood, fee: form.fee })
      } else {
        await addDeliveryFee({ neighborhood: form.neighborhood, fee: form.fee })
      }
      reset()
    } catch {
      // erro ao salvar
    }
  }

  function reset() {
    setForm({ neighborhood: "", fee: 0 })
    setIsAdding(false)
    setEditingNeighborhood(null)
  }

  function startEdit(neighborhood: string) {
    const fee = store.deliveryFees.find((f) => f.neighborhood === neighborhood)
    if (!fee) return
    setForm({ neighborhood: fee.neighborhood, fee: fee.fee })
    setEditingNeighborhood(neighborhood)
    setIsAdding(false)
  }

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h2 className="font-display text-2xl font-bold">Taxas de Entrega</h2>
          <p className="text-sm text-muted-foreground mt-1">{store.deliveryFees.length} bairros cadastrados</p>
        </div>
        <button
          onClick={() => { setIsAdding(true); setEditingNeighborhood(null); setForm({ neighborhood: "", fee: 0 }) }}
          className="flex items-center gap-2 rounded-xl bg-primary px-4 py-2.5 text-sm font-semibold text-primary-foreground hover:bg-primary/90 transition-colors"
        >
          <Plus className="h-4 w-4" />
          Novo Bairro
        </button>
      </div>

      {/* Add/Edit Form */}
      <AnimatePresence>
        {(isAdding || editingNeighborhood) && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            className="rounded-2xl border border-primary/20 bg-primary/5 p-4 overflow-hidden"
          >
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-semibold text-sm">{editingNeighborhood ? "Editar Bairro" : "Novo Bairro"}</h3>
              <button onClick={reset} className="p-1 rounded hover:bg-secondary transition-colors">
                <X className="h-4 w-4" />
              </button>
            </div>
            <div className="flex flex-col sm:flex-row gap-3">
              <div className="flex-1">
                <label className="text-xs text-muted-foreground mb-1 block">Nome do Bairro</label>
                <input
                  type="text"
                  value={form.neighborhood}
                  onChange={(e) => setForm({ ...form, neighborhood: e.target.value })}
                  className="w-full rounded-xl border border-border bg-card px-3 py-2.5 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/50"
                  placeholder="Nome do bairro"
                  autoFocus
                />
              </div>
              <div className="sm:w-40">
                <label className="text-xs text-muted-foreground mb-1 block">Taxa (R$)</label>
                <input
                  type="number"
                  min="0"
                  step="0.5"
                  value={form.fee || ""}
                  onChange={(e) => setForm({ ...form, fee: parseFloat(e.target.value) || 0 })}
                  className="w-full rounded-xl border border-border bg-card px-3 py-2.5 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/50"
                  placeholder="0,00"
                />
              </div>
            </div>
            <div className="flex gap-3 pt-4">
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
          </motion.div>
        )}
      </AnimatePresence>

      {/* Fees Table */}
      <div className="rounded-2xl border border-border bg-card overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-border bg-secondary/50">
              <th className="text-left px-4 py-3 font-medium text-muted-foreground">Bairro</th>
              <th className="text-right px-4 py-3 font-medium text-muted-foreground">Taxa</th>
              <th className="text-right px-4 py-3 font-medium text-muted-foreground w-24">Acoes</th>
            </tr>
          </thead>
          <tbody>
            {store.deliveryFees.map((fee, index) => (
              <motion.tr
                key={fee.neighborhood}
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: index * 0.05 }}
                className="border-b border-border last:border-0 hover:bg-secondary/30 transition-colors"
              >
                <td className="px-4 py-3 font-medium">{fee.neighborhood}</td>
                <td className="px-4 py-3 text-right font-bold text-primary">
                  R$ {fee.fee.toFixed(2).replace(".", ",")}
                </td>
                <td className="px-4 py-3">
                  <div className="flex items-center justify-end gap-1">
                    <button
                      onClick={() => startEdit(fee.neighborhood)}
                      className="p-2 rounded-lg hover:bg-primary/10 text-muted-foreground hover:text-primary transition-colors"
                    >
                      <Pencil className="h-4 w-4" />
                    </button>
                    {deleteConfirm === fee.neighborhood ? (
                      <div className="flex items-center gap-1">
                        <button
                          onClick={async () => { await deleteDeliveryFee(fee.neighborhood); setDeleteConfirm(null) }}
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
                        onClick={() => setDeleteConfirm(fee.neighborhood)}
                        className="p-2 rounded-lg hover:bg-destructive/10 text-muted-foreground hover:text-destructive transition-colors"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    )}
                  </div>
                </td>
              </motion.tr>
            ))}
          </tbody>
        </table>
        {store.deliveryFees.length === 0 && (
          <div className="p-8 text-center text-muted-foreground text-sm">
            Nenhum bairro cadastrado.
          </div>
        )}
      </div>
    </div>
  )
}
