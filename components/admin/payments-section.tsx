"use client"

import { useRef, useState, type MouseEvent } from "react"
import {
  ArrowUpRight,
  Banknote,
  Check,
  CircleAlert,
  CreditCard,
  Info,
  KeyRound,
  Loader2,
  Pencil,
  Plus,
  QrCode,
  Search,
  ShieldCheck,
  Smartphone,
  Trash2,
  Wallet,
  X,
} from "lucide-react"
import { toast } from "sonner"
import { useAdmin } from "@/lib/admin-context"
import {
  acceptsPix,
  normalizePaymentName,
  paymentDescription,
  paymentKind,
  type PaymentKind,
} from "@/lib/payment-methods"
import {
  AlertDialog,
  AlertDialogContent,
  AlertDialogTitle,
  AlertDialogDescription,
  AlertDialogCancel,
} from "@/components/ui/alert-dialog"
import { PaymentEditor } from "./payment-editor"

const primary =
  "flex min-h-11 items-center justify-center gap-2 rounded-xl bg-primary px-4 text-sm font-semibold text-primary-foreground transition-colors hover:bg-primary/90 disabled:opacity-40"
const control =
  "orders-button flex min-h-11 items-center justify-center gap-2 rounded-xl border border-border px-3 text-xs font-semibold"
const kinds: Record<PaymentKind, { Icon: typeof CreditCard; tone: string; label: string }> = {
  pix: { Icon: QrCode, tone: "bg-emerald-400/10 text-emerald-300", label: "Transferência" },
  cash: { Icon: Banknote, tone: "bg-primary/10 text-primary", label: "Em espécie" },
  credit: { Icon: CreditCard, tone: "bg-sky-400/10 text-sky-300", label: "Crédito" },
  debit: { Icon: CreditCard, tone: "bg-violet-400/10 text-violet-300", label: "Débito" },
  card: { Icon: CreditCard, tone: "bg-sky-400/10 text-sky-300", label: "Cartão" },
  other: { Icon: Wallet, tone: "bg-orange-400/10 text-orange-300", label: "Personalizado" },
}
type Editor = { mode: "method" | "pix"; method: string | null; pixKey: string }

export function PaymentsSection() {
  const { store, addPaymentMethod, updatePaymentMethod, deletePaymentMethod, updatePixKey } = useAdmin()
  const methods = store.paymentMethods
  const [query, setQuery] = useState("")
  const [editor, setEditor] = useState<Editor | null>(null)
  const [deleting, setDeleting] = useState<string | null>(null)
  const [deleteBusy, setDeleteBusy] = useState(false)
  const [deleteError, setDeleteError] = useState("")
  const [previewMethod, setPreviewMethod] = useState("")
  const heading = useRef<HTMLHeadingElement>(null)
  const search = useRef<HTMLInputElement>(null)
  const returnTarget = useRef<HTMLElement | null>(null)
  const deleteLock = useRef(false)
  const pix = acceptsPix(methods)
  const keyReady = !!store.pixKey.trim()
  const cardCount = methods.filter((name) => ["credit", "debit", "card"].includes(paymentKind(name))).length
  const otherCount = methods.filter((name) => ["cash", "other"].includes(paymentKind(name))).length
  const visible = methods.filter((name) =>
    normalizePaymentName(query)
      .split(" ")
      .every((part) => normalizePaymentName(name).includes(part)),
  )
  const preview = methods.includes(previewMethod) ? previewMethod : (methods[0] ?? "")
  const stats = [
    {
      label: "Formas disponíveis",
      value: String(methods.length).padStart(2, "0"),
      help: "Opções no checkout",
      Icon: Wallet,
      tone: "bg-primary/10 text-primary",
    },
    {
      label: "Pagamento Pix",
      value: pix ? (keyReady ? "Pronto" : "Pendente") : "Inativo",
      help: pix ? (keyReady ? "Chave cadastrada" : "Cadastre a chave da loja") : "Adicione Pix para oferecer",
      Icon: QrCode,
      tone: kinds.pix.tone,
    },
    {
      label: "Cartões",
      value: String(cardCount).padStart(2, "0"),
      help: "Crédito, débito e cartão",
      Icon: CreditCard,
      tone: kinds.credit.tone,
    },
    {
      label: "Outras opções",
      value: String(otherCount).padStart(2, "0"),
      help: "Dinheiro e personalizadas",
      Icon: Banknote,
      tone: kinds.debit.tone,
    },
  ]
  function remember(event: MouseEvent<HTMLButtonElement>) {
    returnTarget.current = event.currentTarget
  }
  function returnFocus() {
    const target = returnTarget.current
    ;(target?.isConnected && !target.hasAttribute("disabled") && target.getClientRects().length
      ? target
      : heading.current
    )?.focus()
  }
  function openEditor(
    event: MouseEvent<HTMLButtonElement>,
    mode: Editor["mode"],
    method: string | null = null,
  ) {
    remember(event)
    setEditor({ mode, method, pixKey: store.pixKey })
  }
  async function save(name: string, key?: string) {
    if (!editor) return
    if (editor.mode === "pix") await updatePixKey(key ?? "", editor.pixKey)
    else if (editor.method)
      await updatePaymentMethod(editor.method, name, key, key === undefined ? undefined : editor.pixKey)
    else await addPaymentMethod(name, key, key === undefined ? undefined : editor.pixKey)
    toast.success(editor.mode === "pix" ? "Chave Pix atualizada." : "Forma de pagamento salva.")
    setEditor(null)
  }
  async function confirmDelete() {
    if (!deleting || deleteLock.current) return
    deleteLock.current = true
    setDeleteBusy(true)
    setDeleteError("")
    try {
      await deletePaymentMethod(deleting)
      setDeleting(null)
      toast.success("Forma de pagamento removida.")
    } catch (cause) {
      setDeleteError(cause instanceof Error ? cause.message : "Não foi possível remover. Tente novamente.")
    } finally {
      deleteLock.current = false
      setDeleteBusy(false)
    }
  }
  return (
    <div className="payments-section flex min-w-0 flex-col gap-6">
      <header className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <p className="mb-2 text-[10px] font-semibold uppercase tracking-[0.18em] text-primary">
            Do pedido ao pagamento
          </p>
          <h1
            ref={heading}
            tabIndex={-1}
            className="font-display text-3xl font-bold tracking-tight outline-none sm:text-4xl"
          >
            Pagamentos<span className="text-primary">.</span>
          </h1>
          <p className="mt-2 max-w-xl text-sm leading-relaxed text-muted-foreground">
            Organize as formas de pagamento e deixe a escolha mais simples para seus clientes.
          </p>
        </div>
        <button
          disabled={methods.length >= 30}
          onClick={(event) => openEditor(event, "method")}
          className={`${primary} shrink-0`}
        >
          <Plus aria-hidden="true" className="h-4 w-4" />
          Nova forma
        </button>
      </header>
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4 sm:gap-4">
        {stats.map(({ label, value, help, Icon, tone }) => (
          <article
            key={label}
            className="dashboard-panel min-w-0 rounded-2xl border border-border bg-card p-4 sm:p-5"
          >
            <div className="mb-4 flex items-start justify-between gap-2">
              <p className="text-xs font-medium leading-relaxed text-muted-foreground">{label}</p>
              <span className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-lg ${tone}`}>
                <Icon aria-hidden="true" className="h-4 w-4" />
              </span>
            </div>
            <p className="font-display text-2xl font-bold tabular-nums sm:text-[30px]">{value}</p>
            <p className="mt-1 text-[11px] leading-relaxed text-muted-foreground">{help}</p>
          </article>
        ))}
      </div>
      <div className="grid min-w-0 items-start gap-6 xl:grid-cols-[minmax(0,1fr)_300px]">
        <section
          className="dashboard-panel min-w-0 overflow-hidden rounded-2xl border border-border bg-card"
          aria-labelledby="payment-list-title"
        >
          <header className="border-b border-border p-5 sm:p-6">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <h2 id="payment-list-title" className="text-base font-semibold">
                  Formas de pagamento
                </h2>
                <p className="mt-1 text-xs text-muted-foreground">
                  Estas opções ficam disponíveis no fechamento do pedido.
                </p>
              </div>
              <span className="rounded-lg border border-border bg-background px-2.5 py-1.5 text-[11px] tabular-nums text-muted-foreground">
                {methods.length} cadastrada{methods.length !== 1 ? "s" : ""}
              </span>
            </div>
            <div className="relative mt-5">
              <Search
                aria-hidden="true"
                className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground"
              />
              <label htmlFor="payment-search" className="sr-only">
                Buscar forma de pagamento
              </label>
              <input
                ref={search}
                id="payment-search"
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                placeholder="Buscar por nome…"
                className="min-h-12 w-full min-w-0 rounded-xl border border-border bg-background pl-10 pr-12 text-base sm:text-sm"
              />
              {query && (
                <button
                  aria-label="Limpar busca"
                  onClick={() => {
                    setQuery("")
                    search.current?.focus()
                  }}
                  className="orders-button absolute right-1 top-1/2 flex h-11 w-11 -translate-y-1/2 items-center justify-center rounded-lg"
                >
                  <X aria-hidden="true" className="h-4 w-4" />
                </button>
              )}
            </div>
          </header>
          <div className="p-5 sm:p-6">
            {visible.length > 0 ? (
              <div className="grid gap-4 md:grid-cols-2">
                {visible.map((method) => {
                  const { Icon, tone, label } = kinds[paymentKind(method)]
                  const pending = paymentKind(method) === "pix" && !keyReady
                  return (
                    <article
                      key={method}
                      className="flex min-w-0 flex-col rounded-2xl border border-border bg-background p-4 sm:p-5"
                    >
                      <div className="flex items-center justify-between gap-3">
                        <span
                          className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-xl ${tone}`}
                        >
                          <Icon aria-hidden="true" className="h-5 w-5" />
                        </span>
                        <span
                          className={`flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[10px] font-medium ${pending ? "bg-orange-400/10 text-orange-300" : "bg-emerald-400/10 text-emerald-300"}`}
                        >
                          {pending ? (
                            <CircleAlert aria-hidden="true" className="h-3 w-3" />
                          ) : (
                            <Check aria-hidden="true" className="h-3 w-3" />
                          )}
                          {pending ? "Configurar chave" : "Disponível"}
                        </span>
                      </div>
                      <p className="mb-2 mt-5 text-[10px] font-semibold uppercase tracking-[0.12em] text-muted-foreground">
                        {label}
                      </p>
                      <h3 className="break-words text-base font-semibold">{method}</h3>
                      <p className="mt-2 flex-1 text-xs leading-relaxed text-muted-foreground">
                        {paymentDescription(method)}
                      </p>
                      <div className="mt-5 flex items-center justify-between gap-3 border-t border-border pt-3">
                        <button
                          aria-label={`Editar ${method}`}
                          onClick={(event) => openEditor(event, "method", method)}
                          className="orders-button -ml-2 flex min-h-11 items-center gap-2 rounded-lg px-2 text-xs font-medium"
                        >
                          <Pencil aria-hidden="true" className="h-3.5 w-3.5" />
                          Editar forma
                        </button>
                        <button
                          aria-label={`Excluir ${method}`}
                          onClick={(event) => {
                            remember(event)
                            setDeleteError("")
                            setDeleting(method)
                          }}
                          className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl text-muted-foreground transition-colors hover:bg-destructive/10 hover:text-red-300"
                        >
                          <Trash2 aria-hidden="true" className="h-4 w-4" />
                        </button>
                      </div>
                    </article>
                  )
                })}
              </div>
            ) : (
              <div className="flex flex-col items-center px-2 py-10 text-center">
                <span className="mb-4 rounded-2xl bg-secondary p-4">
                  <Wallet aria-hidden="true" className="h-7 w-7 text-muted-foreground" />
                </span>
                <h3 className="font-semibold">
                  {methods.length ? "Nenhum resultado encontrado" : "Como seus clientes vão pagar?"}
                </h3>
                <p className="mt-2 max-w-sm text-xs leading-relaxed text-muted-foreground">
                  {methods.length
                    ? "Tente outro nome ou limpe a busca para ver todas as opções."
                    : "Cadastre a primeira forma de pagamento para que os clientes possam finalizar seus pedidos."}
                </p>
                <button
                  onClick={(event) => {
                    if (methods.length) {
                      setQuery("")
                      search.current?.focus()
                    } else openEditor(event, "method")
                  }}
                  className={`${control} mt-5`}
                >
                  {methods.length ? "Limpar busca" : "Adicionar forma"}
                </button>
              </div>
            )}
          </div>
          <footer className="flex flex-wrap items-center justify-between gap-3 border-t border-border px-5 py-4 text-[11px] text-muted-foreground sm:px-6">
            <span role="status" aria-live="polite">
              {visible.length} de {methods.length} forma{methods.length !== 1 ? "s" : ""}
            </span>
            <span>Até 30 opções por loja</span>
          </footer>
        </section>
        <aside className="grid min-w-0 items-start gap-5 md:grid-cols-2 xl:grid-cols-1">
          <section className="dashboard-panel min-w-0 rounded-2xl border border-border bg-card p-5">
            <div className="flex items-center gap-3">
              <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-emerald-400/10 text-emerald-300">
                <QrCode aria-hidden="true" className="h-5 w-5" />
              </span>
              <div>
                <h2 className="text-sm font-semibold">Pix da loja</h2>
                <p className="mt-1 text-[11px] text-muted-foreground">Uma chave, um caminho mais simples</p>
              </div>
            </div>
            <div className="mt-5 rounded-xl border border-border bg-background p-4">
              <p className="flex items-center gap-2 text-xs font-medium">
                <span
                  className={`h-1.5 w-1.5 rounded-full ${keyReady ? "bg-emerald-400" : "bg-orange-400"}`}
                  aria-hidden="true"
                />
                {keyReady ? "Chave cadastrada" : "Chave não cadastrada"}
              </p>
              <p className="mt-3 flex items-center gap-2 text-sm tracking-widest text-muted-foreground">
                <KeyRound aria-hidden="true" className="h-4 w-4 shrink-0" />
                <span aria-label={keyReady ? "Chave Pix oculta" : "Sem chave Pix"}>
                  {keyReady ? "•••• •••• ••••" : "—"}
                </span>
              </p>
            </div>
            <p className="mt-3 text-xs leading-relaxed text-muted-foreground">
              {pix
                ? keyReady
                  ? "O cliente verá a chave ao selecionar Pix no checkout."
                  : "O Pix está nas opções. Cadastre a chave para orientar o cliente."
                : keyReady
                  ? "Sua chave está salva. Adicione a forma PIX para oferecer esse pagamento."
                  : "Cadastre uma chave e adicione PIX às formas de pagamento."}
            </p>
            <button onClick={(event) => openEditor(event, "pix")} className={`${control} mt-4 w-full`}>
              <Pencil aria-hidden="true" className="h-3.5 w-3.5" />
              {keyReady ? "Editar chave Pix" : "Cadastrar chave Pix"}
            </button>
          </section>
          <section
            className="dashboard-panel min-w-0 rounded-2xl border border-border bg-card p-5"
            aria-labelledby="payment-preview-title"
          >
            <div className="flex items-center gap-2">
              <Smartphone aria-hidden="true" className="h-4 w-4 text-primary" />
              <h2 id="payment-preview-title" className="text-sm font-semibold">
                Experiência do cliente
              </h2>
            </div>
            <p className="mt-2 text-xs leading-relaxed text-muted-foreground">
              Confira o que cada escolha oferece no checkout.
            </p>
            {methods.length ? (
              <>
                <label htmlFor="payment-preview" className="mb-2 mt-5 block text-xs font-medium">
                  Forma de pagamento
                </label>
                <select
                  id="payment-preview"
                  value={preview}
                  onChange={(event) => setPreviewMethod(event.target.value)}
                  className="min-h-12 w-full min-w-0 rounded-xl border border-border bg-background px-3 text-base sm:text-sm"
                >
                  {methods.map((name) => (
                    <option key={name} value={name}>
                      {name}
                    </option>
                  ))}
                </select>
                <div className="mt-3 rounded-xl border border-primary/15 bg-primary/5 p-4">
                  <p className="break-words text-xs font-semibold">{preview}</p>
                  <p className="mt-2 text-xs leading-relaxed text-muted-foreground">
                    {paymentKind(preview) === "pix"
                      ? keyReady
                        ? "A chave da loja fica disponível para copiar e realizar a transferência."
                        : "A chave precisa ser cadastrada para orientar a transferência."
                      : paymentKind(preview) === "cash"
                        ? "O cliente pode informar o valor para o qual precisa de troco."
                        : "A escolha é registrada no pedido e enviada à loja."}
                  </p>
                </div>
              </>
            ) : (
              <p className="mt-5 rounded-xl border border-dashed border-border p-4 text-xs leading-relaxed text-muted-foreground">
                A prévia estará disponível após cadastrar uma forma de pagamento.
              </p>
            )}
            <a
              href="/"
              target="_blank"
              rel="noopener noreferrer"
              className="orders-button mt-4 flex min-h-11 items-center justify-between gap-2 rounded-lg px-2 text-xs font-medium"
            >
              Ver loja
              <ArrowUpRight aria-hidden="true" className="h-4 w-4" />
            </a>
          </section>
          <div className="space-y-3 px-1 text-xs leading-relaxed text-muted-foreground md:col-span-2 xl:col-span-1">
            <p className="flex items-start gap-2">
              <ShieldCheck aria-hidden="true" className="mt-0.5 h-4 w-4 shrink-0 text-emerald-300" />A loja
              confere e confirma o recebimento de cada pagamento.
            </p>
            <p className="flex items-start gap-2">
              <Info aria-hidden="true" className="mt-0.5 h-4 w-4 shrink-0" />
              As alterações valem para os próximos pedidos. O histórico permanece preservado.
            </p>
          </div>
        </aside>
      </div>
      {editor && (
        <PaymentEditor
          mode={editor.mode}
          method={editor.method}
          methods={methods}
          pixKey={editor.pixKey}
          onSave={save}
          onClose={() => setEditor(null)}
          onReturnFocus={returnFocus}
        />
      )}
      <AlertDialog
        open={deleting !== null}
        onOpenChange={(open) => {
          if (!open && !deleteLock.current) setDeleting(null)
        }}
      >
        <AlertDialogContent
          className="admin-menu-dialog max-h-[90dvh] w-[calc(100%-2rem)] overflow-y-auto rounded-2xl bg-card p-5 sm:p-6"
          onCloseAutoFocus={(event) => {
            event.preventDefault()
            returnFocus()
          }}
          onEscapeKeyDown={(event) => {
            if (deleteLock.current) event.preventDefault()
          }}
        >
          <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-destructive/10 text-red-300">
            <Trash2 aria-hidden="true" className="h-5 w-5" />
          </span>
          <AlertDialogTitle>Excluir forma de pagamento?</AlertDialogTitle>
          <AlertDialogDescription className="break-words leading-relaxed">
            A opção <strong className="text-foreground">{deleting}</strong> deixará de aparecer nos próximos
            pedidos. Os pagamentos registrados no histórico não serão alterados.
          </AlertDialogDescription>
          {methods.length === 1 && (
            <p className="rounded-xl border border-orange-400/20 bg-orange-400/10 p-3 text-xs leading-relaxed text-orange-300">
              Esta é a única forma cadastrada. Sem uma opção de pagamento, seus clientes não poderão finalizar
              pedidos.
            </p>
          )}
          {deleteError && (
            <p role="alert" className="rounded-xl bg-destructive/10 p-3 text-xs leading-relaxed text-red-300">
              {deleteError}
            </p>
          )}
          <div className="grid grid-cols-2 gap-3">
            <AlertDialogCancel
              disabled={deleteBusy}
              className="m-0 min-h-11 rounded-xl border-border bg-transparent text-xs"
            >
              Cancelar
            </AlertDialogCancel>
            <button
              disabled={deleteBusy}
              onClick={confirmDelete}
              className="flex min-h-11 items-center justify-center gap-2 rounded-xl bg-destructive px-2 text-xs font-semibold text-destructive-foreground disabled:opacity-40"
            >
              {deleteBusy && <Loader2 aria-hidden="true" className="h-4 w-4 animate-spin" />}
              {deleteBusy ? "Excluindo…" : "Excluir forma"}
            </button>
          </div>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}
