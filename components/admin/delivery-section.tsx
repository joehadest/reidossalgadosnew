"use client"

import { useRef, useState, type MouseEvent } from "react"
import {
  ArrowDownUp,
  ArrowUpRight,
  Check,
  ChevronLeft,
  ChevronRight,
  CircleAlert,
  Gift,
  Info,
  Loader2,
  MapPin,
  Pencil,
  Plus,
  Search,
  ShieldCheck,
  Smartphone,
  Trash2,
  Truck,
  Wallet,
  X,
} from "lucide-react"
import { toast } from "sonner"
import { useAdmin, type DeliveryFee } from "@/lib/admin-context"
import {
  deliveryMoney,
  filterDeliveryFees,
  type DeliveryFilter,
  type DeliverySort,
} from "@/lib/delivery-fees"
import {
  AlertDialog,
  AlertDialogContent,
  AlertDialogTitle,
  AlertDialogDescription,
  AlertDialogCancel,
} from "@/components/ui/alert-dialog"
import { DeliveryFeeEditor } from "./delivery-fee-editor"

const primary =
  "flex min-h-11 items-center justify-center gap-2 rounded-xl bg-primary px-4 text-sm font-semibold text-primary-foreground transition-colors hover:bg-primary/90 disabled:opacity-40"
const control =
  "orders-button flex min-h-11 items-center justify-center gap-2 rounded-xl border border-border px-3 text-xs font-semibold disabled:cursor-not-allowed disabled:opacity-30"
const plural = (count: number) => `${count} bairro${count === 1 ? "" : "s"}`
const pageSize = 10

export function DeliverySection() {
  const { store, addDeliveryFee, updateDeliveryFee, deleteDeliveryFee } = useAdmin()
  const fees = store.deliveryFees
  const [editor, setEditor] = useState<DeliveryFee | null | undefined>(undefined)
  const [deleting, setDeleting] = useState<DeliveryFee | null>(null)
  const [deleteBusy, setDeleteBusy] = useState(false)
  const [deleteError, setDeleteError] = useState("")
  const [query, setQuery] = useState("")
  const [filter, setFilter] = useState<DeliveryFilter>("all")
  const [sort, setSort] = useState<DeliverySort>("name")
  const [page, setPage] = useState(1)
  const [previewNeighborhood, setPreviewNeighborhood] = useState("")
  const returnTarget = useRef<HTMLElement | null>(null)
  const heading = useRef<HTMLHeadingElement>(null)
  const deleteLock = useRef(false)
  const search = useRef<HTMLInputElement>(null)
  const filtered = filterDeliveryFees(fees, query, filter, sort)
  const pages = Math.max(1, Math.ceil(filtered.length / pageSize))
  const currentPage = Math.min(page, pages)
  const visible = filtered.slice((currentPage - 1) * pageSize, currentPage * pageSize)
  const alphabetical = filterDeliveryFees(fees, "", "all", "name")
  const preview = fees.find((entry) => entry.neighborhood === previewNeighborhood) ?? alphabetical[0]
  const free = fees.filter((entry) => entry.fee === 0).length
  const smallest = fees.length ? Math.min(...fees.map((entry) => entry.fee)) : null
  const largest = fees.length ? Math.max(...fees.map((entry) => entry.fee)) : null
  const stats = [
    {
      label: "Bairros atendidos",
      value: String(fees.length).padStart(2, "0"),
      help: "Disponíveis no checkout",
      Icon: MapPin,
      tone: "bg-primary/10 text-primary",
    },
    {
      label: "Menor taxa",
      value: smallest === null ? "—" : deliveryMoney(smallest),
      help: "Entre os bairros cadastrados",
      Icon: Wallet,
      tone: "bg-sky-400/10 text-sky-300",
    },
    {
      label: "Maior taxa",
      value: largest === null ? "—" : deliveryMoney(largest),
      help: "Entre os bairros cadastrados",
      Icon: Truck,
      tone: "bg-violet-400/10 text-violet-300",
    },
    {
      label: "Entrega grátis",
      value: String(free).padStart(2, "0"),
      help: `${plural(free)} com taxa zero`,
      Icon: Gift,
      tone: "bg-emerald-400/10 text-emerald-300",
    },
  ]
  function remember(event: MouseEvent<HTMLButtonElement>) {
    returnTarget.current = event.currentTarget
  }
  function returnFocus() {
    ;(returnTarget.current?.isConnected ? returnTarget.current : heading.current)?.focus()
  }
  function clearFilters() {
    setQuery("")
    setFilter("all")
    setPage(1)
    search.current?.focus()
  }
  async function confirmDelete() {
    if (!deleting || deleteLock.current) return
    deleteLock.current = true
    setDeleteBusy(true)
    setDeleteError("")
    try {
      await deleteDeliveryFee(deleting)
      setDeleting(null)
      toast.success("Bairro removido da área de entrega.")
    } catch (cause) {
      setDeleteError(
        cause instanceof Error ? cause.message : "Não foi possível excluir o bairro. Tente novamente.",
      )
    } finally {
      deleteLock.current = false
      setDeleteBusy(false)
    }
  }
  return (
    <div className="delivery-section flex flex-col gap-6">
      <header className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="mb-2 text-[10px] font-semibold uppercase tracking-[0.2em] text-primary">
            Onde sua loja chega
          </p>
          <h1
            ref={heading}
            tabIndex={-1}
            className="font-display text-3xl font-bold tracking-tight outline-none sm:text-4xl"
          >
            Taxas de entrega<span className="text-primary">.</span>
          </h1>
          <p className="mt-2 max-w-xl text-sm leading-relaxed text-muted-foreground">
            Organize os bairros atendidos e defina uma taxa clara para cada entrega.
          </p>
        </div>
        <button
          onClick={(event) => {
            remember(event)
            setEditor(null)
          }}
          className={`${primary} shrink-0`}
        >
          <Plus aria-hidden="true" className="h-4 w-4" />
          Novo bairro
        </button>
      </header>
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        {stats.map(({ label, value, help, Icon, tone }) => (
          <section
            key={label}
            aria-label={label}
            className="dashboard-panel min-w-0 rounded-2xl border border-border bg-card p-4 sm:p-5"
          >
            <span className={`mb-4 flex h-9 w-9 items-center justify-center rounded-xl ${tone}`}>
              <Icon aria-hidden="true" className="h-4 w-4" />
            </span>
            <p className="text-xs font-medium text-muted-foreground">{label}</p>
            <p className="mt-2 break-words font-display text-2xl font-bold tracking-tight tabular-nums sm:text-[30px]">
              {value}
            </p>
            <p className="mt-2 text-[11px] leading-relaxed text-muted-foreground">{help}</p>
          </section>
        ))}
      </div>
      <div className="grid items-start gap-6 xl:grid-cols-[minmax(0,1fr)_300px]">
        <section
          className="dashboard-panel min-w-0 overflow-hidden rounded-2xl border border-border bg-card"
          aria-labelledby="delivery-list-title"
        >
          <header className="border-b border-border p-5 sm:p-6">
            <div className="flex items-start justify-between gap-3">
              <div>
                <h2 id="delivery-list-title" className="font-display text-lg font-bold">
                  Área de entrega
                </h2>
                <p className="mt-1 text-xs leading-relaxed text-muted-foreground">
                  Cada bairro cadastrado aparece como opção para o cliente.
                </p>
              </div>
              <span className="rounded-lg border border-primary/20 bg-primary/5 p-2 text-primary">
                <MapPin aria-hidden="true" className="h-4 w-4" />
              </span>
            </div>
            <div className="mt-5 grid gap-3 sm:grid-cols-[minmax(0,1fr)_185px]">
              <div className="relative min-w-0">
                <Search
                  aria-hidden="true"
                  className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground"
                />
                <input
                  ref={search}
                  aria-label="Buscar bairro"
                  placeholder="Buscar bairro…"
                  value={query}
                  onChange={(event) => {
                    setQuery(event.target.value)
                    setPage(1)
                  }}
                  className="min-h-11 w-full min-w-0 rounded-xl border border-border bg-background pl-10 pr-12 text-base placeholder:text-muted-foreground sm:text-sm"
                />
                {query && (
                  <button
                    onClick={() => {
                      setQuery("")
                      setPage(1)
                      search.current?.focus()
                    }}
                    aria-label="Limpar busca"
                    className="orders-button absolute right-0 top-0 flex h-11 w-11 items-center justify-center rounded-xl text-muted-foreground"
                  >
                    <X aria-hidden="true" className="h-4 w-4" />
                  </button>
                )}
              </div>
              <div className="relative">
                <ArrowDownUp
                  aria-hidden="true"
                  className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground"
                />
                <select
                  aria-label="Ordenar bairros"
                  value={sort}
                  onChange={(event) => {
                    setSort(event.target.value as DeliverySort)
                    setPage(1)
                  }}
                  className="min-h-11 w-full min-w-0 rounded-xl border border-border bg-background pl-9 pr-2 text-base sm:text-xs"
                >
                  <option value="name">Nome: A–Z</option>
                  <option value="fee">Menor taxa primeiro</option>
                  <option value="fee-desc">Maior taxa primeiro</option>
                </select>
              </div>
            </div>
            <div className="mt-3 flex flex-wrap gap-2" role="group" aria-label="Filtrar taxas">
              {(
                [
                  { key: "all", label: "Todos", count: fees.length },
                  { key: "paid", label: "Com taxa", count: fees.length - free },
                  { key: "free", label: "Grátis", count: free },
                ] as const
              ).map(({ key, label, count }) => (
                <button
                  key={key}
                  aria-pressed={filter === key}
                  onClick={() => {
                    setFilter(key)
                    setPage(1)
                  }}
                  className={`flex min-h-11 items-center justify-center gap-2 rounded-xl border px-3 text-xs font-semibold transition-colors ${filter === key ? "border-primary/30 bg-primary/10 text-primary" : "border-border text-muted-foreground hover:bg-secondary"}`}
                >
                  {label}
                  <span
                    className={`rounded-md px-1.5 py-0.5 text-[10px] tabular-nums ${filter === key ? "bg-primary/10" : "bg-secondary"}`}
                  >
                    {count}
                  </span>
                </button>
              ))}
            </div>
          </header>
          <div className="flex flex-wrap items-center justify-between gap-2 border-b border-border px-5 py-3 text-[11px] text-muted-foreground sm:px-6">
            <p role="status" aria-live="polite">
              {plural(filtered.length)}
              {query || filter !== "all"
                ? filtered.length === 1
                  ? " encontrado"
                  : " encontrados"
                : filtered.length === 1
                  ? " cadastrado"
                  : " cadastrados"}
            </p>
            <span className="flex items-center gap-1.5">
              <Check aria-hidden="true" className="h-3 w-3 text-emerald-300" />
              Valores por entrega
            </span>
          </div>
          {visible.length ? (
            <>
              <div
                aria-hidden="true"
                className="hidden grid-cols-[minmax(0,1fr)_120px_104px] gap-4 border-b border-border bg-secondary/30 px-6 py-3 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground sm:grid"
              >
                <span>Bairro atendido</span>
                <span className="text-right">Taxa de entrega</span>
                <span className="text-right">Ações</span>
              </div>
              <ul className="divide-y divide-border">
                {visible.map((entry) => (
                  <li
                    key={entry.neighborhood}
                    className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-x-3 gap-y-3 px-5 py-4 transition-colors hover:bg-secondary/20 sm:grid-cols-[minmax(0,1fr)_120px_104px] sm:gap-4 sm:px-6 sm:py-5"
                  >
                    <div className="flex min-w-0 items-center gap-3">
                      <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-border bg-secondary/50 text-muted-foreground">
                        <MapPin aria-hidden="true" className="h-4 w-4" />
                      </span>
                      <div className="min-w-0">
                        <h3 className="break-words text-sm font-semibold">{entry.neighborhood}</h3>
                        <p className="mt-1 text-[11px] text-muted-foreground">Entrega disponível</p>
                      </div>
                    </div>
                    <div className="text-right">
                      {entry.fee === 0 ? (
                        <span className="inline-flex items-center gap-1.5 rounded-lg border border-emerald-400/20 bg-emerald-400/10 px-2.5 py-1.5 text-xs font-semibold text-emerald-300">
                          <Gift aria-hidden="true" className="h-3.5 w-3.5" />
                          Grátis
                        </span>
                      ) : (
                        <p className="text-sm font-bold tabular-nums text-primary">
                          {deliveryMoney(entry.fee)}
                        </p>
                      )}
                    </div>
                    <div className="col-span-2 flex justify-end gap-2 sm:col-span-1">
                      <button
                        aria-label={`Editar ${entry.neighborhood}`}
                        onClick={(event) => {
                          remember(event)
                          setEditor(entry)
                        }}
                        className="orders-button flex h-11 w-11 items-center justify-center rounded-xl border border-border text-muted-foreground hover:text-primary"
                      >
                        <Pencil aria-hidden="true" className="h-4 w-4" />
                      </button>
                      <button
                        aria-label={`Excluir ${entry.neighborhood}`}
                        onClick={(event) => {
                          remember(event)
                          setDeleteError("")
                          setDeleting(entry)
                        }}
                        className="orders-button flex h-11 w-11 items-center justify-center rounded-xl border border-border text-muted-foreground hover:text-red-300"
                      >
                        <Trash2 aria-hidden="true" className="h-4 w-4" />
                      </button>
                    </div>
                  </li>
                ))}
              </ul>
              <footer className="flex flex-wrap items-center justify-between gap-3 border-t border-border px-5 py-4 sm:px-6">
                <p className="text-[11px] text-muted-foreground">
                  Mostrando {(currentPage - 1) * pageSize + 1}–
                  {Math.min(currentPage * pageSize, filtered.length)} de {filtered.length}
                </p>
                {pages > 1 && (
                  <nav aria-label="Paginação dos bairros" className="flex items-center gap-2">
                    <button
                      aria-label="Página anterior"
                      disabled={currentPage <= 1}
                      onClick={() => setPage(currentPage - 1)}
                      className={control}
                    >
                      <ChevronLeft aria-hidden="true" className="h-4 w-4" />
                    </button>
                    <span className="text-xs tabular-nums">
                      {currentPage}/{pages}
                    </span>
                    <button
                      aria-label="Próxima página"
                      disabled={currentPage >= pages}
                      onClick={() => setPage(currentPage + 1)}
                      className={control}
                    >
                      <ChevronRight aria-hidden="true" className="h-4 w-4" />
                    </button>
                  </nav>
                )}
              </footer>
            </>
          ) : (
            <div className="flex flex-col items-center px-5 py-12 text-center">
              <span className="mb-4 rounded-2xl border border-border bg-secondary/50 p-4 text-muted-foreground">
                {fees.length ? (
                  <Search aria-hidden="true" className="h-6 w-6" />
                ) : (
                  <MapPin aria-hidden="true" className="h-6 w-6" />
                )}
              </span>
              <h3 className="font-display text-lg font-bold">
                {fees.length ? "Nenhum bairro encontrado" : "Sua área de entrega começa aqui"}
              </h3>
              <p className="mt-2 max-w-sm text-sm leading-relaxed text-muted-foreground">
                {fees.length
                  ? "Tente outro nome ou ajuste os filtros para encontrar o bairro."
                  : "Cadastre o primeiro bairro e informe a taxa para disponibilizar entregas nessa região."}
              </p>
              <button
                className={`${fees.length ? control : primary} mt-5`}
                onClick={(event) => {
                  if (fees.length) clearFilters()
                  else {
                    remember(event)
                    setEditor(null)
                  }
                }}
              >
                {fees.length ? "Limpar filtros" : "Cadastrar primeiro bairro"}
              </button>
            </div>
          )}
        </section>
        <aside className="grid min-w-0 gap-5 md:grid-cols-2 xl:grid-cols-1">
          <section
            className="dashboard-panel min-w-0 rounded-2xl border border-border bg-card p-5"
            aria-labelledby="delivery-preview-title"
          >
            <div className="flex items-center gap-2 text-primary">
              <Smartphone aria-hidden="true" className="h-4 w-4" />
              <p className="text-[10px] font-semibold uppercase tracking-[0.18em]">Visão do cliente</p>
            </div>
            <h2 id="delivery-preview-title" className="mt-3 font-display text-lg font-bold">
              Prévia no checkout
            </h2>
            <p className="mt-1.5 text-xs leading-relaxed text-muted-foreground">
              Veja a taxa aplicada ao selecionar um bairro.
            </p>
            <div className="mt-5 rounded-xl border border-border bg-background p-4">
              <label htmlFor="delivery-preview" className="text-xs font-medium">
                Bairro de entrega
              </label>
              <select
                id="delivery-preview"
                disabled={!preview}
                value={preview?.neighborhood ?? ""}
                onChange={(event) => setPreviewNeighborhood(event.target.value)}
                className="mt-2 min-h-11 w-full min-w-0 rounded-lg border border-border bg-card px-2 text-base disabled:opacity-50 sm:text-sm"
              >
                {!preview && <option value="">Nenhum bairro disponível</option>}
                {alphabetical.map((entry) => (
                  <option key={entry.neighborhood} value={entry.neighborhood}>
                    {entry.neighborhood}
                  </option>
                ))}
              </select>
              <div
                aria-live="polite"
                className="mt-5 flex items-start justify-between gap-3 border-t border-dashed border-border pt-4"
              >
                <span className="flex items-center gap-2 text-xs text-muted-foreground">
                  <Truck aria-hidden="true" className="h-4 w-4" />
                  Taxa de entrega
                </span>
                <span
                  className={`text-right text-sm font-bold tabular-nums ${preview?.fee === 0 ? "text-emerald-300" : "text-primary"}`}
                >
                  {!preview ? "—" : preview.fee === 0 ? "Grátis" : deliveryMoney(preview.fee)}
                </span>
              </div>
            </div>
            <p className="mt-4 flex items-start gap-2 text-[11px] leading-relaxed text-muted-foreground">
              <Info aria-hidden="true" className="mt-0.5 h-3.5 w-3.5 shrink-0" />A taxa é adicionada ao valor
              dos produtos no pedido.
            </p>
          </section>
          <section
            className="rounded-2xl border border-primary/15 bg-primary/[0.035] p-5"
            aria-labelledby="delivery-notes-title"
          >
            <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-primary/10 text-primary">
              <ShieldCheck aria-hidden="true" className="h-4 w-4" />
            </span>
            <h2 id="delivery-notes-title" className="mt-4 font-display text-base font-bold">
              Entrega bem definida
            </h2>
            <div className="mt-4 space-y-4 text-xs leading-relaxed text-muted-foreground">
              <p>
                <span className="mb-1 block font-medium text-foreground">Um bairro, uma taxa</span>Cadastre
                cada bairro uma vez e mantenha os valores atualizados.
              </p>
              <p>
                <span className="mb-1 block font-medium text-foreground">Grátis também é uma opção</span>Uma
                taxa de R$ 0,00 oferece entrega gratuita naquele bairro.
              </p>
              <p>
                <span className="mb-1 block font-medium text-foreground">Pedidos anteriores preservados</span>
                As alterações valem para novos pedidos. Os valores dos pedidos já feitos permanecem os mesmos.
              </p>
            </div>
            <a
              href="/"
              target="_blank"
              rel="noopener noreferrer"
              className="mt-5 flex min-h-11 items-center justify-between gap-3 rounded-xl border border-primary/20 px-3 text-xs font-semibold text-primary hover:bg-primary/10"
            >
              Visualizar loja<span className="sr-only"> (abre em nova aba)</span>
              <ArrowUpRight aria-hidden="true" className="h-4 w-4" />
            </a>
          </section>
        </aside>
      </div>
      {editor !== undefined && (
        <DeliveryFeeEditor
          fee={editor}
          fees={fees}
          onClose={() => setEditor(undefined)}
          onReturnFocus={returnFocus}
          onSave={async (data) => {
            if (editor) await updateDeliveryFee(editor, data)
            else await addDeliveryFee(data)
            setEditor(undefined)
            toast.success(editor ? "Bairro e taxa atualizados." : "Bairro cadastrado.")
          }}
        />
      )}
      <AlertDialog
        open={!!deleting}
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
          <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-red-400/10 text-red-300">
            <Trash2 aria-hidden="true" className="h-5 w-5" />
          </span>
          <AlertDialogTitle className="font-display text-xl">Excluir bairro?</AlertDialogTitle>
          <AlertDialogDescription className="break-words leading-relaxed">
            <strong className="font-semibold text-foreground">{deleting?.neighborhood}</strong> deixará de
            aparecer entre os bairros disponíveis no checkout. Pedidos já realizados não serão alterados.
          </AlertDialogDescription>
          {deleteError && (
            <p
              role="alert"
              className="flex items-start gap-2 rounded-xl border border-red-400/20 bg-red-400/10 p-3 text-sm text-red-300"
            >
              <CircleAlert aria-hidden="true" className="mt-0.5 h-4 w-4 shrink-0" />
              {deleteError}
            </p>
          )}
          <div className="mt-2 grid grid-cols-2 gap-3">
            <AlertDialogCancel
              disabled={deleteBusy}
              className="m-0 min-h-11 rounded-xl border-border bg-transparent text-sm"
            >
              Manter bairro
            </AlertDialogCancel>
            <button
              disabled={deleteBusy}
              onClick={confirmDelete}
              className="flex min-h-11 items-center justify-center gap-2 rounded-xl bg-destructive px-2 text-sm font-semibold text-destructive-foreground disabled:opacity-40"
            >
              {deleteBusy && <Loader2 aria-hidden="true" className="h-4 w-4 animate-spin" />}
              {deleteBusy ? "Excluindo…" : "Excluir bairro"}
            </button>
          </div>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}
