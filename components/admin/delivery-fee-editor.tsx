"use client"

import { useRef, useState, type FormEvent } from "react"
import { CircleAlert, Gift, Loader2, MapPin, Save, Truck } from "lucide-react"
import { Dialog, DialogContent, DialogDescription, DialogTitle } from "@/components/ui/dialog"
import {
  AlertDialog,
  AlertDialogContent,
  AlertDialogTitle,
  AlertDialogDescription,
  AlertDialogCancel,
} from "@/components/ui/alert-dialog"
import {
  deliveryFeeSchema,
  deliveryMoney,
  normalizeNeighborhood,
  parseDeliveryFee,
  type DeliveryFeeData,
} from "@/lib/delivery-fees"

export function DeliveryFeeEditor({
  fee,
  fees,
  onSave,
  onClose,
  onReturnFocus,
}: {
  fee: DeliveryFeeData | null
  fees: DeliveryFeeData[]
  onSave: (data: DeliveryFeeData) => Promise<void>
  onClose: () => void
  onReturnFocus: () => void
}) {
  const [initial] = useState(() => ({
    neighborhood: fee?.neighborhood ?? "",
    fee: fee ? fee.fee.toFixed(2).replace(".", ",") : "",
  }))
  const [draft, setDraft] = useState(initial)
  const [errors, setErrors] = useState<{ neighborhood?: string; fee?: string }>({})
  const [error, setError] = useState("")
  const [saving, setSaving] = useState(false)
  const [discard, setDiscard] = useState(false)
  const lock = useRef(false)
  const title = useRef<HTMLHeadingElement>(null)
  const nameInput = useRef<HTMLInputElement>(null)
  const feeInput = useRef<HTMLInputElement>(null)
  const amount = parseDeliveryFee(draft.fee)
  const dirty = draft.neighborhood !== initial.neighborhood || draft.fee !== initial.fee
  function requestClose() {
    if (lock.current) return
    if (dirty) setDiscard(true)
    else onClose()
  }
  async function submit(event: FormEvent) {
    event.preventDefault()
    if (lock.current) return
    setError("")
    const next: typeof errors = {}
    const result = deliveryFeeSchema.safeParse({ neighborhood: draft.neighborhood, fee: amount })
    if (!result.success)
      for (const issue of result.error.issues) {
        const key = issue.path[0] as keyof typeof errors
        if (!next[key]) next[key] = issue.message
      }
    if (amount === null) next.fee = "Informe um valor de 0 a 100.000, com até duas casas decimais."
    if (
      result.success &&
      fees.some(
        (entry) =>
          entry.neighborhood !== fee?.neighborhood &&
          normalizeNeighborhood(entry.neighborhood) === normalizeNeighborhood(result.data.neighborhood),
      )
    )
      next.neighborhood = "Já existe um bairro com esse nome."
    setErrors(next)
    if (Object.keys(next).length || !result.success) {
      ;(next.neighborhood ? nameInput : feeInput).current?.focus()
      return
    }
    lock.current = true
    setSaving(true)
    try {
      await onSave(result.data)
    } catch (cause) {
      setError(
        cause instanceof Error ? cause.message : "Não foi possível salvar. Suas alterações continuam aqui.",
      )
    } finally {
      lock.current = false
      setSaving(false)
    }
  }
  return (
    <>
      <Dialog
        open
        onOpenChange={(open) => {
          if (!open) requestClose()
        }}
      >
        <DialogContent
          closeLabel="Fechar editor de taxa"
          className={`admin-menu-dialog menu-editor-dialog inset-x-0 bottom-0 left-0 top-auto flex max-h-[94dvh] w-full max-w-none translate-x-0 translate-y-0 flex-col gap-0 overflow-hidden rounded-t-2xl bg-card p-0 sm:bottom-auto sm:left-1/2 sm:top-1/2 sm:max-h-[90dvh] sm:w-[calc(100%-3rem)] sm:max-w-xl sm:-translate-x-1/2 sm:-translate-y-1/2 sm:rounded-2xl ${saving ? "[&>button:last-child]:pointer-events-none [&>button:last-child]:opacity-30" : ""}`}
          onOpenAutoFocus={(event) => {
            event.preventDefault()
            title.current?.focus()
          }}
          onCloseAutoFocus={(event) => {
            event.preventDefault()
            onReturnFocus()
          }}
          onPointerDownOutside={(event) => event.preventDefault()}
          onEscapeKeyDown={(event) => {
            if (lock.current) event.preventDefault()
          }}
        >
          <header className="shrink-0 border-b border-border px-5 py-5 pr-16 sm:px-6 sm:pr-16">
            <p className="mb-2 text-[10px] font-semibold uppercase tracking-[0.18em] text-primary">
              Área de entrega
            </p>
            <DialogTitle
              ref={title}
              tabIndex={-1}
              className="font-display text-xl font-bold outline-none sm:text-2xl"
            >
              {fee ? "Editar bairro" : "Novo bairro"}
            </DialogTitle>
            <DialogDescription className="mt-2 text-xs leading-relaxed">
              Defina o bairro atendido e o valor cobrado pela entrega.
            </DialogDescription>
          </header>
          <form onSubmit={submit} noValidate className="flex min-h-0 flex-1 flex-col">
            <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain p-5 sm:p-6">
              <fieldset disabled={saving} className="min-w-0 space-y-6">
                <div>
                  <label htmlFor="delivery-neighborhood" className="text-sm font-medium">
                    Nome do bairro <span className="text-primary">*</span>
                  </label>
                  <input
                    ref={nameInput}
                    id="delivery-neighborhood"
                    value={draft.neighborhood}
                    maxLength={120}
                    aria-required="true"
                    aria-invalid={!!errors.neighborhood}
                    aria-describedby={`delivery-name-help${errors.neighborhood ? " delivery-name-error" : ""}`}
                    placeholder="Ex.: Centro, Jardim América"
                    onChange={(event) => {
                      setDraft({ ...draft, neighborhood: event.target.value })
                      setErrors({ ...errors, neighborhood: undefined })
                      setError("")
                    }}
                    className="mt-2 min-h-12 w-full min-w-0 rounded-xl border border-border bg-background px-3 text-base placeholder:text-muted-foreground sm:text-sm"
                  />
                  <p id="delivery-name-help" className="mt-2 text-xs text-muted-foreground">
                    Use o nome que seus clientes reconhecem no checkout.
                  </p>
                  {errors.neighborhood && (
                    <p id="delivery-name-error" role="alert" className="mt-2 text-xs text-red-300">
                      {errors.neighborhood}
                    </p>
                  )}
                </div>
                <div>
                  <label htmlFor="delivery-fee" className="text-sm font-medium">
                    Taxa de entrega <span className="text-primary">*</span>
                  </label>
                  <div className="relative mt-2">
                    <span
                      aria-hidden="true"
                      className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-sm text-muted-foreground"
                    >
                      R$
                    </span>
                    <input
                      ref={feeInput}
                      id="delivery-fee"
                      inputMode="decimal"
                      value={draft.fee}
                      maxLength={12}
                      aria-required="true"
                      aria-invalid={!!errors.fee}
                      aria-describedby={`delivery-fee-help${errors.fee ? " delivery-fee-error" : ""}`}
                      placeholder="0,00"
                      onChange={(event) => {
                        setDraft({ ...draft, fee: event.target.value })
                        setErrors({ ...errors, fee: undefined })
                        setError("")
                      }}
                      className="min-h-12 w-full min-w-0 rounded-xl border border-border bg-background pl-10 pr-3 text-base tabular-nums placeholder:text-muted-foreground sm:text-sm"
                    />
                  </div>
                  <div className="mt-2 flex flex-wrap items-center justify-between gap-2">
                    <p id="delivery-fee-help" className="text-xs text-muted-foreground">
                      Digite 0,00 para oferecer entrega grátis.
                    </p>
                    <button
                      type="button"
                      onClick={() => {
                        setDraft({ ...draft, fee: "0,00" })
                        setErrors({ ...errors, fee: undefined })
                        setError("")
                      }}
                      className="orders-button flex min-h-11 items-center gap-2 rounded-lg px-3 text-xs font-medium text-emerald-300"
                    >
                      <Gift aria-hidden="true" className="h-4 w-4" />
                      Entrega grátis
                    </button>
                  </div>
                  {errors.fee && (
                    <p id="delivery-fee-error" role="alert" className="mt-2 text-xs text-red-300">
                      {errors.fee}
                    </p>
                  )}
                </div>
                <section
                  aria-label="Prévia da taxa no checkout"
                  className="rounded-xl border border-border bg-background p-4"
                >
                  <p className="text-[10px] font-semibold uppercase tracking-[0.15em] text-muted-foreground">
                    Prévia no checkout
                  </p>
                  <div className="mt-4 flex min-w-0 items-start justify-between gap-3">
                    <div className="flex min-w-0 items-center gap-2">
                      <MapPin aria-hidden="true" className="h-4 w-4 shrink-0 text-primary" />
                      <span className="break-words text-sm font-medium">
                        {draft.neighborhood.trim() || "Nome do bairro"}
                      </span>
                    </div>
                    <span
                      className={`shrink-0 text-sm font-semibold tabular-nums ${amount === 0 ? "text-emerald-300" : "text-primary"}`}
                    >
                      {amount === null ? "—" : amount === 0 ? "Grátis" : deliveryMoney(amount)}
                    </span>
                  </div>
                  <p className="mt-3 flex items-start gap-2 text-xs leading-relaxed text-muted-foreground">
                    <Truck aria-hidden="true" className="h-4 w-4 shrink-0" />
                    {fee
                      ? "As mudanças valem para os próximos pedidos."
                      : "O bairro ficará disponível após salvar."}
                  </p>
                </section>
                {error && (
                  <div
                    role="alert"
                    className="flex items-start gap-2 rounded-xl border border-red-400/20 bg-red-400/10 p-3 text-sm text-red-300"
                  >
                    <CircleAlert aria-hidden="true" className="mt-0.5 h-4 w-4 shrink-0" />
                    {error}
                  </div>
                )}
              </fieldset>
            </div>
            <footer className="grid shrink-0 grid-cols-2 gap-3 border-t border-border p-5 pb-[max(1.25rem,env(safe-area-inset-bottom))] sm:px-6">
              <button
                type="button"
                disabled={saving}
                onClick={requestClose}
                className="orders-button min-h-11 rounded-xl border border-border text-sm font-semibold disabled:opacity-40"
              >
                Cancelar
              </button>
              <button
                type="submit"
                disabled={saving || (!!fee && !dirty)}
                className="flex min-h-11 items-center justify-center gap-2 rounded-xl bg-primary px-2 text-sm font-semibold text-primary-foreground hover:bg-primary/90 disabled:opacity-40"
              >
                {saving ? (
                  <Loader2 aria-hidden="true" className="h-4 w-4 animate-spin" />
                ) : (
                  <Save aria-hidden="true" className="h-4 w-4" />
                )}
                {saving ? "Salvando…" : "Salvar bairro"}
              </button>
            </footer>
          </form>
        </DialogContent>
      </Dialog>
      <AlertDialog open={discard} onOpenChange={setDiscard}>
        <AlertDialogContent className="admin-menu-dialog max-h-[90dvh] w-[calc(100%-2rem)] overflow-y-auto rounded-2xl bg-card p-5 sm:p-6">
          <AlertDialogTitle>Descartar alterações?</AlertDialogTitle>
          <AlertDialogDescription>As mudanças deste bairro ainda não foram salvas.</AlertDialogDescription>
          <div className="grid grid-cols-2 gap-3">
            <AlertDialogCancel className="m-0 min-h-11 rounded-xl border-border bg-transparent text-xs">
              Continuar editando
            </AlertDialogCancel>
            <button
              onClick={() => {
                setDiscard(false)
                onClose()
              }}
              className="min-h-11 rounded-xl bg-destructive px-2 text-xs font-semibold text-destructive-foreground"
            >
              Descartar alterações
            </button>
          </div>
        </AlertDialogContent>
      </AlertDialog>
    </>
  )
}
