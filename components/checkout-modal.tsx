"use client"

import { useEffect, useRef, useState } from "react"
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
import { paymentKind } from "@/lib/payment-methods"

interface CheckoutModalProps {
  isOpen: boolean
  onClose: () => void
}

type Step = "info" | "payment" | "confirmation"

const paymentIcons: Record<string, React.ReactNode> = {
  credit: <CreditCard className="h-5 w-5" />,
  debit: <CreditCard className="h-5 w-5" />,
  pix: <QrCode className="h-5 w-5" />,
  cash: <Banknote className="h-5 w-5" />,
}

export function CheckoutModal({ isOpen, onClose }: CheckoutModalProps) {
  const { items, totalPrice, totalItems, clearCart } = useCart()
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
  const [whatsappUrl, setWhatsappUrl] = useState<string | null>(null)
  const viewportRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!isOpen) return

    const previousOverflow = document.body.style.overflow
    document.body.style.overflow = "hidden"
    const viewport = window.visualViewport

    function updateViewport() {
      if (!viewport || !viewportRef.current) return
      viewportRef.current.style.height = `${viewport.height}px`
      viewportRef.current.style.top = `${viewport.offsetTop}px`
    }

    updateViewport()
    viewport?.addEventListener("resize", updateViewport)
    viewport?.addEventListener("scroll", updateViewport)

    return () => {
      document.body.style.overflow = previousOverflow
      viewport?.removeEventListener("resize", updateViewport)
      viewport?.removeEventListener("scroll", updateViewport)
    }
  }, [isOpen])

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
      changeFor: paymentKind(formData.paymentMethod) === "cash" && formData.change ? formData.change : null,
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

    const money = (value: number) => `R$ ${value.toFixed(2).replace(".", ",")}`
    const itemsList = items
      .map((item) => [
        `• *${item.quantity}x ${item.name}*`,
        ...(item.variantName ? [`  Opção: ${item.variantName}`] : []),
        `  Total do item: ${money(item.price * item.quantity)}`,
      ].join("\n"))
      .join("\n\n")
    const message = [
      `*Novo pedido — ${store.name}*`,
      ["*CLIENTE*", `Nome: ${formData.name}`, `Telefone: ${formData.phone}`].join("\n"),
      [
        "*ENTREGA*",
        `Endereço: ${formData.address}`,
        `Bairro: ${formData.neighborhood}`,
        ...(formData.complement.trim() ? [`Complemento: ${formData.complement.trim()}`] : []),
      ].join("\n"),
      `*ITENS DO PEDIDO*\n\n${itemsList}`,
      [
        "*RESUMO*",
        `Subtotal: ${money(totalPrice)}`,
        `Taxa de entrega: ${money(deliveryFee)}`,
        `*Total: ${money(finalTotal)}*`,
      ].join("\n"),
      [
        "*PAGAMENTO*",
        formData.paymentMethod,
        ...(paymentKind(formData.paymentMethod) === "cash" && formData.change.trim()
          ? [`Troco para: R$ ${formData.change.trim()}`]
          : []),
      ].join("\n"),
    ].join("\n\n")

    const encoded = encodeURIComponent(message)
    const url = `https://wa.me/${store.whatsapp}?text=${encoded}`
    setWhatsappUrl(url)
    setStep("confirmation")
  }

  function openWhatsApp() {
    if (whatsappUrl) {
      window.open(whatsappUrl, "_blank", "noopener,noreferrer")
    }
  }

  function handleClose() {
    if (submitting) return
    if (step === "confirmation") {
      clearCart()
    }
    setStep("info")
    setWhatsappUrl(null)
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
            className={`fixed inset-0 z-50 bg-black/60 backdrop-blur-sm ${submitting ? "pointer-events-none" : ""}`}
            aria-hidden
          />

          <div ref={viewportRef} className="checkout-viewport">
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 20 }}
            transition={{ type: "spring", damping: 25, stiffness: 300 }}
            className="checkout-panel"
            role="dialog"
            aria-modal="true"
            aria-labelledby="checkout-title"
          >
            {/* Header */}
            <div className="flex shrink-0 items-center justify-between p-4 border-b border-border sticky top-0 bg-background z-10">
              <div className="flex items-center gap-2">
                {step === "payment" && (
                  <button onClick={() => setStep("info")} className="p-1 rounded hover:bg-secondary transition-colors">
                    <ArrowLeft className="h-4 w-4" />
                  </button>
                )}
                <h2 id="checkout-title" className="font-display text-lg font-bold">
                  {step === "info" && "Dados da Entrega"}
                  {step === "payment" && "Pagamento"}
                  {step === "confirmation" && "Pedido Enviado"}
                </h2>
              </div>
              <button onClick={handleClose} disabled={submitting} className="p-2 rounded-lg hover:bg-secondary transition-colors disabled:opacity-50 disabled:pointer-events-none" aria-label="Fechar">
                <X className="h-5 w-5" />
              </button>
            </div>

            {/* Steps indicator */}
            <div className="shrink-0 px-4 pt-4">
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
                    <label htmlFor="checkout-name" className="text-sm text-muted-foreground mb-1.5 block">Nome completo *</label>
                    <input
                      id="checkout-name"
                      name="name"
                      autoComplete="name"
                      type="text"
                      required
                      value={formData.name}
                      onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                      className="w-full rounded-lg border border-border bg-card min-h-11 px-3 py-2.5 text-base text-foreground focus:outline-none focus:ring-2 focus:ring-primary/50"
                      placeholder="Seu nome"
                    />
                  </div>
                  <div>
                    <label htmlFor="checkout-phone" className="text-sm text-muted-foreground mb-1.5 block">Telefone *</label>
                    <input
                      id="checkout-phone"
                      name="phone"
                      autoComplete="tel"
                      type="tel"
                      required
                      value={formData.phone}
                      onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                      className="w-full rounded-lg border border-border bg-card min-h-11 px-3 py-2.5 text-base text-foreground focus:outline-none focus:ring-2 focus:ring-primary/50"
                      placeholder="(84) 9 9999-9999"
                    />
                  </div>
                  <div>
                    <label htmlFor="checkout-address" className="text-sm text-muted-foreground mb-1.5 block">Endereço *</label>
                    <input
                      id="checkout-address"
                      name="address"
                      autoComplete="street-address"
                      type="text"
                      required
                      value={formData.address}
                      onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                      className="w-full rounded-lg border border-border bg-card min-h-11 px-3 py-2.5 text-base text-foreground focus:outline-none focus:ring-2 focus:ring-primary/50"
                      placeholder="Rua, número"
                    />
                  </div>
                  <div>
                    <label htmlFor="checkout-neighborhood" className="text-sm text-muted-foreground mb-1.5 block">Bairro *</label>
                    <select
                      id="checkout-neighborhood"
                      name="neighborhood"
                      required
                      value={formData.neighborhood}
                      onChange={(e) => setFormData({ ...formData, neighborhood: e.target.value })}
                      className="w-full rounded-lg border border-border bg-card min-h-11 px-3 py-2.5 text-base text-foreground focus:outline-none focus:ring-2 focus:ring-primary/50"
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
                    <label htmlFor="checkout-complement" className="text-sm text-muted-foreground mb-1.5 block">Complemento</label>
                    <input
                      id="checkout-complement"
                      name="complement"
                      type="text"
                      value={formData.complement}
                      onChange={(e) => setFormData({ ...formData, complement: e.target.value })}
                      className="w-full rounded-lg border border-border bg-card min-h-11 px-3 py-2.5 text-base text-foreground focus:outline-none focus:ring-2 focus:ring-primary/50"
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
                        {paymentIcons[paymentKind(method)] || <CreditCard className="h-5 w-5" />}
                        <span className="text-xs font-medium">{method}</span>
                      </button>
                    ))}
                  </div>

                  {/* PIX info */}
                  {paymentKind(formData.paymentMethod) === "pix" && (
                    <motion.div
                      initial={{ opacity: 0, height: 0 }}
                      animate={{ opacity: 1, height: "auto" }}
                      className="rounded-xl border border-primary/20 bg-primary/5 p-4"
                    >
                      <p className="text-xs text-muted-foreground mb-2">Chave Pix da loja:</p>
                      <div className="flex items-center gap-2">
                        <code className="min-w-0 flex-1 break-all rounded-lg bg-card px-3 py-2 text-sm font-mono">
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
                  {paymentKind(formData.paymentMethod) === "cash" && (
                    <motion.div
                      initial={{ opacity: 0, height: 0 }}
                      animate={{ opacity: 1, height: "auto" }}
                    >
                      <label htmlFor="checkout-change" className="text-sm text-muted-foreground mb-1.5 block">Troco para quanto?</label>
                      <input
                        id="checkout-change"
                        inputMode="decimal"
                        type="text"
                        value={formData.change}
                        onChange={(e) => setFormData({ ...formData, change: e.target.value })}
                        className="w-full rounded-lg border border-border bg-card min-h-11 px-3 py-2.5 text-base text-foreground focus:outline-none focus:ring-2 focus:ring-primary/50"
                        placeholder="Ex: 50,00"
                      />
                    </motion.div>
                  )}

                  {/* Summary */}
                  <div className="rounded-xl border border-border bg-card p-4 flex flex-col gap-2 text-sm">
                    <div className="flex justify-between gap-3">
                      <span className="text-muted-foreground">Subtotal · {totalItems} {totalItems === 1 ? "item" : "itens"}</span>
                      <span className="shrink-0">R$ {totalPrice.toFixed(2).replace(".", ",")}</span>
                    </div>
                    <div className="flex justify-between gap-3">
                      <div className="min-w-0 text-muted-foreground">
                        <span>Entrega</span>
                        <p className="mt-0.5 break-words text-xs">{formData.neighborhood}</p>
                      </div>
                      <span className="shrink-0">R$ {deliveryFee.toFixed(2).replace(".", ",")}</span>
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
                    <h3 className="font-display text-xl font-bold">Pedido salvo!</h3>
                    <p className="text-sm text-muted-foreground mt-2 max-w-xs">
                      Clique no botão abaixo para abrir o WhatsApp e enviar o pedido ao restaurante.
                    </p>
                  </div>
                  {whatsappUrl && (
                    <div className="flex flex-col gap-3 w-full max-w-xs">
                      <button
                        onClick={openWhatsApp}
                        type="button"
                        className="w-full rounded-xl bg-[#25D366] py-3 text-sm font-bold text-white hover:bg-[#20BD5A] transition-colors flex items-center justify-center gap-2"
                      >
                        <Smartphone className="h-4 w-4" />
                        Abrir WhatsApp e enviar pedido
                      </button>
                      <a
                        href={whatsappUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-xs text-muted-foreground underline hover:text-foreground"
                      >
                        Se o botão não abrir, clique aqui
                      </a>
                    </div>
                  )}
                  <button
                    onClick={handleClose}
                    type="button"
                    className="rounded-xl border border-border bg-card px-6 py-3 text-sm font-bold hover:bg-secondary transition-colors"
                  >
                    Fechar
                  </button>
                </motion.div>
              )}
            </div>
          </motion.div>
          </div>
        </>
      )}
    </AnimatePresence>
  )
}
