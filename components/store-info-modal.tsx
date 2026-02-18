"use client"

import { motion, AnimatePresence } from "framer-motion"
import { X, Clock, MapPin, Phone, Instagram, CreditCard, Truck } from "lucide-react"
import { useAdmin } from "@/lib/admin-context"

interface StoreInfoModalProps {
  isOpen: boolean
  onClose: () => void
}

export function StoreInfoModal({ isOpen, onClose }: StoreInfoModalProps) {
  const { store } = useAdmin()

  return (
    <AnimatePresence>
      {isOpen && (
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
            className="fixed inset-4 z-50 m-auto max-w-lg max-h-[90vh] overflow-y-auto rounded-2xl bg-background border border-border"
          >
            {/* Header */}
            <div className="flex items-center justify-between p-4 border-b border-border sticky top-0 bg-background z-10">
              <h2 className="font-display text-lg font-bold">Sobre nos</h2>
              <button onClick={onClose} className="p-2 rounded-lg hover:bg-secondary transition-colors" aria-label="Fechar">
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="p-4 flex flex-col gap-6">
              {/* About */}
              <div>
                <p className="text-sm text-muted-foreground leading-relaxed">{store.about}</p>
              </div>

              {/* Hours */}
              <div>
                <div className="flex items-center gap-2 mb-3">
                  <Clock className="h-4 w-4 text-primary" />
                  <h3 className="font-semibold text-sm">Horarios de Funcionamento</h3>
                </div>
                <div className="rounded-xl border border-border bg-card overflow-hidden">
                  {store.hours.map((h, i) => (
                    <div
                      key={h.day}
                      className={`flex items-center justify-between px-4 py-2.5 text-sm ${
                        i < store.hours.length - 1 ? "border-b border-border" : ""
                      }`}
                    >
                      <span className="text-muted-foreground">{h.day}</span>
                      <span className="font-medium">
                        {h.open} - {h.close}
                      </span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Address */}
              <div>
                <div className="flex items-center gap-2 mb-3">
                  <MapPin className="h-4 w-4 text-primary" />
                  <h3 className="font-semibold text-sm">Endereco</h3>
                </div>
                <div className="rounded-xl border border-border bg-card p-4 text-sm">
                  <p>{store.address}</p>
                  <p className="text-muted-foreground">{store.city}</p>
                </div>
              </div>

              {/* Delivery Fees */}
              <div>
                <div className="flex items-center gap-2 mb-3">
                  <Truck className="h-4 w-4 text-primary" />
                  <h3 className="font-semibold text-sm">Taxas de Entrega</h3>
                </div>
                <div className="rounded-xl border border-border bg-card overflow-hidden">
                  {store.deliveryFees.map((f, i) => (
                    <div
                      key={f.neighborhood}
                      className={`flex items-center justify-between px-4 py-2.5 text-sm ${
                        i < store.deliveryFees.length - 1 ? "border-b border-border" : ""
                      }`}
                    >
                      <span className="text-muted-foreground">{f.neighborhood}</span>
                      <span className="font-medium text-primary">
                        R$ {f.fee.toFixed(2).replace(".", ",")}
                      </span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Payment Methods */}
              <div>
                <div className="flex items-center gap-2 mb-3">
                  <CreditCard className="h-4 w-4 text-primary" />
                  <h3 className="font-semibold text-sm">Formas de Pagamento</h3>
                </div>
                <div className="flex flex-wrap gap-2">
                  {store.paymentMethods.map((m) => (
                    <span
                      key={m}
                      className="rounded-lg border border-border bg-card px-3 py-1.5 text-xs font-medium"
                    >
                      {m}
                    </span>
                  ))}
                </div>
              </div>

              {/* Contact */}
              <div>
                <div className="flex items-center gap-2 mb-3">
                  <Phone className="h-4 w-4 text-primary" />
                  <h3 className="font-semibold text-sm">Contato</h3>
                </div>
                <div className="flex flex-col gap-2">
                  <a
                    href={`tel:${store.phone.replace(/\D/g, "")}`}
                    className="flex items-center gap-3 rounded-xl border border-border bg-card p-3 text-sm hover:border-primary/30 transition-colors"
                  >
                    <Phone className="h-4 w-4 text-muted-foreground" />
                    <span>{store.phone}</span>
                  </a>
                  <a
                    href={`https://wa.me/${store.whatsapp}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-3 rounded-xl border border-border bg-card p-3 text-sm hover:border-primary/30 transition-colors"
                  >
                    <Phone className="h-4 w-4 text-muted-foreground" />
                    <span>WhatsApp</span>
                  </a>
                  <a
                    href={`https://instagram.com/${store.instagram.replace("@", "")}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-3 rounded-xl border border-border bg-card p-3 text-sm hover:border-primary/30 transition-colors"
                  >
                    <Instagram className="h-4 w-4 text-muted-foreground" />
                    <span>{store.instagram}</span>
                  </a>
                </div>
              </div>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  )
}
