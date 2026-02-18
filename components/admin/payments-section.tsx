"use client"

import { useState } from "react"
import { motion, AnimatePresence } from "framer-motion"
import { Plus, Trash2, CreditCard, X } from "lucide-react"
import { useAdmin } from "@/lib/admin-context"

export function PaymentsSection() {
  const { store, addPaymentMethod, deletePaymentMethod } = useAdmin()
  const [isAdding, setIsAdding] = useState(false)
  const [newMethod, setNewMethod] = useState("")
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null)

  async function handleAdd() {
    if (!newMethod.trim()) return
    try {
      await addPaymentMethod(newMethod.trim())
      setNewMethod("")
      setIsAdding(false)
    } catch {
      // erro ao adicionar
    }
  }

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h2 className="font-display text-2xl font-bold">Formas de Pagamento</h2>
          <p className="text-sm text-muted-foreground mt-1">{store.paymentMethods.length} formas cadastradas</p>
        </div>
        <button
          onClick={() => { setIsAdding(true); setNewMethod("") }}
          className="flex items-center gap-2 rounded-xl bg-primary px-4 py-2.5 text-sm font-semibold text-primary-foreground hover:bg-primary/90 transition-colors"
        >
          <Plus className="h-4 w-4" />
          Nova Forma
        </button>
      </div>

      {/* Add Form */}
      <AnimatePresence>
        {isAdding && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            className="rounded-2xl border border-primary/20 bg-primary/5 p-4 overflow-hidden"
          >
            <div className="flex items-center justify-between mb-3">
              <h3 className="font-semibold text-sm">Nova Forma de Pagamento</h3>
              <button onClick={() => setIsAdding(false)} className="p-1 rounded hover:bg-secondary transition-colors">
                <X className="h-4 w-4" />
              </button>
            </div>
            <div className="flex gap-3">
              <input
                type="text"
                value={newMethod}
                onChange={(e) => setNewMethod(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && handleAdd()}
                className="flex-1 rounded-xl border border-border bg-card px-3 py-2.5 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/50"
                placeholder="Ex: Cartao de Credito"
                autoFocus
              />
              <button
                onClick={handleAdd}
                className="rounded-xl bg-primary px-6 py-2.5 text-sm font-bold text-primary-foreground hover:bg-primary/90 transition-colors"
              >
                Adicionar
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Methods List */}
      <div className="flex flex-col gap-3">
        {store.paymentMethods.map((method, index) => (
          <motion.div
            key={method}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: index * 0.05 }}
            className="flex items-center justify-between rounded-2xl border border-border bg-card p-4"
          >
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-xl bg-primary/10 flex items-center justify-center text-primary">
                <CreditCard className="h-5 w-5" />
              </div>
              <span className="font-medium text-sm">{method}</span>
            </div>
            {deleteConfirm === method ? (
              <div className="flex items-center gap-2">
                <span className="text-xs text-muted-foreground">Excluir?</span>
                <button
                  onClick={async () => { await deletePaymentMethod(method); setDeleteConfirm(null) }}
                  className="px-3 py-1.5 rounded-lg bg-destructive text-destructive-foreground text-xs font-medium"
                >
                  Sim
                </button>
                <button
                  onClick={() => setDeleteConfirm(null)}
                  className="px-3 py-1.5 rounded-lg bg-secondary text-xs font-medium"
                >
                  Nao
                </button>
              </div>
            ) : (
              <button
                onClick={() => setDeleteConfirm(method)}
                className="p-2 rounded-lg hover:bg-destructive/10 text-muted-foreground hover:text-destructive transition-colors"
                aria-label={`Excluir ${method}`}
              >
                <Trash2 className="h-4 w-4" />
              </button>
            )}
          </motion.div>
        ))}
      </div>

      {store.paymentMethods.length === 0 && (
        <div className="rounded-2xl border border-border bg-card p-8 text-center text-sm text-muted-foreground">
          Nenhuma forma de pagamento cadastrada.
        </div>
      )}
    </div>
  )
}
