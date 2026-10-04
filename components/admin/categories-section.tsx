"use client"

import { useRef, useState, type MouseEvent } from "react"
import {
  ArrowDown,
  ArrowUp,
  ArrowUpDown,
  ArrowUpRight,
  Check,
  CircleAlert,
  Eye,
  Layers3,
  Loader2,
  Package,
  Pencil,
  Plus,
  Search,
  ShieldCheck,
  Smartphone,
  Trash2,
  X,
} from "lucide-react"
import { toast } from "sonner"
import { useAdmin } from "@/lib/admin-context"
import { normalizeCategoryName } from "@/lib/category-validation"
import type { Category } from "@/lib/store-data"
import {
  AlertDialog,
  AlertDialogContent,
  AlertDialogTitle,
  AlertDialogDescription,
  AlertDialogCancel,
} from "@/components/ui/alert-dialog"
import { CategoryEditor } from "./category-editor"
import { CategoryIcon, categoryVisual } from "./category-visual"

const action =
  "orders-button flex min-h-11 items-center justify-center gap-2 rounded-xl border border-border px-3 text-xs font-semibold disabled:cursor-not-allowed disabled:opacity-30"
const primary =
  "flex min-h-11 items-center justify-center gap-2 rounded-xl bg-primary px-4 text-sm font-semibold text-primary-foreground transition-colors hover:bg-primary/90 disabled:cursor-not-allowed disabled:opacity-40"
const plural = (count: number, word: string) => `${count} ${word}${count === 1 ? "" : "s"}`

export function CategoriesSection() {
  const { categories, menuItems, addCategory, updateCategory, deleteCategory, reorderCategories } = useAdmin()
  const [editor, setEditor] = useState<Category | null | undefined>(undefined)
  const [deleting, setDeleting] = useState<Category | null>(null)
  const [deleteBusy, setDeleteBusy] = useState(false)
  const [deleteError, setDeleteError] = useState("")
  const [query, setQuery] = useState("")
  const [filter, setFilter] = useState("all")
  const [draftOrder, setDraftOrder] = useState<string[] | null>(null)
  const [orderBusy, setOrderBusy] = useState(false)
  const [orderError, setOrderError] = useState("")
  const [announcement, setAnnouncement] = useState("")
  const orderLock = useRef(false)
  const deleteLock = useRef(false)
  const returnTarget = useRef<HTMLElement | null>(null)
  const heading = useRef<HTMLHeadingElement>(null)
  const search = useRef<HTMLInputElement>(null)
  const reordering = draftOrder !== null
  const byId = new Map(categories.map((cat) => [cat.id, cat]))
  const ordered = draftOrder
    ? draftOrder.map((id) => byId.get(id)).filter((cat): cat is Category => !!cat)
    : categories
  const counts = new Map(
    categories.map((cat) => {
      const products = menuItems.filter((item) => item.category === cat.id)
      return [
        cat.id,
        { total: products.length, active: products.filter((item) => item.available !== false).length },
      ]
    }),
  )
  const emptyCount = categories.filter((cat) => !counts.get(cat.id)?.total).length
  const visibleCount = categories.filter((cat) => !!counts.get(cat.id)?.active).length
  const totalProducts = Array.from(counts.values()).reduce((sum, cat) => sum + cat.total, 0)
  const term = normalizeCategoryName(query)
  const filtered = ordered.filter(
    (cat) =>
      reordering ||
      (normalizeCategoryName(cat.name).includes(term) &&
        (filter === "all" ||
          (filter === "empty" ? !counts.get(cat.id)?.total : !!counts.get(cat.id)?.active))),
  )
  const changed = draftOrder?.some((id, index) => id !== categories[index]?.id) ?? false
  const distribution = [...categories]
    .sort((a, b) => (counts.get(b.id)?.total ?? 0) - (counts.get(a.id)?.total ?? 0))
    .slice(0, 5)
  const blockedCount = deleting ? (counts.get(deleting.id)?.total ?? 0) : 0

  function remember(event: MouseEvent<HTMLButtonElement>) {
    returnTarget.current = event.currentTarget
  }
  function returnFocus() {
    ;(returnTarget.current?.isConnected ? returnTarget.current : heading.current)?.focus()
  }
  function startOrder() {
    setDraftOrder(categories.map((cat) => cat.id))
    setOrderError("")
    setQuery("")
    setFilter("all")
  }
  function move(id: string, offset: number) {
    if (orderLock.current || !draftOrder) return
    const index = draftOrder.indexOf(id)
    const target = index + offset
    if (target < 0 || target >= draftOrder.length) return
    const next = [...draftOrder]
    ;[next[index], next[target]] = [next[target], next[index]]
    setDraftOrder(next)
    setAnnouncement(`${byId.get(id)?.name} movida para a posição ${target + 1}.`)
    setOrderError("")
  }
  async function saveOrder() {
    if (!draftOrder || !changed || orderLock.current) return
    orderLock.current = true
    setOrderBusy(true)
    setOrderError("")
    try {
      await reorderCategories(draftOrder)
      setDraftOrder(null)
      setAnnouncement("Ordem salva.")
      heading.current?.focus()
      toast.success("Ordem das categorias atualizada.")
    } catch (cause) {
      setOrderError(
        cause instanceof Error ? cause.message : "Não foi possível salvar a ordem. Tente novamente.",
      )
    } finally {
      orderLock.current = false
      setOrderBusy(false)
    }
  }
  async function confirmDelete() {
    if (!deleting || blockedCount || deleteLock.current) return
    deleteLock.current = true
    setDeleteBusy(true)
    setDeleteError("")
    try {
      await deleteCategory(deleting.id)
      setDeleting(null)
      toast.success("Categoria excluída.")
    } catch (cause) {
      setDeleteError(cause instanceof Error ? cause.message : "Não foi possível excluir a categoria.")
    } finally {
      deleteLock.current = false
      setDeleteBusy(false)
    }
  }

  return (
    <div className="categories-section flex flex-col gap-6">
      <header className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="mb-2 text-[10px] font-semibold uppercase tracking-[0.2em] text-primary">
            Organização do cardápio
          </p>
          <h1
            ref={heading}
            tabIndex={-1}
            className="font-display text-3xl font-bold tracking-tight outline-none sm:text-4xl"
          >
            Categorias<span className="text-primary">.</span>
          </h1>
          <p className="mt-2 max-w-xl text-sm leading-relaxed text-muted-foreground">
            Dê forma ao seu cardápio. Organize os produtos e defina o que vem primeiro.
          </p>
        </div>
        <button
          disabled={reordering}
          onClick={(event) => {
            remember(event)
            setEditor(null)
          }}
          className={`${primary} shrink-0`}
        >
          <Plus aria-hidden="true" className="h-4 w-4" />
          Nova categoria
        </button>
      </header>

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4 lg:gap-4">
        {[
          {
            label: "Categorias",
            value: categories.length,
            detail: "Grupos cadastrados",
            Icon: Layers3,
            tone: "bg-primary/10 text-primary",
          },
          {
            label: "No cardápio",
            value: visibleCount,
            detail: "Com produtos ativos",
            Icon: Eye,
            tone: "bg-emerald-400/10 text-emerald-300",
          },
          {
            label: "Produtos",
            value: totalProducts,
            detail: "Itens organizados",
            Icon: Package,
            tone: "bg-sky-400/10 text-sky-300",
          },
          {
            label: "Sem produtos",
            value: emptyCount,
            detail: "Prontas para preencher",
            Icon: Layers3,
            tone: "bg-violet-400/10 text-violet-300",
          },
        ].map(({ label, value, detail, Icon, tone }) => (
          <div key={label} className="dashboard-panel rounded-2xl border border-border bg-card p-4 sm:p-5">
            <div className="flex items-center justify-between gap-2">
              <p className="text-xs text-muted-foreground">{label}</p>
              <span className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-lg ${tone}`}>
                <Icon aria-hidden="true" className="h-4 w-4" />
              </span>
            </div>
            <p className="mt-3 font-display text-3xl font-bold tabular-nums">{value}</p>
            <p className="mt-1 text-[11px] leading-relaxed text-muted-foreground">{detail}</p>
          </div>
        ))}
      </div>

      <div className="grid items-start gap-6 xl:grid-cols-[minmax(0,1fr)_300px]">
        <section
          className="min-w-0 overflow-hidden rounded-2xl border border-border bg-card"
          aria-labelledby="category-list-heading"
        >
          <header className="flex flex-wrap items-center justify-between gap-3 border-b border-border p-4 sm:p-5">
            <div>
              <h2 id="category-list-heading" className="font-display text-lg font-bold">
                {reordering ? "Ajuste a sequência" : "Suas categorias"}
              </h2>
              <p className="mt-1 text-xs text-muted-foreground">
                {reordering
                  ? "Use as setas e salve quando estiver pronto."
                  : "A sequência abaixo define a ordem no cardápio."}
              </p>
            </div>
            {!reordering && (
              <button disabled={categories.length < 2} onClick={startOrder} className={action}>
                <ArrowUpDown aria-hidden="true" className="h-4 w-4" />
                Reordenar
              </button>
            )}
            {reordering && (
              <span className="rounded-full border border-primary/20 bg-primary/10 px-2.5 py-1 text-[10px] font-semibold text-primary">
                Modo de reordenação
              </span>
            )}
          </header>
          {reordering ? (
            <div className="space-y-3 border-b border-border bg-primary/[0.04] p-4 sm:px-5">
              <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <p role="status" className="text-xs leading-relaxed text-muted-foreground">
                  {changed ? "Você tem uma nova ordem para salvar." : "A ordem atual ainda não foi alterada."}
                </p>
                <div className="grid grid-cols-2 gap-2 sm:flex">
                  <button
                    disabled={orderBusy}
                    onClick={() => {
                      setDraftOrder(null)
                      setOrderError("")
                      setAnnouncement("Reordenação cancelada. A ordem original foi mantida.")
                      heading.current?.focus()
                    }}
                    className={action}
                  >
                    Cancelar
                  </button>
                  <button
                    disabled={!changed || orderBusy}
                    onClick={saveOrder}
                    className={`${primary} text-xs`}
                  >
                    {orderBusy ? (
                      <Loader2 aria-hidden="true" className="h-4 w-4 animate-spin" />
                    ) : (
                      <Check aria-hidden="true" className="h-4 w-4" />
                    )}
                    {orderBusy ? "Salvando…" : "Salvar ordem"}
                  </button>
                </div>
              </div>
              {orderError && (
                <p role="alert" className="flex items-start gap-2 text-xs leading-relaxed text-red-300">
                  <CircleAlert aria-hidden="true" className="mt-0.5 h-4 w-4 shrink-0" />
                  {orderError}
                </p>
              )}
            </div>
          ) : (
            <div className="flex flex-col gap-3 border-b border-border p-4 sm:flex-row sm:px-5">
              <div className="relative min-w-0 flex-1">
                <Search
                  aria-hidden="true"
                  className="pointer-events-none absolute left-3.5 top-3.5 h-4 w-4 text-muted-foreground"
                />
                <input
                  ref={search}
                  aria-label="Buscar categorias"
                  value={query}
                  onChange={(event) => setQuery(event.target.value)}
                  placeholder="Buscar categoria…"
                  className="min-h-11 w-full min-w-0 rounded-xl border border-border bg-background pl-10 pr-10 text-sm placeholder:text-muted-foreground"
                />
                {query && (
                  <button
                    aria-label="Limpar busca"
                    onClick={() => {
                      setQuery("")
                      search.current?.focus()
                    }}
                    className="absolute right-0 top-0 flex h-11 w-10 items-center justify-center rounded-xl text-muted-foreground hover:text-foreground"
                  >
                    <X aria-hidden="true" className="h-4 w-4" />
                  </button>
                )}
              </div>
              <select
                aria-label="Filtrar categorias"
                value={filter}
                onChange={(event) => setFilter(event.target.value)}
                className="min-h-11 min-w-0 rounded-xl border border-border bg-background px-3 text-xs sm:max-w-[190px]"
              >
                <option value="all">Todas as categorias</option>
                <option value="visible">Com produtos ativos</option>
                <option value="empty">Sem produtos</option>
              </select>
            </div>
          )}
          <p className="sr-only" role="status" aria-live="polite">
            {announcement}
          </p>
          <ol className="divide-y divide-border" aria-label="Ordem das categorias">
            {filtered.map((cat) => {
              const index = ordered.findIndex((value) => value.id === cat.id)
              const count = counts.get(cat.id) ?? { total: 0, active: 0 }
              const visual = categoryVisual(cat.icon)
              const percent = count.total ? Math.round((count.active / count.total) * 100) : 0
              return (
                <li
                  key={cat.id}
                  className={`group p-4 transition-colors sm:p-5 ${reordering ? "bg-primary/[0.02]" : "hover:bg-secondary/20"}`}
                >
                  <div className="flex min-w-0 items-start gap-3 sm:gap-4">
                    <span className="mt-4 hidden w-5 shrink-0 text-[11px] font-medium tabular-nums text-muted-foreground sm:block">
                      {String(index + 1).padStart(2, "0")}
                    </span>
                    <span
                      className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-xl ${visual.tone}`}
                    >
                      <CategoryIcon icon={cat.icon} className="h-6 w-6" />
                    </span>
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
                        <h3 className="min-w-0 max-w-full break-words text-sm font-semibold sm:text-base">
                          {cat.name}
                        </h3>
                        <span
                          className={`inline-flex items-center gap-1.5 rounded-full px-2 py-1 text-[9px] font-medium ${count.active ? "bg-emerald-400/10 text-emerald-300" : "bg-secondary text-muted-foreground"}`}
                        >
                          <span
                            className={`h-1.5 w-1.5 rounded-full ${count.active ? "bg-emerald-400" : "bg-muted-foreground"}`}
                          />
                          {count.active ? "No cardápio" : "Sem produtos ativos"}
                        </span>
                      </div>
                      <p className="mt-1.5 text-xs text-muted-foreground">
                        {plural(count.total, "produto")}
                        <span className="px-1.5 text-border">·</span>
                        {plural(count.active, "ativo")}
                        <span className="px-1.5 text-border">·</span>
                        {plural(count.total - count.active, "pausado")}
                      </p>
                      <div className="mt-3 flex items-center gap-2">
                        <div
                          className="h-1 flex-1 overflow-hidden rounded-full bg-secondary"
                          aria-hidden="true"
                        >
                          <div
                            className={`h-full rounded-full ${visual.bar}`}
                            style={{ width: `${percent}%` }}
                          />
                        </div>
                        <span className="shrink-0 text-[10px] tabular-nums text-muted-foreground">
                          {percent}% ativos
                        </span>
                      </div>
                    </div>
                  </div>
                  <div className="mt-4 flex items-center justify-between gap-2 pl-[60px] sm:pl-[89px]">
                    <span className="text-[10px] text-muted-foreground">
                      Posição {String(index + 1).padStart(2, "0")}
                    </span>
                    <div className="flex items-center gap-2">
                      {reordering ? (
                        <>
                          <button
                            disabled={orderBusy || index === 0}
                            aria-label={`Mover ${cat.name} para cima`}
                            onClick={() => move(cat.id, -1)}
                            className={`${action} w-11 px-0`}
                          >
                            <ArrowUp aria-hidden="true" className="h-4 w-4" />
                          </button>
                          <button
                            disabled={orderBusy || index === ordered.length - 1}
                            aria-label={`Mover ${cat.name} para baixo`}
                            onClick={() => move(cat.id, 1)}
                            className={`${action} w-11 px-0`}
                          >
                            <ArrowDown aria-hidden="true" className="h-4 w-4" />
                          </button>
                        </>
                      ) : (
                        <>
                          <button
                            aria-label={`Editar ${cat.name}`}
                            onClick={(event) => {
                              remember(event)
                              setEditor(cat)
                            }}
                            className={`${action} px-2.5 sm:px-3`}
                          >
                            <Pencil aria-hidden="true" className="h-3.5 w-3.5" />
                            <span className="hidden sm:inline">Editar</span>
                          </button>
                          <button
                            aria-label={`Excluir ${cat.name}`}
                            onClick={(event) => {
                              remember(event)
                              setDeleting(cat)
                              setDeleteError("")
                            }}
                            className={`${action} w-11 px-0 hover:border-red-400/30 hover:bg-red-400/10 hover:text-red-300`}
                          >
                            <Trash2 aria-hidden="true" className="h-3.5 w-3.5" />
                          </button>
                        </>
                      )}
                    </div>
                  </div>
                </li>
              )
            })}
          </ol>
          {!filtered.length && (
            <div className="flex flex-col items-center px-5 py-12 text-center">
              <span className="flex h-14 w-14 items-center justify-center rounded-2xl bg-secondary">
                <Layers3 aria-hidden="true" className="h-6 w-6 text-muted-foreground" />
              </span>
              <h3 className="mt-4 text-base font-semibold">
                {categories.length ? "Nenhuma categoria encontrada" : "Comece a organizar seu cardápio"}
              </h3>
              <p className="mt-2 max-w-xs text-xs leading-relaxed text-muted-foreground">
                {categories.length
                  ? "Tente outro nome ou ajuste o filtro para ver mais resultados."
                  : "Crie a primeira categoria e depois adicione seus produtos."}
              </p>
              <button
                onClick={(event) => {
                  if (categories.length) {
                    setQuery("")
                    setFilter("all")
                    search.current?.focus()
                  } else {
                    remember(event)
                    setEditor(null)
                  }
                }}
                className={`${categories.length ? action : primary} mt-5`}
              >
                {categories.length ? "Limpar filtros" : "Criar primeira categoria"}
              </button>
            </div>
          )}
          <footer
            className="border-t border-border px-4 py-3 text-[11px] text-muted-foreground sm:px-5"
            role="status"
          >
            {filtered.length === categories.length
              ? plural(categories.length, "categoria")
              : `${filtered.length} de ${plural(categories.length, "categoria")}`}
            {reordering ? " · prévia da nova sequência" : " · ordenadas como no cardápio"}
          </footer>
        </section>

        <aside className="grid min-w-0 gap-4 md:grid-cols-2 xl:sticky xl:top-6 xl:grid-cols-1">
          <section
            className="min-w-0 rounded-2xl border border-border bg-card p-5"
            aria-labelledby="category-preview-heading"
          >
            <div className="flex items-center gap-2 text-primary">
              <Smartphone aria-hidden="true" className="h-4 w-4" />
              <span className="text-[10px] font-semibold uppercase tracking-[0.15em]">Visão do cliente</span>
            </div>
            <h2 id="category-preview-heading" className="mt-3 font-display text-lg font-bold">
              Um cardápio organizado
            </h2>
            <p className="mt-2 text-xs leading-relaxed text-muted-foreground">
              {reordering
                ? "Acompanhe como a nova sequência ficará depois de salvar."
                : "Seus clientes navegam pelas categorias nesta sequência."}
            </p>
            <div className="mt-5 overflow-hidden rounded-xl border border-border bg-background p-3">
              <div className="mb-3 flex gap-1.5" aria-hidden="true">
                <span className="h-1.5 w-1.5 rounded-full bg-border" />
                <span className="h-1.5 w-1.5 rounded-full bg-border" />
                <span className="h-1.5 w-1.5 rounded-full bg-border" />
              </div>
              <div className="flex gap-2 overflow-x-auto pb-2" aria-label="Prévia das abas do cardápio">
                {ordered
                  .filter((cat) => counts.get(cat.id)?.active)
                  .map((cat, index) => (
                    <span
                      key={cat.id}
                      className={`flex shrink-0 items-center gap-1.5 rounded-lg border px-2.5 py-2 text-[10px] font-semibold ${index === 0 ? "border-primary bg-primary text-primary-foreground" : "border-border text-muted-foreground"}`}
                    >
                      <CategoryIcon icon={cat.icon} className="h-3 w-3" />
                      {cat.name}
                    </span>
                  ))}
                {!visibleCount && (
                  <span className="text-xs leading-relaxed text-muted-foreground">
                    As categorias aparecem aqui quando têm produtos ativos.
                  </span>
                )}
              </div>
              {ordered
                .filter((cat) => counts.get(cat.id)?.active)
                .slice(0, 3)
                .map((cat) => (
                  <div
                    key={cat.id}
                    className="mt-3 flex min-w-0 items-center gap-2.5 rounded-lg bg-card p-2.5"
                  >
                    <span
                      className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-lg ${categoryVisual(cat.icon).tone}`}
                    >
                      <CategoryIcon icon={cat.icon} className="h-4 w-4" />
                    </span>
                    <div className="min-w-0 flex-1">
                      <p className="break-words text-[11px] font-semibold">{cat.name}</p>
                      <p className="mt-0.5 text-[9px] text-muted-foreground">
                        {plural(counts.get(cat.id)?.active ?? 0, "produto")}{" "}
                        {counts.get(cat.id)?.active === 1 ? "ativo" : "ativos"}
                      </p>
                    </div>
                  </div>
                ))}
            </div>
            <p className="mt-3 flex items-start gap-1.5 text-[10px] leading-relaxed text-muted-foreground">
              <Eye aria-hidden="true" className="mt-0.5 h-3 w-3 shrink-0" />A prévia mostra apenas categorias
              com produtos ativos.
            </p>
            <a href="/" target="_blank" rel="noopener noreferrer" className={`${action} mt-4 w-full`}>
              Visualizar loja<span className="sr-only"> (abre em nova aba)</span>
              <ArrowUpRight aria-hidden="true" className="h-4 w-4" />
            </a>
          </section>
          <section
            className="rounded-2xl border border-border bg-card p-5"
            aria-labelledby="category-distribution-heading"
          >
            <h2 id="category-distribution-heading" className="font-display text-base font-bold">
              Distribuição de produtos
            </h2>
            <p className="mt-1 text-xs text-muted-foreground">
              {plural(totalProducts, "produto")} no seu catálogo
            </p>
            <div className="mt-5 space-y-4">
              {distribution.map((cat) => {
                const total = counts.get(cat.id)?.total ?? 0
                const percentage = totalProducts ? Math.round((total / totalProducts) * 100) : 0
                return (
                  <div key={cat.id}>
                    <div className="mb-2 flex items-center justify-between gap-3 text-xs">
                      <span className="min-w-0 truncate text-muted-foreground">{cat.name}</span>
                      <span className="shrink-0 tabular-nums">
                        {total}
                        <span className="ml-2 text-[10px] text-muted-foreground">{percentage}%</span>
                      </span>
                    </div>
                    <div className="h-1.5 overflow-hidden rounded-full bg-secondary" aria-hidden="true">
                      <div
                        className={`h-full rounded-full ${categoryVisual(cat.icon).bar}`}
                        style={{ width: `${percentage}%` }}
                      />
                    </div>
                  </div>
                )
              })}
              {!categories.length && (
                <p className="text-xs leading-relaxed text-muted-foreground">
                  As categorias criadas aparecerão aqui.
                </p>
              )}
            </div>
            {categories.length > 5 && (
              <p className="mt-4 text-[10px] text-muted-foreground">
                Mostrando as 5 categorias com mais produtos.
              </p>
            )}
            <div className="mt-5 flex items-start gap-2.5 border-t border-border pt-4">
              <ShieldCheck aria-hidden="true" className="mt-0.5 h-4 w-4 shrink-0 text-emerald-300" />
              <p className="text-[11px] leading-relaxed text-muted-foreground">
                Seus produtos estão protegidos: apenas categorias vazias podem ser excluídas.
              </p>
            </div>
          </section>
        </aside>
      </div>

      {editor !== undefined && (
        <CategoryEditor
          category={editor}
          categories={categories}
          onClose={() => setEditor(undefined)}
          onReturnFocus={returnFocus}
          onSave={async (category) => {
            if (editor) await updateCategory(category.id, { name: category.name, icon: category.icon })
            else await addCategory(category)
            setEditor(undefined)
            toast.success(editor ? "Categoria atualizada." : "Categoria criada.")
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
          <span
            className={`flex h-12 w-12 items-center justify-center rounded-xl ${blockedCount ? "bg-primary/10 text-primary" : "bg-red-400/10 text-red-300"}`}
          >
            {blockedCount ? (
              <ShieldCheck aria-hidden="true" className="h-6 w-6" />
            ) : (
              <Trash2 aria-hidden="true" className="h-6 w-6" />
            )}
          </span>
          <AlertDialogTitle>
            {blockedCount ? "Esta categoria tem produtos" : "Excluir categoria?"}
          </AlertDialogTitle>
          <AlertDialogDescription className="break-words leading-relaxed">
            {blockedCount
              ? `“${deleting?.name}” contém ${plural(blockedCount, "produto")}. No Cardápio, edite esses produtos e escolha outra categoria antes de excluir.`
              : `“${deleting?.name}” está vazia e será excluída permanentemente. Esta ação não pode ser desfeita.`}
          </AlertDialogDescription>
          {deleteError && (
            <p role="alert" className="text-sm text-red-300">
              {deleteError}
            </p>
          )}
          <div className={blockedCount ? "flex justify-end" : "grid grid-cols-2 gap-3"}>
            <AlertDialogCancel
              disabled={deleteBusy}
              className="m-0 min-h-11 rounded-xl border-border bg-transparent text-xs"
            >
              {blockedCount ? "Entendi" : "Cancelar"}
            </AlertDialogCancel>
            {!blockedCount && (
              <button
                disabled={deleteBusy}
                onClick={confirmDelete}
                className="flex min-h-11 items-center justify-center gap-2 rounded-xl bg-destructive px-2 text-xs font-semibold text-destructive-foreground disabled:opacity-40"
              >
                {deleteBusy && <Loader2 aria-hidden="true" className="h-4 w-4 animate-spin" />}
                {deleteBusy ? "Excluindo…" : "Excluir categoria"}
              </button>
            )}
          </div>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}
