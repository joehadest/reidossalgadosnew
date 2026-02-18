"use client"

import { useState, useEffect } from "react"
import { motion } from "framer-motion"
import { Save, CheckCircle2, Clock } from "lucide-react"
import { useAdmin } from "@/lib/admin-context"

export function HoursSection() {
  const { store, updateHours } = useAdmin()
  const [hours, setHours] = useState([...store.hours])
  const [saved, setSaved] = useState(false)

  useEffect(() => {
    setHours([...store.hours])
  }, [store.hours])

  function handleChange(index: number, field: "open" | "close" | "closed", value: string | boolean) {
    const updated = [...hours]
    updated[index] = { ...updated[index], [field]: value }
    setHours(updated)
  }

  async function handleSave() {
    try {
      await updateHours(hours)
      setSaved(true)
      setTimeout(() => setSaved(false), 2000)
    } catch {
      setSaved(false)
    }
  }

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h2 className="font-display text-2xl font-bold">Horarios de Funcionamento</h2>
        <p className="text-sm text-muted-foreground mt-1">Configure os horarios de cada dia. Use &quot;Fechar dia&quot; para deixar fechado sem alterar o horario.</p>
      </div>

      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        className="rounded-2xl border border-border bg-card overflow-hidden"
      >
        {hours.map((h, index) => (
          <div
            key={h.day}
            className={`flex items-center gap-4 px-4 py-4 sm:px-6 ${
              index < hours.length - 1 ? "border-b border-border" : ""
            } ${h.closed ? "bg-muted/30" : ""}`}
          >
            <div className="flex items-center gap-3 w-28 sm:w-32 flex-shrink-0">
              <Clock className="h-4 w-4 text-primary hidden sm:block" />
              <span className="text-sm font-medium">{h.day}</span>
            </div>
            <div className="flex items-center gap-2 flex-1 flex-wrap">
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={!!h.closed}
                  onChange={(e) => handleChange(index, "closed", e.target.checked)}
                  className="rounded border-border"
                />
                <span className="text-sm text-muted-foreground whitespace-nowrap">Fechar dia</span>
              </label>
              {!h.closed && (
                <>
                  <input
                    type="time"
                    value={h.open}
                    onChange={(e) => handleChange(index, "open", e.target.value)}
                    className="flex-1 min-w-[100px] rounded-xl border border-border bg-background px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/50"
                  />
                  <span className="text-muted-foreground text-xs">ate</span>
                  <input
                    type="time"
                    value={h.close}
                    onChange={(e) => handleChange(index, "close", e.target.value)}
                    className="flex-1 min-w-[100px] rounded-xl border border-border bg-background px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/50"
                  />
                </>
              )}
            </div>
          </div>
        ))}
      </motion.div>

      <div className="flex justify-end">
        <button
          onClick={handleSave}
          className="flex items-center justify-center gap-2 rounded-xl bg-primary py-3 text-sm font-bold text-primary-foreground hover:bg-primary/90 transition-colors px-8"
        >
          {saved ? (
            <>
              <CheckCircle2 className="h-4 w-4" />
              Salvo!
            </>
          ) : (
            <>
              <Save className="h-4 w-4" />
              Salvar Horarios
            </>
          )}
        </button>
      </div>
    </div>
  )
}
