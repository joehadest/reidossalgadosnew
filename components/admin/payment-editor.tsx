"use client"

import { useRef, useState, type FormEvent } from "react"
import { CircleAlert, Eye, EyeOff, Loader2, Save, ShieldCheck } from "lucide-react"
import { Dialog, DialogContent, DialogDescription, DialogTitle } from "@/components/ui/dialog"
import {
  AlertDialog,
  AlertDialogContent,
  AlertDialogTitle,
  AlertDialogDescription,
  AlertDialogCancel,
} from "@/components/ui/alert-dialog"
import {
  acceptsPix,
  paymentDescription,
  paymentIdentity,
  paymentKind,
  paymentMethodSchema,
  paymentPresets,
  pixKeySchema,
} from "@/lib/payment-methods"

export function PaymentEditor({
  mode,
  method,
  methods,
  pixKey,
  onSave,
  onClose,
  onReturnFocus,
}: {
  mode: "method" | "pix"
  method: string | null
  methods: string[]
  pixKey: string
  onSave: (name: string, key?: string) => Promise<void>
  onClose: () => void
  onReturnFocus: () => void
}) {
  const [initial] = useState(() => ({ name: method ?? "", key: mode === "pix" ? pixKey : "" }))
  const [draft, setDraft] = useState(initial)
  const [showKey, setShowKey] = useState(false)
  const [errors, setErrors] = useState<{ name?: string; key?: string }>({})
  const [error, setError] = useState("")
  const [saving, setSaving] = useState(false)
  const [discard, setDiscard] = useState(false)
  const lock = useRef(false)
  const title = useRef<HTMLHeadingElement>(null)
  const nameInput = useRef<HTMLInputElement>(null)
  const keyInput = useRef<HTMLInputElement>(null)
  const errorBox = useRef<HTMLDivElement>(null)
  const dirty = draft.name !== initial.name || draft.key !== initial.key
  const needsKey = mode === "pix" || (paymentKind(draft.name) === "pix" && !pixKey.trim())
  const requiredKey = mode === "method" ? needsKey : acceptsPix(methods)
  const suggestions = paymentPresets.filter(
    (preset) => !methods.some((name) => paymentIdentity(name) === paymentIdentity(preset)),
  )
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
    const name = paymentMethodSchema.safeParse(draft.name)
    const key = pixKeySchema.safeParse(draft.key)
    if (mode === "method") {
      if (!name.success) next.name = name.error.issues[0].message
      else if (
        methods.some((entry) => entry !== method && paymentIdentity(entry) === paymentIdentity(name.data))
      )
        next.name = "Já existe uma forma de pagamento com esse nome."
    }
    if (needsKey) {
      if (!key.success) next.key = key.error.issues[0].message
      else if (requiredKey && !key.data) next.key = "Informe a chave Pix para oferecer esse pagamento."
    }
    setErrors(next)
    if (Object.keys(next).length) {
      ;(next.name ? nameInput : keyInput).current?.focus()
      return
    }
    lock.current = true
    setSaving(true)
    try {
      await onSave(name.success ? name.data : "", needsKey && key.success ? key.data : undefined)
    } catch (cause) {
      setError(
        cause instanceof Error ? cause.message : "Não foi possível salvar. Suas alterações continuam aqui.",
      )
      requestAnimationFrame(() => errorBox.current?.focus())
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
          closeLabel="Fechar editor de pagamento"
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
              Configuração de pagamentos
            </p>
            <DialogTitle
              ref={title}
              tabIndex={-1}
              className="font-display text-xl font-bold outline-none sm:text-2xl"
            >
              {mode === "pix"
                ? "Chave Pix da loja"
                : method
                  ? "Editar forma de pagamento"
                  : "Nova forma de pagamento"}
            </DialogTitle>
            <DialogDescription className="mt-2 text-xs leading-relaxed">
              {mode === "pix"
                ? "Esta chave será exibida aos clientes que escolherem Pix no checkout."
                : "Defina como esta opção aparece no fechamento do pedido."}
            </DialogDescription>
          </header>
          <form onSubmit={submit} noValidate className="flex min-h-0 flex-1 flex-col">
            <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain p-5 sm:p-6">
              <fieldset disabled={saving} className="min-w-0 space-y-6">
                {mode === "method" && (
                  <>
                    {!method && suggestions.length > 0 && (
                      <div>
                        <p className="mb-3 text-xs font-medium text-muted-foreground">
                          Escolha uma sugestão ou personalize abaixo
                        </p>
                        <div className="flex flex-wrap gap-2">
                          {suggestions.map((preset) => (
                            <button
                              type="button"
                              key={preset}
                              aria-pressed={paymentIdentity(draft.name) === paymentIdentity(preset)}
                              onClick={() => {
                                setDraft({ ...draft, name: preset })
                                setErrors({ ...errors, name: undefined })
                                setError("")
                              }}
                              className={`min-h-11 rounded-xl border px-3 text-xs font-medium transition-colors ${paymentIdentity(draft.name) === paymentIdentity(preset) ? "border-primary/40 bg-primary/10 text-primary" : "border-border hover:bg-secondary"}`}
                            >
                              {preset}
                            </button>
                          ))}
                        </div>
                      </div>
                    )}
                    <div>
                      <label htmlFor="payment-name" className="text-sm font-medium">
                        Nome da forma de pagamento <span className="text-primary">*</span>
                      </label>
                      <input
                        ref={nameInput}
                        id="payment-name"
                        value={draft.name}
                        maxLength={60}
                        aria-required="true"
                        aria-invalid={!!errors.name}
                        aria-describedby={`payment-name-help${errors.name ? " payment-name-error" : ""}`}
                        placeholder="Ex.: Vale-refeição"
                        onChange={(event) => {
                          setDraft({ ...draft, name: event.target.value })
                          setErrors({ ...errors, name: undefined })
                          setError("")
                        }}
                        className="mt-2 min-h-12 w-full min-w-0 rounded-xl border border-border bg-background px-3 text-base sm:text-sm"
                      />
                      <p id="payment-name-help" className="mt-2 text-xs text-muted-foreground">
                        Use um nome curto e fácil de reconhecer.
                      </p>
                      {errors.name && (
                        <p id="payment-name-error" role="alert" className="mt-2 text-xs text-red-300">
                          {errors.name}
                        </p>
                      )}
                    </div>
                  </>
                )}
                {needsKey && (
                  <div>
                    <label htmlFor="payment-pix-key" className="text-sm font-medium">
                      Chave Pix {requiredKey && <span className="text-primary">*</span>}
                    </label>
                    <div className="relative mt-2">
                      <input
                        ref={keyInput}
                        id="payment-pix-key"
                        type={showKey ? "text" : "password"}
                        value={draft.key}
                        autoComplete="off"
                        autoCapitalize="none"
                        spellCheck={false}
                        maxLength={140}
                        aria-required={requiredKey}
                        aria-invalid={!!errors.key}
                        aria-describedby={`payment-key-help${errors.key ? " payment-key-error" : ""}`}
                        placeholder="Informe a chave cadastrada no banco"
                        onChange={(event) => {
                          setDraft({ ...draft, key: event.target.value })
                          setErrors({ ...errors, key: undefined })
                          setError("")
                        }}
                        className="min-h-12 w-full min-w-0 rounded-xl border border-border bg-background pl-3 pr-14 text-base sm:text-sm"
                      />
                      <button
                        type="button"
                        aria-label={showKey ? "Ocultar chave Pix" : "Mostrar chave Pix"}
                        aria-pressed={showKey}
                        onClick={() => setShowKey(!showKey)}
                        className="orders-button absolute right-1 top-1/2 flex h-11 w-11 -translate-y-1/2 items-center justify-center rounded-lg text-muted-foreground"
                      >
                        {showKey ? (
                          <EyeOff aria-hidden="true" className="h-4 w-4" />
                        ) : (
                          <Eye aria-hidden="true" className="h-4 w-4" />
                        )}
                      </button>
                    </div>
                    <p id="payment-key-help" className="mt-2 text-xs leading-relaxed text-muted-foreground">
                      CPF, CNPJ, e-mail, telefone ou chave aleatória. Copie exatamente como está no banco.
                      {!requiredKey && " Você pode deixar em branco enquanto o Pix não estiver disponível."}
                    </p>
                    {errors.key && (
                      <p id="payment-key-error" role="alert" className="mt-2 text-xs text-red-300">
                        {errors.key}
                      </p>
                    )}
                  </div>
                )}
                {mode === "method" && paymentKind(draft.name) === "pix" && !needsKey && (
                  <p className="flex items-start gap-2 rounded-xl border border-emerald-400/20 bg-emerald-400/5 p-4 text-xs leading-relaxed text-emerald-300">
                    <ShieldCheck aria-hidden="true" className="h-4 w-4 shrink-0" />A chave Pix já está
                    cadastrada. Esta opção usará a configuração atual da loja.
                  </p>
                )}
                <section
                  aria-label="Prévia da configuração de pagamento"
                  className="rounded-xl border border-border bg-background p-4"
                >
                  <p className="text-[10px] font-semibold uppercase tracking-[0.15em] text-muted-foreground">
                    {mode === "pix" ? "Antes de salvar" : "Prévia no checkout"}
                  </p>
                  {mode === "method" && (
                    <p className="mt-3 break-words text-sm font-semibold">
                      {draft.name.trim() || "Nome da forma de pagamento"}
                    </p>
                  )}
                  <p className="mt-2 text-xs leading-relaxed text-muted-foreground">
                    {mode === "pix"
                      ? "Confira se a chave pertence à conta correta. A confirmação do pagamento continua sendo feita pela loja."
                      : paymentDescription(draft.name)}
                  </p>
                </section>
                {error && (
                  <div
                    ref={errorBox}
                    tabIndex={-1}
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
                disabled={saving || ((mode === "pix" || !!method) && !dirty)}
                className="flex min-h-11 items-center justify-center gap-2 rounded-xl bg-primary px-2 text-xs font-semibold text-primary-foreground hover:bg-primary/90 disabled:opacity-40 sm:text-sm"
              >
                {saving ? (
                  <Loader2 aria-hidden="true" className="h-4 w-4 animate-spin" />
                ) : (
                  <Save aria-hidden="true" className="h-4 w-4" />
                )}
                {saving ? "Salvando…" : mode === "pix" ? "Salvar chave" : "Salvar forma"}
              </button>
            </footer>
          </form>
        </DialogContent>
      </Dialog>
      <AlertDialog open={discard} onOpenChange={setDiscard}>
        <AlertDialogContent
          className="admin-menu-dialog max-h-[90dvh] w-[calc(100%-2rem)] overflow-y-auto rounded-2xl bg-card p-5 sm:p-6"
          onCloseAutoFocus={(event) => {
            event.preventDefault()
            const input = mode === "pix" ? keyInput.current : nameInput.current
            if (input?.isConnected) input.focus()
            else onReturnFocus()
          }}
        >
          <AlertDialogTitle>Descartar alterações?</AlertDialogTitle>
          <AlertDialogDescription>As mudanças deste pagamento ainda não foram salvas.</AlertDialogDescription>
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
