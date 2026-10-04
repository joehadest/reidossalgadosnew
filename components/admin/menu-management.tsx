"use client"

import { useEffect, useRef, useState } from "react"
import Link from "next/link"
import { toast } from "sonner"
import {
  ChevronLeft,
  ChevronRight,
  Eye,
  EyeOff,
  Layers3,
  LayoutGrid,
  List,
  Loader2,
  Package,
  Pencil,
  Plus,
  Search,
  Tag,
  Trash2,
  UtensilsCrossed,
  X,
} from "lucide-react"
import { useAdmin } from "@/lib/admin-context"
import { filterMenu, menuMoney, menuPrice, type MenuSort, type MenuStatus } from "@/lib/admin-menu"
import type { MenuItem } from "@/lib/store-data"
import {
  AlertDialog,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog"
import { MenuProductImage } from "./menu-product-image"
import { MenuItemEditor } from "./menu-item-editor"

const PAGE_SIZE = 12

export function MenuManagement() {
  const { menuItems, categories, addMenuItem, updateMenuItem, deleteMenuItem } = useAdmin()
  const [search, setSearch] = useState("")
  const [category, setCategory] = useState("")
  const [status, setStatus] = useState<MenuStatus>("all")
  const [sort, setSort] = useState<MenuSort>("name")
  const [view, setView] = useState<"grid" | "list">("grid")
  const [page, setPage] = useState(1)
  const [editor, setEditor] = useState<{ item: MenuItem | null } | null>(null)
  const [deleting, setDeleting] = useState<MenuItem | null>(null)
  const [deleteError, setDeleteError] = useState("")
  const [deleteBusy, setDeleteBusy] = useState(false)
  const [pending, setPending] = useState<Set<string>>(new Set())
  const heading = useRef<HTMLHeadingElement>(null)
  const resultsHeading = useRef<HTMLHeadingElement>(null)
  const returnTarget = useRef<HTMLElement | null>(null)
  const active = menuItems.filter((item) => item.available !== false).length
  const filtered = filterMenu(menuItems, categories, search, category, status, sort)
  const pageCount = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE))
  const currentPage = Math.min(page, pageCount)
  const visible = filtered.slice((currentPage - 1) * PAGE_SIZE, currentPage * PAGE_SIZE)
  const hasFilters = !!search || !!category || status !== "all"

  useEffect(() => {
    setPage((value) => Math.min(value, pageCount))
  }, [pageCount])

  function returnFocus() {
    if (returnTarget.current?.isConnected) returnTarget.current.focus({ preventScroll: true })
    else heading.current?.focus({ preventScroll: true })
  }
  function openEditor(item: MenuItem | null, target: HTMLElement) {
    returnTarget.current = target
    setEditor({ item })
  }
  function resetFilters() {
    setSearch("")
    setCategory("")
    setStatus("all")
    setPage(1)
  }
  async function toggleItem(item: MenuItem) {
    if (pending.has(item.id)) return
    setPending((value) => new Set(value).add(item.id))
    try {
      await updateMenuItem(item.id, { available: item.available === false })
      toast.success(item.available === false ? `${item.name} ativado no cardápio.` : `${item.name} pausado.`)
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Não foi possível atualizar o produto.")
    } finally {
      setPending((value) => {
        const next = new Set(value)
        next.delete(item.id)
        return next
      })
    }
  }
  async function confirmDelete() {
    if (!deleting || deleteBusy) return
    setDeleteBusy(true)
    setDeleteError("")
    try {
      await deleteMenuItem(deleting.id)
      setDeleting(null)
      toast.success("Produto excluído do cardápio.")
    } catch (error) {
      setDeleteError(error instanceof Error ? error.message : "Não foi possível excluir. Tente novamente.")
    } finally {
      setDeleteBusy(false)
    }
  }
  function changePage(next: number) {
    setPage(next)
    requestAnimationFrame(() => {
      resultsHeading.current?.scrollIntoView({ block: "start", behavior: "instant" })
      resultsHeading.current?.focus({ preventScroll: true })
    })
  }

  return (
    <div className="menu-management flex min-w-0 flex-col gap-5 sm:gap-6">
      <header className="flex flex-col justify-between gap-4 sm:flex-row sm:items-end">
        <div>
          <div className="mb-2 flex items-center gap-2 text-xs font-medium text-muted-foreground">
            <span className="h-1.5 w-1.5 rounded-full bg-primary" />
            GESTÃO DE PRODUTOS
          </div>
          <h1
            ref={heading}
            tabIndex={-1}
            className="font-display text-3xl font-bold tracking-tight outline-none sm:text-4xl"
          >
            Cardápio<span className="text-primary">.</span>
          </h1>
          <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
            Seus produtos, preços e opções em um só lugar.
          </p>
        </div>
        <button
          type="button"
          disabled={!categories.length}
          onClick={(event) => openEditor(null, event.currentTarget)}
          className="flex min-h-11 shrink-0 items-center justify-center gap-2 rounded-xl bg-primary px-5 text-sm font-semibold text-primary-foreground transition-colors hover:bg-primary/90 disabled:opacity-50"
        >
          <Plus aria-hidden="true" className="h-4 w-4" />
          Novo produto
        </button>
      </header>

      <div className="grid grid-cols-2 gap-3 sm:gap-4 xl:grid-cols-4">
        {[
          {
            label: "Produtos cadastrados",
            value: menuItems.length,
            icon: Package,
            accent: "bg-primary/10 text-primary",
          },
          {
            label: "Ativos no cardápio",
            value: active,
            icon: Eye,
            accent: "bg-emerald-400/10 text-emerald-300",
          },
          {
            label: "Produtos pausados",
            value: menuItems.length - active,
            icon: EyeOff,
            accent: "bg-amber-400/10 text-amber-300",
          },
          {
            label: "Com sabores ou opções",
            value: menuItems.filter((item) => item.variants?.length).length,
            icon: Layers3,
            accent: "bg-violet-400/10 text-violet-300",
          },
        ].map((metric) => (
          <div
            key={metric.label}
            className="dashboard-panel flex min-w-0 flex-col gap-3 rounded-2xl border border-border bg-card p-4 sm:flex-row sm:items-center sm:gap-4 sm:p-5"
          >
            <span
              className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl ${metric.accent}`}
            >
              <metric.icon aria-hidden="true" className="h-5 w-5" />
            </span>
            <div>
              <p className="text-[11px] leading-relaxed text-muted-foreground sm:text-xs">{metric.label}</p>
              <p className="mt-1 font-display text-2xl font-semibold tabular-nums">{metric.value}</p>
            </div>
          </div>
        ))}
      </div>

      {!categories.length && (
        <div className="rounded-xl border border-amber-400/20 bg-amber-400/5 p-4 text-sm text-amber-100">
          Cadastre uma categoria para começar a adicionar produtos.{" "}
          <Link
            href="/admin?section=categories"
            className="inline-flex min-h-11 items-center font-semibold text-primary underline underline-offset-4"
          >
            Criar categoria
          </Link>
        </div>
      )}

      <section
        aria-label="Filtros do cardápio"
        className="dashboard-panel rounded-2xl border border-border bg-card p-3 sm:p-4"
      >
        <div className="flex flex-col gap-3 lg:flex-row">
          <div className="relative min-w-0 flex-1">
            <Search
              aria-hidden="true"
              className="pointer-events-none absolute left-3.5 top-3.5 h-4 w-4 text-muted-foreground"
            />
            <input
              aria-label="Buscar produtos"
              placeholder="Buscar produto, descrição ou sabor…"
              value={search}
              onChange={(event) => {
                setSearch(event.target.value)
                setPage(1)
              }}
              className="h-11 w-full min-w-0 rounded-xl border border-border bg-background pl-10 pr-11 text-sm placeholder:text-muted-foreground"
            />
            {search && (
              <button
                type="button"
                aria-label="Limpar busca"
                onClick={() => {
                  setSearch("")
                  setPage(1)
                }}
                className="dashboard-icon-button absolute right-0 top-0 h-11 w-11 rounded-xl text-muted-foreground"
              >
                <X aria-hidden="true" className="h-4 w-4" />
              </button>
            )}
          </div>
          <div className="grid gap-3 sm:grid-cols-2 lg:w-[410px]">
            <select
              aria-label="Filtrar por categoria"
              value={category}
              onChange={(event) => {
                setCategory(event.target.value)
                setPage(1)
              }}
              className="h-11 w-full min-w-0 rounded-xl border border-border bg-background px-3 text-xs"
            >
              <option value="">Todas as categorias</option>
              {categories.map((entry) => (
                <option key={entry.id} value={entry.id}>
                  {entry.name} ({menuItems.filter((item) => item.category === entry.id).length})
                </option>
              ))}
            </select>
            <select
              aria-label="Ordenar produtos"
              value={sort}
              onChange={(event) => {
                setSort(event.target.value as MenuSort)
                setPage(1)
              }}
              className="h-11 w-full min-w-0 rounded-xl border border-border bg-background px-3 text-xs"
            >
              <option value="name">Nome: A a Z</option>
              <option value="name-desc">Nome: Z a A</option>
              <option value="price">Menor preço primeiro</option>
              <option value="price-desc">Maior preço primeiro</option>
            </select>
          </div>
        </div>
        <div className="mt-3 flex flex-wrap items-center justify-between gap-2 border-t border-border pt-3">
          <div role="group" aria-label="Disponibilidade dos produtos" className="flex flex-wrap gap-1">
            {(
              [
                { value: "all", label: "Todos", count: menuItems.length },
                { value: "active", label: "Ativos", count: active },
                { value: "paused", label: "Pausados", count: menuItems.length - active },
              ] as const
            ).map((entry) => (
              <button
                type="button"
                key={entry.value}
                aria-pressed={status === entry.value}
                onClick={() => {
                  setStatus(entry.value)
                  setPage(1)
                }}
                className={`inline-flex min-h-11 items-center gap-2 rounded-lg px-3 text-xs font-medium ${status === entry.value ? "bg-primary/10 text-primary" : "text-muted-foreground hover:bg-secondary hover:text-foreground"}`}
              >
                {entry.label}
                <span
                  className={`rounded-md px-1.5 py-0.5 text-[10px] tabular-nums ${status === entry.value ? "bg-primary/10" : "bg-secondary"}`}
                >
                  {entry.count}
                </span>
              </button>
            ))}
          </div>
          {hasFilters && (
            <button
              type="button"
              onClick={resetFilters}
              className="inline-flex min-h-11 items-center gap-1.5 rounded-lg px-3 text-xs text-muted-foreground hover:text-foreground"
            >
              <X aria-hidden="true" className="h-3.5 w-3.5" />
              Limpar filtros
            </button>
          )}
        </div>
      </section>

      <section aria-labelledby="menu-results-heading" className="min-w-0">
        <div className="mb-4 flex items-center justify-between gap-3">
          <div>
            <h2
              ref={resultsHeading}
              id="menu-results-heading"
              tabIndex={-1}
              className="scroll-mt-24 text-sm font-semibold outline-none"
            >
              {category
                ? (categories.find((entry) => entry.id === category)?.name ?? "Produtos")
                : "Seus produtos"}
            </h2>
            <p role="status" className="mt-1 text-xs text-muted-foreground">
              {filtered.length
                ? `${(currentPage - 1) * PAGE_SIZE + 1}–${Math.min(currentPage * PAGE_SIZE, filtered.length)} de ${filtered.length} ${filtered.length === 1 ? "produto" : "produtos"}${hasFilters ? (filtered.length === 1 ? " encontrado" : " encontrados") : ""}`
                : "Nenhum produto encontrado"}
            </p>
          </div>
          <div
            role="group"
            aria-label="Visualização dos produtos"
            className="flex shrink-0 gap-1 rounded-xl border border-border bg-card p-1"
          >
            <button
              type="button"
              aria-label="Visualizar em cards"
              aria-pressed={view === "grid"}
              onClick={() => setView("grid")}
              className={`dashboard-icon-button h-10 w-10 rounded-lg ${view === "grid" ? "bg-secondary text-primary" : "text-muted-foreground"}`}
            >
              <LayoutGrid aria-hidden="true" className="h-4 w-4" />
            </button>
            <button
              type="button"
              aria-label="Visualizar em lista"
              aria-pressed={view === "list"}
              onClick={() => setView("list")}
              className={`dashboard-icon-button h-10 w-10 rounded-lg ${view === "list" ? "bg-secondary text-primary" : "text-muted-foreground"}`}
            >
              <List aria-hidden="true" className="h-4 w-4" />
            </button>
          </div>
        </div>
        {visible.length ? (
          <div
            className={
              view === "grid"
                ? "grid gap-4 sm:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4"
                : "flex flex-col gap-3"
            }
          >
            {visible.map((item, index) => (
              <MenuProductCard
                key={item.id}
                item={item}
                category={categories.find((entry) => entry.id === item.category)?.name ?? "Sem categoria"}
                view={view}
                busy={pending.has(item.id)}
                eager={index < 3}
                onToggle={() => void toggleItem(item)}
                onEdit={(target) => openEditor(item, target)}
                onDelete={(target) => {
                  returnTarget.current = target
                  setDeleting(item)
                  setDeleteError("")
                }}
              />
            ))}
          </div>
        ) : (
          <div className="dashboard-panel flex flex-col items-center rounded-2xl border border-dashed border-border bg-card px-5 py-12 text-center">
            <span className="mb-4 rounded-2xl bg-secondary p-4">
              <UtensilsCrossed aria-hidden="true" className="h-7 w-7 text-muted-foreground" />
            </span>
            <h3 className="font-semibold">
              {menuItems.length ? "Não encontramos esse produto" : "Seu cardápio começa aqui"}
            </h3>
            <p className="mt-2 max-w-sm text-sm leading-relaxed text-muted-foreground">
              {menuItems.length
                ? "Tente outro nome, sabor ou ajuste os filtros para encontrar o que procura."
                : "Adicione seu primeiro produto com foto, descrição e preço."}
            </p>
            {menuItems.length ? (
              <button
                type="button"
                onClick={resetFilters}
                className="mt-5 min-h-11 rounded-xl border border-border px-4 text-sm font-medium hover:bg-secondary"
              >
                Limpar filtros
              </button>
            ) : (
              <button
                type="button"
                disabled={!categories.length}
                onClick={(event) => openEditor(null, event.currentTarget)}
                className="mt-5 min-h-11 rounded-xl bg-primary px-4 text-sm font-semibold text-primary-foreground disabled:opacity-50"
              >
                Adicionar primeiro produto
              </button>
            )}
          </div>
        )}
        {pageCount > 1 && (
          <nav
            aria-label="Paginação do cardápio"
            className="mt-5 flex flex-wrap items-center justify-between gap-3 rounded-xl border border-border bg-card p-3 sm:px-4"
          >
            <span className="text-xs text-muted-foreground">
              Página <span className="font-medium text-foreground">{currentPage}</span> de {pageCount}
            </span>
            <div className="flex gap-2">
              <button
                type="button"
                disabled={currentPage === 1}
                onClick={() => changePage(currentPage - 1)}
                className="orders-button inline-flex min-h-11 items-center gap-1 rounded-lg border border-border px-3 text-xs font-medium disabled:opacity-40"
              >
                <ChevronLeft aria-hidden="true" className="h-4 w-4" />
                Anterior
              </button>
              <button
                type="button"
                disabled={currentPage === pageCount}
                onClick={() => changePage(currentPage + 1)}
                className="orders-button inline-flex min-h-11 items-center gap-1 rounded-lg border border-border px-3 text-xs font-medium disabled:opacity-40"
              >
                Próxima
                <ChevronRight aria-hidden="true" className="h-4 w-4" />
              </button>
            </div>
          </nav>
        )}
      </section>

      {editor && (
        <MenuItemEditor
          item={editor.item}
          categories={categories}
          onClose={() => setEditor(null)}
          onReturnFocus={returnFocus}
          onSave={async (item) => {
            if (editor.item) await updateMenuItem(editor.item.id, item)
            else await addMenuItem({ ...item, id: crypto.randomUUID() })
            toast.success(editor.item ? "Produto atualizado." : "Produto criado no cardápio.")
            setEditor(null)
          }}
        />
      )}

      <AlertDialog
        open={!!deleting}
        onOpenChange={(open) => {
          if (!open && !deleteBusy) setDeleting(null)
        }}
      >
        <AlertDialogContent
          className="admin-menu-dialog w-[calc(100%-2rem)] max-h-[90dvh] overflow-y-auto rounded-2xl bg-card p-5 sm:p-6"
          onCloseAutoFocus={(event) => {
            event.preventDefault()
            returnFocus()
          }}
          onEscapeKeyDown={(event) => {
            if (deleteBusy) event.preventDefault()
          }}
        >
          <span className="flex h-12 w-12 items-center justify-center rounded-xl bg-rose-400/10 text-rose-300">
            <Trash2 aria-hidden="true" className="h-6 w-6" />
          </span>
          <AlertDialogTitle className="font-display text-xl">Excluir produto?</AlertDialogTitle>
          <AlertDialogDescription className="text-sm leading-relaxed">
            {deleting?.name} e suas opções serão removidos do cardápio. Essa ação não pode ser desfeita. Para
            suspender as vendas temporariamente, use a opção Pausar.
          </AlertDialogDescription>
          {deleteError && (
            <p role="alert" className="rounded-xl bg-rose-400/10 p-3 text-sm text-rose-300">
              {deleteError}
            </p>
          )}
          <div className="mt-2 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
            <AlertDialogCancel
              disabled={deleteBusy}
              className="m-0 min-h-11 rounded-xl border-border bg-transparent text-sm"
            >
              Voltar
            </AlertDialogCancel>
            <button
              type="button"
              disabled={deleteBusy}
              onClick={() => void confirmDelete()}
              className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl bg-rose-500 px-4 text-sm font-semibold text-white hover:bg-rose-600 disabled:opacity-50"
            >
              {deleteBusy && <Loader2 aria-hidden="true" className="h-4 w-4 animate-spin" />}
              {deleteBusy ? "Excluindo…" : "Excluir produto"}
            </button>
          </div>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}

function MenuProductCard({
  item,
  category,
  view,
  busy,
  eager,
  onToggle,
  onEdit,
  onDelete,
}: {
  item: MenuItem
  category: string
  view: "grid" | "list"
  busy: boolean
  eager: boolean
  onToggle: () => void
  onEdit: (target: HTMLElement) => void
  onDelete: (target: HTMLElement) => void
}) {
  const paused = item.available === false
  const options = item.variants?.length ?? 0
  const activeOptions = item.variants?.filter((variant) => variant.available).length ?? 0
  const compact = view === "list"
  return (
    <article
      className={`dashboard-panel group min-w-0 overflow-hidden rounded-2xl border border-border bg-card transition-colors hover:border-primary/25 ${compact ? "flex flex-col sm:flex-row sm:items-center sm:gap-4 sm:p-4" : "flex flex-col"}`}
    >
      <MenuProductImage
        src={item.image}
        name={item.name}
        eager={eager}
        sizes={compact ? "96px" : "(max-width: 639px) 100vw, (max-width: 1279px) 50vw, 33vw"}
        className={`${compact ? "hidden h-24 w-24 shrink-0 rounded-xl sm:block" : "aspect-[16/9] w-full border-b border-border"} ${paused ? "opacity-60 grayscale-[35%]" : ""}`}
      />
      <div className={`min-w-0 flex-1 ${compact ? "p-4 sm:p-0" : "flex flex-1 flex-col p-4 sm:p-5"}`}>
        <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
          <span className="inline-flex max-w-full items-center gap-1.5 rounded-md bg-secondary px-2 py-1 text-[10px] font-medium text-muted-foreground">
            <Tag aria-hidden="true" className="h-3 w-3 shrink-0" />
            <span className="break-words">{category}</span>
          </span>
          <span
            className={`inline-flex items-center gap-1.5 text-[10px] font-medium ${paused ? "text-amber-300" : "text-emerald-300"}`}
          >
            <span className={`h-1.5 w-1.5 rounded-full ${paused ? "bg-amber-300" : "bg-emerald-400"}`} />
            {paused ? "Pausado" : "Ativo"}
          </span>
        </div>
        <h3
          className={`break-words text-sm font-semibold leading-snug ${!compact ? "line-clamp-2 min-h-[40px]" : ""}`}
        >
          {item.name}
        </h3>
        <p
          className={`mt-1 line-clamp-2 text-xs leading-relaxed text-muted-foreground ${!compact ? "min-h-[36px]" : ""}`}
        >
          {item.description}
        </p>
        <div
          className={`mt-4 flex flex-wrap items-end justify-between gap-2 ${!compact ? "mt-auto pt-4" : ""}`}
        >
          <div>
            {options > 0 && activeOptions > 0 && (
              <p className="mb-0.5 text-[10px] text-muted-foreground">A partir de</p>
            )}
            <p className="font-display text-xl font-semibold tabular-nums text-primary">
              {menuMoney(menuPrice(item))}
            </p>
          </div>
          <span
            className={`text-[10px] ${options && !activeOptions ? "text-amber-300" : "text-muted-foreground"}`}
          >
            {options ? `${activeOptions}/${options} opções ativas` : "Preço único"}
          </span>
        </div>
      </div>
      <div
        className={`flex flex-wrap gap-2 border-t border-border p-3 ${compact ? "sm:w-[220px] sm:shrink-0 sm:border-0 sm:p-0" : ""}`}
      >
        <button
          type="button"
          disabled={busy}
          onClick={onToggle}
          aria-label={`${paused ? "Ativar" : "Pausar"} ${item.name}`}
          className={`orders-button inline-flex min-h-11 flex-1 items-center justify-center gap-1.5 rounded-lg border border-border px-2 text-xs font-medium disabled:opacity-50 ${paused ? "text-emerald-300" : "text-muted-foreground"}`}
        >
          {busy ? (
            <Loader2 aria-hidden="true" className="h-4 w-4 animate-spin" />
          ) : paused ? (
            <Eye aria-hidden="true" className="h-4 w-4" />
          ) : (
            <EyeOff aria-hidden="true" className="h-4 w-4" />
          )}
          {paused ? "Ativar" : "Pausar"}
        </button>
        <button
          type="button"
          disabled={busy}
          onClick={(event) => onEdit(event.currentTarget)}
          aria-label={`Editar ${item.name}`}
          className="inline-flex min-h-11 flex-1 items-center justify-center gap-1.5 rounded-lg bg-primary/10 px-2 text-xs font-semibold text-primary transition-colors hover:bg-primary/20 disabled:opacity-50"
        >
          <Pencil aria-hidden="true" className="h-3.5 w-3.5" />
          Editar
        </button>
        <button
          type="button"
          disabled={busy}
          onClick={(event) => onDelete(event.currentTarget)}
          aria-label={`Excluir ${item.name}`}
          className="dashboard-icon-button h-11 w-11 shrink-0 rounded-lg text-muted-foreground hover:bg-rose-400/10 hover:text-rose-300 disabled:opacity-50"
        >
          <Trash2 aria-hidden="true" className="h-4 w-4" />
        </button>
      </div>
    </article>
  )
}
