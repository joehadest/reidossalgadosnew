"use client"

import { useState } from "react"
import { motion, AnimatePresence } from "framer-motion"
import {
  X,
  CreditCard,
  Banknote,
  QrCode,
  Smartphone,
  CheckCircle2,
  Copy,
  ArrowLeft,
} from "lucide-react"
import { useCart } from "@/lib/cart-context"
import { useAdmin } from "@/lib/admin-context"

interface CheckoutModalProps {
  isOpen: boolean
  onClose: () => void
}

type Step = "info" | "payment" | "confirmation"

const paymentIcons: Record<string, React.ReactNode> = {
  "Cartao de Credito": <CreditCard className="h-5 w-5" />,
  "Cartao de Debito": <CreditCard className="h-5 w-5" />,
  PIX: <QrCode className="h-5 w-5" />,
  Dinheiro: <Banknote className="h-5 w-5" />,
}

export function CheckoutModal({ isOpen, onClose }: CheckoutModalProps) {
  const { items, totalPrice, clearCart } = useCart()
  const { store } = useAdmin()
  const [step, setStep] = useState<Step>("info")
  const [formData, setFormData] = useState({
    name: "",
    phone: "",
    address: "",
    neighborhood: "",
    complement: "",
    paymentMethod: "",
    change: "",
  })
  const [pixCopied, setPixCopied] = useState(false)
  const [submitting, setSubmitting] = useState(false)

  const deliveryFee =
    store.deliveryFees.find((f) => f.neighborhood === formData.neighborhood)?.fee || 0
  const finalTotal = totalPrice + deliveryFee

  function handleSubmitInfo(e: React.FormEvent) {
    e.preventDefault()
    setStep("payment")
  }

  async function handleFinish() {
    const orderPayload = {
      name: formData.name,
      phone: formData.phone,
      address: formData.address,
      neighborhood: formData.neighborhood,
      complement: formData.complement || null,
      paymentMethod: formData.paymentMethod,
      changeFor: formData.paymentMethod === "Dinheiro" && formData.change ? formData.change : null,
      subtotal: totalPrice,
      deliveryFee,
      total: finalTotal,
      items: items.map((i) => ({
        itemId: i.itemId,
        variantId: i.variantId || undefined,
        name: i.name,
        variantName: i.variantName || undefined,
        price: i.price,
        quantity: i.quantity,
      })),
    }

    setSubmitting(true)
    try {
      const res = await fetch("/api/orders", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(orderPayload),
      })
      if (!res.ok) {
        const err = await res.json().catch(() => ({}))
        throw new Error(err.error || "Erro ao salvar pedido")
      }
    } catch (e) {
      alert(e instanceof Error ? e.message : "Erro ao enviar pedido. Tente novamente.")
      return
    } finally {
      setSubmitting(false)
    }

    const itemsList = items
      .map((i) => {
        const label = i.variantName ? `${i.name} (${i.variantName})` : i.name
        return `${i.quantity}x ${label} - R$ ${(i.price * i.quantity).toFixed(2).replace(".", ",")}`
      })
      .join("\n")
    const message = `*Novo Pedido - ${store.name}*\n\n*Cliente:* ${formData.name}\n*Telefone:* ${formData.phone}\n*Endereco:* ${formData.address}, ${formData.neighborhood}${formData.complement ? ` - ${formData.complement}` : ""}\n\n*Itens:*\n${itemsList}\n\n*Subtotal:* R$ ${totalPrice.toFixed(2).replace(".", ",")}\n*Entrega:* R$ ${deliveryFee.toFixed(2).replace(".", ",")}\n*Total:* R$ ${finalTotal.toFixed(2).replace(".", ",")}\n\n*Pagamento:* ${formData.paymentMethod}${formData.paymentMethod === "Dinheiro" && formData.change ? `\n*Troco para:* R$ ${formData.change}` : ""}`

    const encoded = encodeURIComponent(message)
    window.open(`https://wa.me/${store.whatsapp}?text=${encoded}`, "_blank")

    setStep("confirmation")
  }

  function handleClose() {
    if (step === "confirmation") {
      clearCart()
    }
    setStep("info")
    setFormData({
      name: "",
      phone: "",
      address: "",
      neighborhood: "",
      complement: "",
      paymentMethod: "",
      change: "",
    })
    onClose()
  }

  function copyPix() {
    navigator.clipboard.writeText(store.pixKey)
    setPixCopied(true)
    setTimeout(() => setPixCopied(false), 2000)
  }

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={handleClose}
            className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm"
          />

          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 20 }}
            transition={{ type: "spring", damping: 25, stiffness: 300 }}
            className="fixed inset-4 z-50 m-auto max-w-lg max-h-[90vh] overflow-y-auto rounded-2xl bg-background border border-border flex flex-col"
          >
            {/* Header */}
            <div className="flex items-center justify-between p-4 border-b border-border sticky top-0 bg-background z-10">
              <div className="flex items-center gap-2">
                {step === "payment" && (
                  <button onClick={() => setStep("info")} className="p-1 rounded hover:bg-secondary transition-colors">
                    <ArrowLeft className="h-4 w-4" />
                  </button>
                )}
                <h2 className="font-display text-lg font-bold">
                  {step === "info" && "Dados da Entrega"}
                  {step === "payment" && "Pagamento"}
                  {step === "confirmation" && "Pedido Enviado"}
                </h2>
              </div>
              <button onClick={handleClose} className="p-2 rounded-lg hover:bg-secondary transition-colors" aria-label="Fechar">
                <X className="h-5 w-5" />
              </button>
            </div>

            {/* Steps indicator */}
            <div className="px-4 pt-4">
              <div className="flex items-center gap-2">
                {["info", "payment", "confirmation"].map((s, i) => (
                  <div key={s} className="flex items-center gap-2 flex-1">
                    <div
                      className={`h-1.5 w-full rounded-full transition-colors ${
                        i <= ["info", "payment", "confirmation"].indexOf(step)
                          ? "bg-primary"
                          : "bg-secondary"
                      }`}
                    />
                  </div>
                ))}
              </div>
            </div>

            <div className="p-4 flex-1">
              {/* Step 1: Customer Info */}
              {step === "info" && (
                <motion.form
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  onSubmit={handleSubmitInfo}
                  className="flex flex-col gap-4"
                >
                  <div>
                    <label className="text-xs text-muted-foreground mb-1 block">Nome completo *</label>
                    <input
                      type="text"
                      required
                      value={formData.name}
                      onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                      className="w-full rounded-lg border border-border bg-card px-3 py-2.5 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/50"
                      placeholder="Seu nome"
                    />
                  </div>
                  <div>
                    <label className="text-xs text-muted-foreground mb-1 block">Telefone *</label>
                    <input
                      type="tel"
                      required
                      value={formData.phone}
                      onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                      className="w-full rounded-lg border border-border bg-card px-3 py-2.5 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/50"
                      placeholder="(84) 9 9999-9999"
                    />
                  </div>
                  <div>
                    <label className="text-xs text-muted-foreground mb-1 block">Endereco *</label>
                    <input
                      type="text"
                      required
                      value={formData.address}
                      onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                      className="w-full rounded-lg border border-border bg-card px-3 py-2.5 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/50"
                      placeholder="Rua, numero"
                    />
                  </div>
                  <div>
                    <label className="text-xs text-muted-foreground mb-1 block">Bairro *</label>
                    <select
                      required
                      value={formData.neighborhood}
                      onChange={(e) => setFormData({ ...formData, neighborhood: e.target.value })}
                      className="w-full rounded-lg border border-border bg-card px-3 py-2.5 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/50"
                    >
                      <option value="">Selecione o bairro</option>
                      {store.deliveryFees.map((f) => (
                        <option key={f.neighborhood} value={f.neighborhood}>
                          {f.neighborhood} - R$ {f.fee.toFixed(2).replace(".", ",")}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="text-xs text-muted-foreground mb-1 block">Complemento</label>
                    <input
                      type="text"
                      value={formData.complement}
                      onChange={(e) => setFormData({ ...formData, complement: e.target.value })}
                      className="w-full rounded-lg border border-border bg-card px-3 py-2.5 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/50"
                      placeholder="Apto, bloco, referencia..."
                    />
                  </div>
                  <button
                    type="submit"
                    className="w-full rounded-xl bg-primary py-3 text-sm font-bold text-primary-foreground hover:bg-primary/90 transition-colors mt-2"
                  >
                    Continuar para Pagamento
                  </button>
                </motion.form>
              )}

              {/* Step 2: Payment */}
              {step === "payment" && (
                <motion.div
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  className="flex flex-col gap-4"
                >
                  <p className="text-sm text-muted-foreground">Escolha a forma de pagamento:</p>
                  <div className="grid grid-cols-2 gap-3">
                    {store.paymentMethods.map((method) => (
                      <button
                        key={method}
                        onClick={() => setFormData({ ...formData, paymentMethod: method })}
                        className={`flex flex-col items-center gap-2 rounded-xl border p-4 transition-all ${
                          formData.paymentMethod === method
                            ? "border-primary bg-primary/10 text-primary"
                            : "border-border bg-card text-muted-foreground hover:border-primary/30"
                        }`}
                      >
                        {paymentIcons[method] || <CreditCard className="h-5 w-5" />}
                        <span className="text-xs font-medium">{method}</span>
                      </button>
                    ))}
                  </div>

                  {/* PIX info */}
                  {formData.paymentMethod === "PIX" && (
                    <motion.div
                      initial={{ opacity: 0, height: 0 }}
                      animate={{ opacity: 1, height: "auto" }}
                      className="rounded-xl border border-primary/20 bg-primary/5 p-4"
                    >
                      <p className="text-xs text-muted-foreground mb-2">Chave PIX (Telefone):</p>
                      <div className="flex items-center gap-2">
                        <code className="flex-1 rounded-lg bg-card px-3 py-2 text-sm font-mono">
                          {store.pixKey}
                        </code>
                        <button
                          onClick={copyPix}
                          className="p-2 rounded-lg bg-primary text-primary-foreground hover:bg-primary/90 transition-colors"
                          aria-label="Copiar chave PIX"
                        >
                          {pixCopied ? <CheckCircle2 className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
                        </button>
                      </div>
                    </motion.div>
                  )}

                  {/* Change */}
                  {formData.paymentMethod === "Dinheiro" && (
                    <motion.div
                      initial={{ opacity: 0, height: 0 }}
                      animate={{ opacity: 1, height: "auto" }}
                    >
                      <label className="text-xs text-muted-foreground mb-1 block">Troco para quanto?</label>
                      <input
                        type="text"
                        value={formData.change}
                        onChange={(e) => setFormData({ ...formData, change: e.target.value })}
                        className="w-full rounded-lg border border-border bg-card px-3 py-2.5 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/50"
                        placeholder="Ex: 50,00"
                      />
                    </motion.div>
                  )}

                  {/* Summary */}
                  <div className="rounded-xl border border-border bg-card p-4 flex flex-col gap-2 text-sm">
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Subtotal ({items.length} itens)</span>
                      <span>R$ {totalPrice.toFixed(2).replace(".", ",")}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Entrega ({formData.neighborhood})</span>
                      <span>R$ {deliveryFee.toFixed(2).replace(".", ",")}</span>
                    </div>
                    <div className="flex justify-between font-bold text-base pt-2 border-t border-border">
                      <span>Total</span>
                      <span className="text-primary">R$ {finalTotal.toFixed(2).replace(".", ",")}</span>
                    </div>
                  </div>

                  <button
                    onClick={handleFinish}
                    disabled={!formData.paymentMethod || submitting}
                    className="w-full rounded-xl bg-primary py-3 text-sm font-bold text-primary-foreground hover:bg-primary/90 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                  >
                    {submitting ? (
                      <>
                        <span className="h-4 w-4 rounded-full border-2 border-primary-foreground border-t-transparent animate-spin" />
                        Salvando...
                      </>
                    ) : (
                      <>
                        <Smartphone className="h-4 w-4" />
                        Enviar Pedido via WhatsApp
                      </>
                    )}
                  </button>
                </motion.div>
              )}

              {/* Step 3: Confirmation */}
              {step === "confirmation" && (
                <motion.div
                  initial={{ opacity: 0, scale: 0.9 }}
                  animate={{ opacity: 1, scale: 1 }}
                  className="flex flex-col items-center text-center gap-4 py-8"
                >
                  <motion.div
                    initial={{ scale: 0 }}
                    animate={{ scale: 1 }}
                    transition={{ type: "spring", damping: 10, stiffness: 200, delay: 0.2 }}
                    className="h-20 w-20 rounded-full bg-primary/15 flex items-center justify-center"
                  >
                    <CheckCircle2 className="h-10 w-10 text-primary" />
                  </motion.div>
                  <div>
                    <h3 className="font-display text-xl font-bold">Pedido Enviado!</h3>
                    <p className="text-sm text-muted-foreground mt-2 max-w-xs">
                      Seu pedido foi enviado via WhatsApp. Aguarde a confirmacao do restaurante.
                    </p>
                  </div>
                  <button
                    onClick={handleClose}
                    className="rounded-xl bg-primary px-6 py-3 text-sm font-bold text-primary-foreground hover:bg-primary/90 transition-colors"
                  >
                    Fechar
                  </button>
                </motion.div>
              )}
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  )
}
