"use client"

import { useEffect, useRef, useState, type MouseEvent } from "react"
import Link from "next/link"
import {
  ArrowLeft,
  ArrowUpRight,
  Check,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  CircleAlert,
  Layers3,
  Loader2,
  PackageCheck,
  Plus,
  Printer,
  RefreshCw,
  Search,
  ShoppingBag,
  Store,
  X,
} from "lucide-react"
import { toast } from "sonner"
import { useAdmin } from "@/lib/admin-context"
import { menuMoney, menuPrice } from "@/lib/admin-menu"
import {
  counterAdd,
  counterAvailable,
  counterCash,
  counterProducts,
  counterQuantity,
  counterTotal,
  counterUnits,
  type CounterCartItem,
} from "@/lib/counter"
import { paymentKind } from "@/lib/payment-methods"
import { orderCode, orderStatus, type AdminOrder } from "@/lib/admin-orders"
import { printOrderThermal } from "@/lib/thermal-print"
import type { MenuItem, MenuItemVariant } from "@/lib/store-data"
import { Dialog, DialogContent, DialogDescription, DialogTitle } from "@/components/ui/dialog"
import {
  AlertDialog,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog"
import { CategoryIcon } from "@/components/admin/category-visual"
import { MenuProductImage } from "@/components/admin/menu-product-image"
import { CounterOrderPanel } from "@/components/admin/counter-order-panel"
import { CounterVariantDialog } from "@/components/admin/counter-variant-dialog"

const primary =
  "flex min-h-11 items-center justify-center gap-2 rounded-xl bg-primary px-4 text-sm font-semibold text-primary-foreground hover:bg-primary/90 disabled:opacity-40"
const control =
  "orders-button flex min-h-11 items-center justify-center gap-2 rounded-xl border border-border px-3 text-xs font-semibold disabled:opacity-30"
const pageSize = 12
export default function BalcaoPage() {
  const { store, categories, menuItems, loading, error: dataError, refresh } = useAdmin()
  const [authenticated, setAuthenticated] = useState(false)
  const [hydrated, setHydrated] = useState(false)
  const [cart, setCart] = useState<CounterCartItem[]>([])
  const [query, setQuery] = useState("")
  const [category, setCategory] = useState("")
  const [page, setPage] = useState(1)
  const [customerName, setCustomerName] = useState("")
  const [selectedPayment, setSelectedPayment] = useState("")
  const [cash, setCash] = useState("")
  const [busy, setBusy] = useState(false)
  const [submitError, setSubmitError] = useState("")
  const [variantItem, setVariantItem] = useState<MenuItem | null>(null)
  const [mobileCart, setMobileCart] = useState(false)
  const [clearOpen, setClearOpen] = useState(false)
  const [leaveTarget, setLeaveTarget] = useState<string | null>(null)
  const [receipt, setReceipt] = useState<AdminOrder | null>(null)
  const submitLock = useRef(false)
  const allowNavigation = useRef(false)
  const request = useRef<{ signature: string; id: string } | null>(null)
  const search = useRef<HTMLInputElement>(null)
  const heading = useRef<HTMLHeadingElement>(null)
  const mobileTitle = useRef<HTMLHeadingElement>(null)
  const returnTarget = useRef<HTMLElement | null>(null)
  const mobileTrigger = useRef<HTMLButtonElement>(null)
  const methods = store.paymentMethods
  const payment = methods.includes(selectedPayment) ? selectedPayment : (methods[0] ?? "")
  const products = menuItems.filter(counterAvailable)
  const activeCategory = categories.some((entry) => entry.id === category) ? category : ""
  const filtered = counterProducts(menuItems, categories, query, activeCategory)
  const pages = Math.max(1, Math.ceil(filtered.length / pageSize))
  const currentPage = Math.min(page, pages)
  const visible = filtered.slice((currentPage - 1) * pageSize, currentPage * pageSize)
  const total = counterTotal(cart)
  const units = counterUnits(cart)
  const dirty = !!cart.length || !!customerName.trim() || !!cash.trim()
  useEffect(() => {
    setAuthenticated(localStorage.getItem("rs-admin-auth") === "true")
    setHydrated(true)
  }, [])
  useEffect(() => {
    if (!dirty && !busy) return
    const guard = (event: BeforeUnloadEvent) => {
      if (allowNavigation.current) return
      event.preventDefault()
      event.returnValue = ""
    }
    window.addEventListener("beforeunload", guard)
    return () => window.removeEventListener("beforeunload", guard)
  }, [dirty, busy])
  useEffect(() => {
    const media = window.matchMedia("(min-width: 1024px)")
    const changed = () => {
      if (media.matches) setMobileCart(false)
    }
    media.addEventListener("change", changed)
    return () => media.removeEventListener("change", changed)
  }, [])
  useEffect(() => {
    const shortcut = (event: KeyboardEvent) => {
      const target = event.target as HTMLElement
      if (
        event.key === "/" &&
        !event.ctrlKey &&
        !event.metaKey &&
        !event.altKey &&
        !target.closest("input, textarea, select, [contenteditable='true']") &&
        !document.querySelector("[role='dialog'], [role='alertdialog']")
      ) {
        event.preventDefault()
        search.current?.focus()
      }
    }
    window.addEventListener("keydown", shortcut)
    return () => window.removeEventListener("keydown", shortcut)
  }, [])
  function restoreFocus() {
    const target = returnTarget.current
    ;(target?.isConnected && target.getClientRects().length && !target.hasAttribute("disabled")
      ? target
      : (search.current ?? heading.current)
    )?.focus()
  }
  function add(item: MenuItem, variant?: MenuItemVariant) {
    if (submitLock.current) return
    setCart((previous) => {
      const next = counterAdd(previous, item, variant)
      return next
    })
    const existing = cart.find((line) => line.itemId === item.id && line.variantId === variant?.id)
    if (existing && existing.quantity >= 99) {
      toast.error("O limite é de 99 unidades por item.")
      return
    }
    if (!existing && cart.length >= 50) {
      toast.error("O limite é de 50 itens diferentes por pedido.")
      return
    }
    setSubmitError("")
    setVariantItem(null)
    toast.success(`${item.name}${variant ? ` · ${variant.name}` : ""} adicionado`, { duration: 1400 })
  }
  function choose(event: MouseEvent<HTMLButtonElement>, item: MenuItem) {
    if (submitLock.current) return
    returnTarget.current = event.currentTarget
    if (item.variants?.length) setVariantItem(item)
    else add(item)
  }
  function resetOrder() {
    setCart([])
    setCustomerName("")
    setCash("")
    setSubmitError("")
    request.current = null
  }
  function goPage(next: number) {
    setPage(next)
    requestAnimationFrame(() =>
      document.getElementById("counter-catalog-title")?.scrollIntoView({ block: "start" }),
    )
  }
  function navigate(event: MouseEvent<HTMLAnchorElement>, url: string) {
    if (event.ctrlKey || event.metaKey || event.shiftKey || event.altKey) return
    if (submitLock.current) {
      event.preventDefault()
      return
    }
    if (dirty) {
      event.preventDefault()
      returnTarget.current = event.currentTarget
      setLeaveTarget(url)
    }
  }
  async function finish() {
    if (submitLock.current || !cart.length || !payment) return
    const amount = paymentKind(payment) === "cash" && cash.trim() ? counterCash(cash) : null
    if (
      paymentKind(payment) === "cash" &&
      cash.trim() &&
      (amount === null || Math.round(amount * 100) < Math.round(total * 100))
    ) {
      setSubmitError("Confira o valor recebido para calcular o troco.")
      return
    }
    const payload = {
      name: customerName.trim() || "Cliente",
      paymentMethod: payment,
      changeFor: amount === null ? null : amount.toFixed(2),
      items: cart.map((line) => ({
        itemId: line.itemId,
        variantId: line.variantId,
        price: line.price,
        quantity: line.quantity,
      })),
    }
    const signature = JSON.stringify(payload)
    if (request.current?.signature !== signature) request.current = { signature, id: crypto.randomUUID() }
    submitLock.current = true
    setBusy(true)
    setSubmitError("")
    try {
      const response = await fetch("/api/orders/balcao", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...payload, requestId: request.current.id }),
        signal: AbortSignal.timeout(30000),
      })
      const result = await response.json().catch(() => null)
      if (!response.ok)
        throw new Error(
          result?.error || "Não foi possível confirmar o pedido. Tente novamente com a mesma seleção.",
        )
      if (!result?.id || !Array.isArray(result.items))
        throw new Error("Não foi possível confirmar a resposta. Tente novamente com a mesma seleção.")
      resetOrder()
      setMobileCart(false)
      setReceipt(result as AdminOrder)
    } catch (cause) {
      setSubmitError(
        cause instanceof Error && !["TypeError", "TimeoutError"].includes(cause.name)
          ? cause.message
          : "Não foi possível confirmar o pedido. Confira a conexão e tente novamente.",
      )
    } finally {
      submitLock.current = false
      setBusy(false)
    }
  }
  const panel = (prefix: string) => (
    <CounterOrderPanel
      prefix={prefix}
      compact={prefix === "counter-mobile"}
      cart={cart}
      customerName={customerName}
      paymentMethod={payment}
      paymentMethods={methods}
      cash={cash}
      busy={busy}
      error={submitError}
      onName={(value) => {
        setCustomerName(value)
        setSubmitError("")
      }}
      onPayment={(value) => {
        setSelectedPayment(value)
        setCash("")
        setSubmitError("")
      }}
      onCash={(value) => {
        setCash(value)
        setSubmitError("")
      }}
      onQuantity={(id, delta) => {
        if (!submitLock.current) {
          setCart((previous) => counterQuantity(previous, id, delta))
          setSubmitError("")
        }
      }}
      onRemove={(id) => {
        if (!submitLock.current) {
          setCart((previous) => previous.filter((line) => line.id !== id))
          setSubmitError("")
        }
      }}
      onClear={() => {
        if (!submitLock.current) setClearOpen(true)
      }}
      onFinish={finish}
    />
  )
  const intro = (
    <div className="mb-6 flex flex-col justify-between gap-4 sm:flex-row sm:items-end">
      <div>
        <p className="mb-2 text-[10px] font-semibold uppercase tracking-[0.18em] text-primary">
          Um bom atendimento começa aqui
        </p>
        <h1
          ref={heading}
          tabIndex={-1}
          className="font-display text-3xl font-bold tracking-tight outline-none sm:text-4xl"
        >
          Balcão<span className="text-primary">.</span>
        </h1>
        <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
          Escolha os produtos, confira o pedido e registre o atendimento.
        </p>
      </div>
      <Link
        href="/admin?section=orders"
        onClick={(event) => navigate(event, "/admin?section=orders")}
        className={`${control} shrink-0 self-start sm:self-auto`}
      >
        <PackageCheck aria-hidden="true" className="h-4 w-4" />
        Acompanhar pedidos
        <ArrowUpRight aria-hidden="true" className="h-3.5 w-3.5" />
      </Link>
    </div>
  )
  if (!hydrated)
    return (
      <div className="admin-workspace flex min-h-screen items-center justify-center bg-background">
        <Loader2 aria-label="Carregando balcão" className="h-7 w-7 animate-spin text-primary" />
      </div>
    )
  if (!authenticated)
    return (
      <div className="admin-workspace flex min-h-screen flex-col items-center justify-center gap-4 bg-background p-6 text-center">
        <Store aria-hidden="true" className="h-10 w-10 text-primary" />
        <h1 className="font-display text-2xl font-bold">Acesso ao balcão</h1>
        <p className="text-sm text-muted-foreground">Entre no painel para registrar os pedidos da loja.</p>
        <Link href="/admin" className={primary}>
          <ArrowLeft aria-hidden="true" className="h-4 w-4" />
          Ir para o painel
        </Link>
      </div>
    )
  return (
    <div className="admin-workspace counter-workspace min-h-screen bg-background pb-28 lg:pb-0">
      <a
        href="#counter-main"
        className="sr-only z-50 rounded-xl bg-primary p-3 text-primary-foreground focus:not-sr-only focus:fixed focus:left-4 focus:top-4"
      >
        Pular para o catálogo
      </a>
      <header className="sticky top-0 z-20 border-b border-border bg-background/95 backdrop-blur-md">
        <div className="mx-auto flex min-h-[72px] max-w-[1600px] items-center justify-between gap-3 px-4 sm:px-6 lg:px-8">
          <div className="flex min-w-0 items-center gap-3">
            <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-primary/20 bg-primary/10 text-primary">
              <Store aria-hidden="true" className="h-5 w-5" />
            </span>
            <div className="min-w-0">
              <p className="truncate text-sm font-semibold">{store.name || "Rei dos Salgados"}</p>
              <p className="mt-1 text-[10px] uppercase tracking-[0.14em] text-muted-foreground">
                Atendimento no balcão
              </p>
            </div>
          </div>
          <Link
            href="/admin"
            onClick={(event) => navigate(event, "/admin")}
            className={`${control} shrink-0`}
          >
            <ArrowLeft aria-hidden="true" className="h-4 w-4" />
            <span className="hidden sm:inline">Voltar ao painel</span>
            <span className="sm:hidden">Painel</span>
          </Link>
        </div>
      </header>
      <main id="counter-main" className="mx-auto max-w-[1600px] p-4 sm:p-6 lg:p-8">
        {(dataError || loading) && intro}
        {dataError ? (
          <div role="alert" className="rounded-2xl border border-red-400/20 bg-card p-6">
            <CircleAlert aria-hidden="true" className="mb-3 h-6 w-6 text-red-300" />
            <h2 className="font-semibold">Não foi possível carregar o cardápio</h2>
            <p className="mt-2 text-sm text-muted-foreground">
              Tente novamente para continuar o atendimento.
            </p>
            <button onClick={() => void refresh()} className={`${primary} mt-4`}>
              <RefreshCw aria-hidden="true" className="h-4 w-4" />
              Tentar novamente
            </button>
          </div>
        ) : loading ? (
          <div role="status" className="rounded-2xl border border-border bg-card p-8 text-center">
            <Loader2 aria-hidden="true" className="mx-auto mb-3 h-6 w-6 animate-spin text-primary" />
            <p className="text-sm text-muted-foreground">Carregando produtos e formas de pagamento…</p>
          </div>
        ) : (
          <div className="grid min-w-0 items-start gap-6 lg:grid-cols-[minmax(0,1fr)_360px] xl:grid-cols-[minmax(0,1fr)_390px]">
            <section className="min-w-0" aria-labelledby="counter-catalog-title">
              {intro}
              <div className="dashboard-panel mb-5 rounded-2xl border border-border bg-card p-4 sm:p-5">
                <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
                  <div className="flex items-center gap-2">
                    <Layers3 aria-hidden="true" className="h-4 w-4 text-primary" />
                    <h2 id="counter-catalog-title" className="scroll-mt-24 text-sm font-semibold">
                      Catálogo de produtos
                    </h2>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="text-[11px] tabular-nums text-muted-foreground">
                      {products.length} disponíveis
                    </span>
                    <button
                      onClick={() => void refresh()}
                      disabled={busy}
                      className="orders-button flex h-11 w-11 items-center justify-center rounded-xl text-muted-foreground disabled:opacity-30"
                      aria-label="Atualizar cardápio"
                    >
                      <RefreshCw aria-hidden="true" className="h-4 w-4" />
                    </button>
                  </div>
                </div>
                <div className="relative">
                  <Search
                    aria-hidden="true"
                    className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground"
                  />
                  <label htmlFor="counter-search" className="sr-only">
                    Buscar produto
                  </label>
                  <input
                    ref={search}
                    id="counter-search"
                    value={query}
                    onChange={(event) => {
                      setQuery(event.target.value)
                      setPage(1)
                    }}
                    placeholder="Buscar produto, sabor ou categoria…"
                    className="min-h-12 w-full min-w-0 rounded-xl border border-border bg-background pl-10 pr-12 text-base sm:text-sm"
                  />
                  {query ? (
                    <button
                      onClick={() => {
                        setQuery("")
                        setPage(1)
                        search.current?.focus()
                      }}
                      aria-label="Limpar busca"
                      className="orders-button absolute right-1 top-1/2 flex h-11 w-11 -translate-y-1/2 items-center justify-center rounded-lg"
                    >
                      <X aria-hidden="true" className="h-4 w-4" />
                    </button>
                  ) : (
                    <kbd
                      aria-hidden="true"
                      className="absolute right-4 top-1/2 hidden -translate-y-1/2 rounded border border-border px-1.5 py-0.5 text-[11px] text-muted-foreground sm:inline"
                    >
                      /
                    </kbd>
                  )}
                </div>
                <div className="mt-4 flex flex-wrap gap-2" aria-label="Filtrar por categoria">
                  <button
                    aria-pressed={!activeCategory}
                    onClick={() => {
                      setCategory("")
                      setPage(1)
                    }}
                    className={`flex min-h-11 items-center gap-2 rounded-xl border px-3 text-xs font-semibold transition-colors ${!activeCategory ? "border-primary/30 bg-primary/10 text-primary" : "border-border text-muted-foreground hover:bg-secondary"}`}
                  >
                    <Layers3 aria-hidden="true" className="h-3.5 w-3.5" />
                    Todos<span className="text-[10px] opacity-70">{products.length}</span>
                  </button>
                  {categories.map((entry) => (
                    <button
                      key={entry.id}
                      aria-pressed={activeCategory === entry.id}
                      onClick={() => {
                        setCategory(entry.id)
                        setPage(1)
                      }}
                      className={`flex min-h-11 min-w-0 items-center gap-2 rounded-xl border px-3 text-left text-xs font-semibold transition-colors ${activeCategory === entry.id ? "border-primary/30 bg-primary/10 text-primary" : "border-border text-muted-foreground hover:bg-secondary"}`}
                    >
                      <CategoryIcon icon={entry.icon} className="h-3.5 w-3.5 shrink-0" />
                      <span className="break-words">{entry.name}</span>
                      <span className="shrink-0 text-[10px] opacity-70">
                        {products.filter((item) => item.category === entry.id).length}
                      </span>
                    </button>
                  ))}
                </div>
              </div>
              <div className="mb-4 flex flex-wrap items-center justify-between gap-2 px-1 text-xs">
                <p className="font-medium">
                  {activeCategory
                    ? categories.find((entry) => entry.id === activeCategory)?.name
                    : "Todos os produtos"}
                </p>
                <span role="status" className="text-[11px] text-muted-foreground" aria-live="polite">
                  {filtered.length} {filtered.length === 1 ? "produto encontrado" : "produtos encontrados"}
                </span>
              </div>
              {visible.length ? (
                <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4">
                  {visible.map((item, index) => {
                    const variants = item.variants?.filter((variant) => variant.available) ?? []
                    const quantity = cart
                      .filter((line) => line.itemId === item.id)
                      .reduce((sum, line) => sum + line.quantity, 0)
                    return (
                      <button
                        key={item.id}
                        disabled={busy}
                        onClick={(event) => choose(event, item)}
                        aria-label={
                          variants.length ? `Escolher opções de ${item.name}` : `Adicionar ${item.name}`
                        }
                        className="group flex min-w-0 flex-col overflow-hidden rounded-2xl border border-border bg-card text-left transition-colors hover:border-primary/40 disabled:opacity-40"
                      >
                        <div className="relative">
                          <MenuProductImage
                            src={item.image}
                            name={item.name}
                            sizes="(max-width: 639px) 45vw, (max-width: 1023px) 30vw, 240px"
                          eager={index < 3}
                            className="aspect-[4/3] w-full"
                            fallback={
                              <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 bg-gradient-to-br from-primary/[0.07] via-secondary/70 to-secondary text-muted-foreground">
                                <span className="flex h-16 w-16 items-center justify-center rounded-2xl border border-primary/10 bg-primary/5 text-primary/60">
                                  <CategoryIcon
                                    icon={
                                      categories.find((entry) => entry.id === item.category)?.icon ??
                                      "package"
                                    }
                                    className="h-7 w-7"
                                  />
                                </span>
                                <span className="text-[10px]">Foto indisponível</span>
                              </div>
                            }
                          />
                          {quantity > 0 && (
                            <span className="absolute left-2 top-2 flex items-center gap-1 rounded-lg bg-primary px-2 py-1 text-[10px] font-bold text-primary-foreground">
                              <Check aria-hidden="true" className="h-3 w-3" />
                              {quantity} no pedido
                            </span>
                          )}
                          {variants.length > 0 && (
                            <span className="absolute bottom-2 left-2 rounded-lg border border-white/10 bg-black/75 px-2 py-1 text-[10px] text-white">
                              {variants.length} {variants.length === 1 ? "opção" : "opções"}
                            </span>
                          )}
                        </div>
                        <div className="flex min-w-0 flex-1 flex-col p-3 sm:p-4">
                          <p className="mb-2 truncate text-[9px] font-medium uppercase tracking-[0.12em] text-muted-foreground">
                            {categories.find((entry) => entry.id === item.category)?.name ?? "Produto"}
                          </p>
                          <h3 className="break-words text-sm font-semibold leading-snug">{item.name}</h3>
                          <p className="mb-4 mt-2 line-clamp-2 text-[11px] leading-relaxed text-muted-foreground">
                            {item.description}
                          </p>
                          <div className="mt-auto flex flex-wrap items-end justify-between gap-2 border-t border-border pt-3">
                            <div>
                              {variants.length > 0 && (
                                <p className="mb-1 text-[9px] text-muted-foreground">A partir de</p>
                              )}
                              <p className="text-sm font-bold tabular-nums text-primary sm:text-base">
                                {menuMoney(menuPrice(item))}
                              </p>
                            </div>
                            <span
                              aria-hidden="true"
                              className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary transition-colors group-hover:bg-primary group-hover:text-primary-foreground"
                            >
                              <Plus className="h-4 w-4" />
                            </span>
                          </div>
                        </div>
                      </button>
                    )
                  })}
                </div>
              ) : (
                <div className="dashboard-panel flex flex-col items-center rounded-2xl border border-dashed border-border bg-card px-5 py-16 text-center">
                  <Search aria-hidden="true" className="mb-4 h-8 w-8 text-muted-foreground" />
                  <h3 className="text-base font-semibold">
                    {products.length ? "Nenhum produto encontrado" : "Nenhum produto disponível"}
                  </h3>
                  <p className="mt-2 max-w-sm text-xs leading-relaxed text-muted-foreground">
                    {products.length
                      ? "Tente outro nome, sabor ou categoria para encontrar o que procura."
                      : "Confira a disponibilidade dos produtos e opções no cardápio do painel."}
                  </p>
                  {products.length > 0 && (
                    <button
                      onClick={() => {
                        setQuery("")
                        setCategory("")
                        setPage(1)
                        search.current?.focus()
                      }}
                      className={`${control} mt-5`}
                    >
                      Limpar filtros
                    </button>
                  )}
                </div>
              )}
              {pages > 1 && (
                <nav
                  aria-label="Páginas de produtos"
                  className="mt-5 flex items-center justify-between gap-3 rounded-xl border border-border bg-card p-3"
                >
                  <button
                    disabled={currentPage <= 1}
                    onClick={() => goPage(currentPage - 1)}
                    aria-label="Página anterior"
                    className={control}
                  >
                    <ChevronLeft aria-hidden="true" className="h-4 w-4" />
                    <span className="hidden sm:inline">Anterior</span>
                  </button>
                  <p className="text-xs tabular-nums text-muted-foreground">
                    {currentPage} de {pages}
                  </p>
                  <button
                    disabled={currentPage >= pages}
                    onClick={() => goPage(currentPage + 1)}
                    aria-label="Próxima página"
                    className={control}
                  >
                    <span className="hidden sm:inline">Próxima</span>
                    <ChevronRight aria-hidden="true" className="h-4 w-4" />
                  </button>
                </nav>
              )}
              <p className="mt-5 flex items-center gap-2 px-1 text-[11px] leading-relaxed text-muted-foreground">
                <PackageCheck aria-hidden="true" className="h-4 w-4 shrink-0" />
                Atendimento presencial, com retirada na loja e sem taxa de entrega.
              </p>
            </section>
            <aside
              aria-label="Resumo do pedido"
              className="dashboard-panel sticky top-24 hidden max-h-[calc(100dvh-7.5rem)] min-h-0 flex-col overflow-hidden rounded-2xl border border-border bg-card lg:flex"
            >
              {panel("counter-desktop")}
            </aside>
          </div>
        )}
      </main>
      {!loading && !dataError && (
        <div className="fixed inset-x-0 bottom-0 z-30 border-t border-border bg-background/95 p-3 pb-[max(.75rem,env(safe-area-inset-bottom))] backdrop-blur-md lg:hidden">
          <button
            ref={mobileTrigger}
            onClick={() => setMobileCart(true)}
            className="mx-auto flex min-h-14 w-full max-w-xl items-center justify-between gap-3 rounded-xl bg-primary px-4 text-primary-foreground"
          >
            <span className="flex min-w-0 items-center gap-3">
              <span className="flex h-8 min-w-8 items-center justify-center rounded-lg bg-black/10 px-1 text-xs font-bold tabular-nums">
                {units}
              </span>
              <span className="text-sm font-semibold">Ver pedido</span>
            </span>
            <strong className="text-sm tabular-nums">{menuMoney(total)}</strong>
          </button>
        </div>
      )}
      {variantItem && (
        <CounterVariantDialog
          item={variantItem}
          onSelect={(variant) => add(variantItem, variant)}
          onClose={() => setVariantItem(null)}
          onReturnFocus={restoreFocus}
        />
      )}
      <Dialog
        open={mobileCart}
        onOpenChange={(open) => {
          if (!submitLock.current) setMobileCart(open)
        }}
      >
        <DialogContent
          closeLabel="Fechar resumo do pedido"
          className={`admin-menu-dialog menu-editor-dialog inset-x-0 bottom-0 left-0 top-auto flex h-[94dvh] max-h-[94dvh] w-full max-w-none translate-x-0 translate-y-0 flex-col gap-0 overflow-hidden rounded-t-2xl bg-card p-0 sm:bottom-auto sm:left-1/2 sm:top-1/2 sm:h-[90dvh] sm:w-[calc(100%-3rem)] sm:max-w-lg sm:-translate-x-1/2 sm:-translate-y-1/2 sm:rounded-2xl ${busy ? "[&>button:last-child]:pointer-events-none [&>button:last-child]:opacity-30" : ""}`}
          onPointerDownOutside={(event) => event.preventDefault()}
          onEscapeKeyDown={(event) => {
            if (submitLock.current) event.preventDefault()
          }}
          onOpenAutoFocus={(event) => {
            event.preventDefault()
            mobileTitle.current?.focus()
          }}
          onCloseAutoFocus={(event) => {
            event.preventDefault()
            if (mobileTrigger.current?.getClientRects().length) mobileTrigger.current.focus()
            else heading.current?.focus()
          }}
        >
          <div className="shrink-0 border-b border-border p-5 pr-16">
            <DialogTitle
              ref={mobileTitle}
              tabIndex={-1}
              className="font-display text-xl font-bold outline-none"
            >
              Conferir pedido
            </DialogTitle>
            <DialogDescription className="mt-2 text-xs">
              Revise os itens e a forma de pagamento antes de registrar.
            </DialogDescription>
          </div>
          {panel("counter-mobile")}
        </DialogContent>
      </Dialog>
      <AlertDialog open={clearOpen} onOpenChange={setClearOpen}>
        <AlertDialogContent
          className="admin-menu-dialog w-[calc(100%-2rem)] rounded-2xl bg-card p-5 sm:p-6"
          onCloseAutoFocus={(event) => {
            event.preventDefault()
            document.getElementById(`${mobileCart ? "counter-mobile" : "counter-desktop"}-customer`)?.focus()
          }}
        >
          <AlertDialogTitle>Limpar o pedido atual?</AlertDialogTitle>
          <AlertDialogDescription>
            Os itens e dados deste atendimento serão removidos do rascunho. Nenhum pedido registrado será
            alterado.
          </AlertDialogDescription>
          <div className="grid grid-cols-2 gap-3">
            <AlertDialogCancel className="m-0 min-h-11 rounded-xl border-border bg-transparent text-xs">
              Continuar pedido
            </AlertDialogCancel>
            <button
              onClick={() => {
                resetOrder()
                setClearOpen(false)
              }}
              className="min-h-11 rounded-xl bg-destructive px-2 text-xs font-semibold text-destructive-foreground"
            >
              Limpar pedido
            </button>
          </div>
        </AlertDialogContent>
      </AlertDialog>
      <AlertDialog
        open={leaveTarget !== null}
        onOpenChange={(open) => {
          if (!open) setLeaveTarget(null)
        }}
      >
        <AlertDialogContent
          className="admin-menu-dialog w-[calc(100%-2rem)] rounded-2xl bg-card p-5 sm:p-6"
          onCloseAutoFocus={(event) => {
            event.preventDefault()
            restoreFocus()
          }}
        >
          <AlertDialogTitle>Sair do atendimento?</AlertDialogTitle>
          <AlertDialogDescription>
            O pedido atual ainda não foi registrado. Ao sair, você perderá os itens e dados deste rascunho.
          </AlertDialogDescription>
          <div className="grid grid-cols-2 gap-3">
            <AlertDialogCancel className="m-0 min-h-11 rounded-xl border-border bg-transparent text-xs">
              Continuar pedido
            </AlertDialogCancel>
            <button
              onClick={() => {
                const destination = leaveTarget
                resetOrder()
                setLeaveTarget(null)
                if (destination) {
                  allowNavigation.current = true
                  window.location.assign(destination)
                }
              }}
              className="min-h-11 rounded-xl bg-destructive px-2 text-xs font-semibold text-destructive-foreground"
            >
              Descartar e sair
            </button>
          </div>
        </AlertDialogContent>
      </AlertDialog>
      <Dialog
        open={receipt !== null}
        onOpenChange={(open) => {
          if (!open) setReceipt(null)
        }}
      >
        <DialogContent
          closeLabel="Fechar confirmação do pedido"
          className="admin-menu-dialog menu-editor-dialog max-h-[90dvh] w-[calc(100%-2rem)] overflow-y-auto rounded-2xl bg-card p-5 sm:p-6"
          onCloseAutoFocus={(event) => {
            event.preventDefault()
            search.current?.focus()
          }}
        >
          <span className="flex h-14 w-14 items-center justify-center rounded-2xl border border-emerald-400/20 bg-emerald-400/10 text-emerald-300">
            <CheckCircle2 aria-hidden="true" className="h-7 w-7" />
          </span>
          <DialogTitle className="font-display text-2xl font-bold">Pedido registrado!</DialogTitle>
          <DialogDescription>O atendimento já está na lista de pedidos da loja.</DialogDescription>
          {receipt && (
            <>
              <div className="rounded-xl border border-border bg-background p-4">
                <div className="mb-3 flex items-center justify-between gap-3">
                  <strong className="text-sm">#{orderCode(receipt)}</strong>
                  <span className="rounded-lg bg-emerald-400/10 px-2 py-1 text-[10px] text-emerald-300">
                    {orderStatus(receipt.status).label}
                  </span>
                </div>
                <p className="break-words text-sm">{receipt.name}</p>
                <p className="mt-2 text-xs text-muted-foreground">
                  {counterUnits(receipt.items)} itens · {receipt.paymentMethod}
                </p>
                <p className="mt-4 font-display text-2xl font-bold tabular-nums text-primary">
                  {menuMoney(receipt.total)}
                </p>
                {receipt.changeFor && (
                  <p className="mt-2 text-xs text-muted-foreground">
                    Troco:{" "}
                    {menuMoney(
                      (Math.round((counterCash(receipt.changeFor) ?? receipt.total) * 100) -
                        Math.round(receipt.total * 100)) /
                        100,
                    )}
                  </p>
                )}
              </div>
              <div className="grid grid-cols-2 gap-3">
                <button onClick={() => printOrderThermal(receipt, store.name)} className={control}>
                  <Printer aria-hidden="true" className="h-4 w-4" />
                  Imprimir
                </button>
                <button onClick={() => setReceipt(null)} className={`${primary} px-2 text-xs`}>
                  <Plus aria-hidden="true" className="h-4 w-4" />
                  Novo pedido
                </button>
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>
    </div>
  )
}
