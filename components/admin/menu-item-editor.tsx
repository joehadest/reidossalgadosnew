"use client"

import { useRef, useState, type FormEvent } from "react"
import { CircleAlert, Eye, EyeOff, ImageIcon, Layers3, Loader2, Plus, Save, Trash2 } from "lucide-react"
import type { Category, MenuItem } from "@/lib/store-data"
import { menuMoney, parseMenuPrice } from "@/lib/admin-menu"
import { menuCreateSchema } from "@/lib/menu-validation"
import { Dialog, DialogContent, DialogDescription, DialogTitle } from "@/components/ui/dialog"
import {
  AlertDialog,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog"
import { Switch } from "@/components/ui/switch"
import { MenuProductImage } from "./menu-product-image"

interface DraftVariant {
  key: string
  id: string
  name: string
  price: string
  available: boolean
}
interface Draft {
  name: string
  description: string
  category: string
  price: string
  image: string
  available: boolean
  variants: DraftVariant[]
}
const field =
  "mt-2 block min-h-11 w-full min-w-0 rounded-xl border border-border bg-background px-3 py-2.5 text-sm text-foreground placeholder:text-muted-foreground"
const priceText = (value: number) => value.toFixed(2).replace(".", ",")

function createDraft(item: MenuItem | null, categories: Category[]): Draft {
  return {
    name: item?.name ?? "",
    description: item?.description ?? "",
    category: item?.category ?? categories[0]?.id ?? "",
    price: item ? priceText(item.price) : "",
    image: item?.image ?? "",
    available: item?.available !== false,
    variants:
      item?.variants?.map((variant) => ({
        ...variant,
        key: variant.id || crypto.randomUUID(),
        price: priceText(variant.price),
      })) ?? [],
  }
}

export function MenuItemEditor({
  item,
  categories,
  onSave,
  onClose,
  onReturnFocus,
}: {
  item: MenuItem | null
  categories: Category[]
  onSave: (item: MenuItem) => Promise<void>
  onClose: () => void
  onReturnFocus: () => void
}) {
  const [initial] = useState(() => createDraft(item, categories))
  const [draft, setDraft] = useState<Draft>(initial)
  const [saving, setSaving] = useState(false)
  const savingRef = useRef(false)
  const [error, setError] = useState("")
  const [discard, setDiscard] = useState(false)
  const [lastAdded, setLastAdded] = useState<string | null>(null)
  const title = useRef<HTMLHeadingElement>(null)
  const dirty = JSON.stringify(draft) !== JSON.stringify(initial)
  const prices = draft.variants.length
    ? draft.variants
        .filter((variant) => variant.available)
        .map((variant) => parseMenuPrice(variant.price))
        .filter((price): price is number => price !== null)
    : []
  const allPrices = draft.variants
    .map((variant) => parseMenuPrice(variant.price))
    .filter((price): price is number => price !== null)
  const previewPrice = prices.length
    ? Math.min(...prices)
    : allPrices.length
      ? Math.min(...allPrices)
      : parseMenuPrice(draft.price)

  function requestClose() {
    if (savingRef.current) return
    if (dirty) setDiscard(true)
    else onClose()
  }
  function updateVariant(key: string, values: Partial<DraftVariant>) {
    setDraft((value) => ({
      ...value,
      variants: value.variants.map((variant) => (variant.key === key ? { ...variant, ...values } : variant)),
    }))
  }
  function addVariant() {
    const key = crypto.randomUUID()
    setDraft((value) => ({
      ...value,
      variants: [...value.variants, { key, id: "", name: "", price: value.price, available: true }],
    }))
    setLastAdded(key)
  }
  async function submit(event: FormEvent) {
    event.preventDefault()
    if (savingRef.current) return
    setError("")
    const variants = draft.variants.map((variant) => ({
      id: variant.id,
      name: variant.name,
      price: parseMenuPrice(variant.price),
      available: variant.available,
    }))
    const base = variants.length
      ? Math.min(...variants.map((variant) => variant.price ?? NaN))
      : parseMenuPrice(draft.price)
    if (base === null || !Number.isFinite(base) || variants.some((variant) => variant.price === null)) {
      setError("Informe um preço válido para o produto e para cada opção. Exemplo: 5,50.")
      return
    }
    const parsed = menuCreateSchema.safeParse({ ...draft, price: base, variants })
    if (!parsed.success) {
      setError(parsed.error.issues[0].message)
      return
    }
    savingRef.current = true
    setSaving(true)
    try {
      await onSave({
        ...parsed.data,
        id: item?.id ?? "",
        image: parsed.data.image ?? "",
        variants:
          parsed.data.variants?.map((variant) => ({
            ...variant,
            id: variant.id ?? "",
            available: variant.available !== false,
          })) ?? [],
      })
    } catch (cause) {
      setError(
        cause instanceof Error ? cause.message : "Não foi possível salvar. Suas alterações continuam aqui.",
      )
    } finally {
      savingRef.current = false
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
          closeLabel="Fechar editor"
          className={`admin-menu-dialog menu-editor-dialog inset-x-0 bottom-0 left-0 top-auto flex max-h-[94dvh] w-full max-w-none translate-x-0 translate-y-0 flex-col gap-0 overflow-hidden rounded-t-2xl bg-card p-0 sm:bottom-auto sm:left-1/2 sm:top-1/2 sm:max-h-[90dvh] sm:w-[calc(100%-3rem)] sm:max-w-4xl sm:-translate-x-1/2 sm:-translate-y-1/2 sm:rounded-2xl ${saving ? "[&>button:last-child]:pointer-events-none [&>button:last-child]:opacity-30" : ""}`}
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
            if (savingRef.current) event.preventDefault()
          }}
        >
          <header className="shrink-0 border-b border-border px-4 py-5 pr-16 sm:px-6 sm:pr-16">
            <DialogTitle
              ref={title}
              tabIndex={-1}
              className="font-display text-xl font-bold outline-none sm:text-2xl"
            >
              {item ? "Editar produto" : "Novo produto"}
            </DialogTitle>
            <DialogDescription className="mt-1.5 text-xs leading-relaxed text-muted-foreground">
              {item
                ? "Ajuste as informações, preços e disponibilidade."
                : "Preencha as informações para adicionar ao cardápio."}
            </DialogDescription>
          </header>
          <form onSubmit={submit} className="flex min-h-0 flex-1 flex-col">
            <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain p-4 sm:p-6">
              <fieldset disabled={saving} className="grid min-w-0 gap-6 md:grid-cols-[minmax(0,1fr)_250px]">
                <div className="min-w-0 space-y-6">
                  <section aria-labelledby="product-information-heading" className="space-y-4">
                    <div>
                      <h3 id="product-information-heading" className="text-sm font-semibold">
                        Informações do produto
                      </h3>
                      <p className="mt-1 text-xs text-muted-foreground">
                        Nome, descrição e categoria são obrigatórios.
                      </p>
                    </div>
                    <label className="block text-xs font-medium">
                      Nome do produto
                      <input
                        required
                        maxLength={120}
                        value={draft.name}
                        onChange={(event) => setDraft((value) => ({ ...value, name: event.target.value }))}
                        placeholder="Ex.: Coxinha de frango"
                        className={field}
                      />
                    </label>
                    <label className="block text-xs font-medium">
                      Descrição
                      <textarea
                        required
                        maxLength={2000}
                        rows={3}
                        value={draft.description}
                        onChange={(event) =>
                          setDraft((value) => ({ ...value, description: event.target.value }))
                        }
                        placeholder="Descreva o produto e seus ingredientes…"
                        className={`${field} resize-y`}
                      />
                    </label>
                    <div className={`grid gap-4 ${!draft.variants.length ? "sm:grid-cols-2" : ""}`}>
                      <label className="block text-xs font-medium">
                        Categoria
                        <select
                          required
                          value={draft.category}
                          onChange={(event) =>
                            setDraft((value) => ({ ...value, category: event.target.value }))
                          }
                          className={field}
                        >
                          {!categories.length && <option value="">Cadastre uma categoria</option>}
                          {categories.map((category) => (
                            <option key={category.id} value={category.id}>
                              {category.name}
                            </option>
                          ))}
                        </select>
                      </label>
                      {!draft.variants.length && (
                        <label className="block text-xs font-medium">
                          Preço (R$)
                          <input
                            required
                            inputMode="decimal"
                            value={draft.price}
                            onChange={(event) =>
                              setDraft((value) => ({ ...value, price: event.target.value }))
                            }
                            placeholder="Ex.: 5,50"
                            className={field}
                          />
                        </label>
                      )}
                    </div>
                    <div
                      className={`flex min-h-20 items-center justify-between gap-4 rounded-xl border p-4 ${draft.available ? "border-emerald-400/20 bg-emerald-400/5" : "border-border bg-background"}`}
                    >
                      <div className="flex items-start gap-2.5">
                        {draft.available ? (
                          <Eye aria-hidden="true" className="mt-0.5 h-4 w-4 shrink-0 text-emerald-300" />
                        ) : (
                          <EyeOff aria-hidden="true" className="mt-0.5 h-4 w-4 shrink-0 text-amber-300" />
                        )}
                        <div>
                          <label
                            htmlFor="menu-item-available"
                            className="cursor-pointer text-xs font-semibold"
                          >
                            Item ativo no cardápio
                          </label>
                          <p className="mt-1 text-[11px] leading-relaxed text-muted-foreground">
                            {draft.available
                              ? "Visível para os clientes."
                              : "Pausado. Não aparece para os clientes."}
                          </p>
                        </div>
                      </div>
                      <Switch
                        id="menu-item-available"
                        checked={draft.available}
                        onCheckedChange={(checked) => setDraft((value) => ({ ...value, available: checked }))}
                        disabled={saving}
                      />
                    </div>
                  </section>
                  <section
                    aria-labelledby="product-options-heading"
                    className="rounded-xl border border-border bg-background/40 p-3 sm:p-4"
                  >
                    <div className="flex flex-wrap items-center justify-between gap-3">
                      <div>
                        <h3
                          id="product-options-heading"
                          className="flex items-center gap-2 text-sm font-semibold"
                        >
                          <Layers3 aria-hidden="true" className="h-4 w-4 text-violet-300" />
                          Sabores e opções
                        </h3>
                        <p className="mt-1 text-[11px] text-muted-foreground">
                          {draft.variants.length
                            ? `${draft.variants.length} ${draft.variants.length === 1 ? "opção cadastrada" : "opções cadastradas"}`
                            : "Opcional. Use para sabores, tamanhos ou versões."}
                        </p>
                      </div>
                      <button
                        type="button"
                        disabled={draft.variants.length >= 100}
                        onClick={addVariant}
                        className="inline-flex min-h-11 items-center gap-1.5 rounded-lg bg-primary/10 px-3 text-xs font-semibold text-primary hover:bg-primary/20 disabled:opacity-40"
                      >
                        <Plus aria-hidden="true" className="h-3.5 w-3.5" />
                        Adicionar opção
                      </button>
                    </div>
                    {!!draft.variants.length && (
                      <>
                        <p className="mt-3 text-[11px] leading-relaxed text-muted-foreground">
                          Cada opção tem seu próprio preço. Ative apenas as opções disponíveis para venda.
                        </p>
                        <div className="mt-4 space-y-3">
                          {draft.variants.map((variant, index) => (
                            <div
                              key={variant.key}
                              className="min-w-0 rounded-xl border border-border bg-card p-3"
                            >
                              <div className="mb-2 flex items-center justify-between">
                                <span className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
                                  Opção {index + 1}
                                </span>
                                <button
                                  type="button"
                                  aria-label={`Remover opção ${index + 1}`}
                                  onClick={() =>
                                    setDraft((value) => ({
                                      ...value,
                                      variants: value.variants.filter((entry) => entry.key !== variant.key),
                                    }))
                                  }
                                  className="dashboard-icon-button -mr-1 flex h-11 w-11 rounded-lg text-muted-foreground hover:bg-rose-400/10 hover:text-rose-300"
                                >
                                  <Trash2 aria-hidden="true" className="h-4 w-4" />
                                </button>
                              </div>
                              <label className="block text-[11px] font-medium">
                                Nome da opção {index + 1}
                                <input
                                  autoFocus={variant.key === lastAdded}
                                  required
                                  maxLength={120}
                                  value={variant.name}
                                  onChange={(event) =>
                                    updateVariant(variant.key, { name: event.target.value })
                                  }
                                  placeholder="Ex.: Frango com catupiry"
                                  className={field}
                                />
                              </label>
                              <div className="mt-3 grid grid-cols-[minmax(0,1fr)_auto] items-end gap-3">
                                <label className="block text-[11px] font-medium">
                                  Preço da opção {index + 1} (R$)
                                  <input
                                    required
                                    inputMode="decimal"
                                    value={variant.price}
                                    onChange={(event) =>
                                      updateVariant(variant.key, { price: event.target.value })
                                    }
                                    placeholder="Ex.: 6,00"
                                    className={field}
                                  />
                                </label>
                                <div className="flex min-h-11 items-center gap-2">
                                  <label
                                    htmlFor={`variant-${variant.key}`}
                                    className={`cursor-pointer text-[11px] ${variant.available ? "text-emerald-300" : "text-muted-foreground"}`}
                                  >
                                    {variant.available ? "Ativa" : "Pausada"}
                                  </label>
                                  <Switch
                                    id={`variant-${variant.key}`}
                                    aria-label={`Disponibilidade da opção ${index + 1}`}
                                    checked={variant.available}
                                    onCheckedChange={(checked) =>
                                      updateVariant(variant.key, { available: checked })
                                    }
                                    disabled={saving}
                                  />
                                </div>
                              </div>
                            </div>
                          ))}
                        </div>
                      </>
                    )}
                  </section>
                </div>
                <aside className="min-w-0 space-y-4">
                  <section className="rounded-xl border border-border bg-background/40 p-3">
                    <h3 className="mb-3 flex items-center gap-2 text-xs font-semibold">
                      <ImageIcon aria-hidden="true" className="h-4 w-4 text-muted-foreground" />
                      Foto do produto
                    </h3>
                    <MenuProductImage
                      src={draft.image.trim()}
                      name={draft.name || "Prévia do produto"}
                      sizes="250px"
                      eager
                      className="aspect-[4/3] rounded-lg"
                    />
                    <label className="mt-4 block text-xs font-medium">
                      Link da foto (opcional)
                      <input
                        value={draft.image}
                        onChange={(event) => setDraft((value) => ({ ...value, image: event.target.value }))}
                        placeholder="https://… ou /images/…"
                        className={`${field} text-xs`}
                      />
                    </label>
                    <p className="mt-2 text-[11px] leading-relaxed text-muted-foreground">
                      Cole o endereço de uma imagem. Sem foto, será exibido um ícone padrão.
                    </p>
                  </section>
                  <section className="rounded-xl border border-border bg-background/40 p-4">
                    <h3 className="mb-3 text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
                      Prévia no cardápio
                    </h3>
                    <p className="break-words text-sm font-semibold">
                      {draft.name.trim() || "Nome do produto"}
                    </p>
                    <p className="mt-1 break-words text-xs leading-relaxed text-muted-foreground">
                      {draft.description.trim() || "Descrição do produto"}
                    </p>
                    <p className="mt-3 font-display text-xl font-semibold text-primary">
                      {prices.length ? "A partir de " : ""}
                      {previewPrice === null ? "R$ —" : menuMoney(previewPrice)}
                    </p>
                    <span
                      className={`mt-3 inline-flex rounded-md px-2 py-1 text-[10px] font-medium ${draft.available ? "bg-emerald-400/10 text-emerald-300" : "bg-amber-400/10 text-amber-300"}`}
                    >
                      {draft.available ? "Ativo" : "Pausado"}
                    </span>
                  </section>
                </aside>
              </fieldset>
            </div>
            <footer className="shrink-0 border-t border-border bg-card p-4 pb-[max(1rem,env(safe-area-inset-bottom))] sm:px-6">
              {error && (
                <div
                  role="alert"
                  className="mb-3 flex items-start gap-2 rounded-xl border border-rose-400/20 bg-rose-400/5 p-3 text-xs leading-relaxed text-rose-300"
                >
                  <CircleAlert aria-hidden="true" className="h-4 w-4 shrink-0" />
                  {error}
                </div>
              )}
              <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <p className="text-[11px] leading-relaxed text-muted-foreground">
                  {saving
                    ? "Salvando produto…"
                    : dirty
                      ? "Alterações ainda não salvas."
                      : "As informações só serão aplicadas ao salvar."}
                </p>
                <div className="flex gap-2">
                  <button
                    type="button"
                    disabled={saving}
                    onClick={requestClose}
                    className="orders-button min-h-11 flex-1 rounded-xl border border-border px-4 text-xs font-medium disabled:opacity-50 sm:flex-none"
                  >
                    Cancelar
                  </button>
                  <button
                    type="submit"
                    disabled={saving || !categories.length}
                    className="inline-flex min-h-11 flex-1 items-center justify-center gap-2 rounded-xl bg-primary px-4 text-xs font-semibold text-primary-foreground hover:bg-primary/90 disabled:opacity-50 sm:flex-none"
                  >
                    {saving ? (
                      <Loader2 aria-hidden="true" className="h-4 w-4 animate-spin" />
                    ) : (
                      <Save aria-hidden="true" className="h-4 w-4" />
                    )}
                    {saving ? "Salvando…" : item ? "Salvar alterações" : "Criar produto"}
                  </button>
                </div>
              </div>
            </footer>
          </form>
        </DialogContent>
      </Dialog>
      <AlertDialog open={discard} onOpenChange={setDiscard}>
        <AlertDialogContent className="admin-menu-dialog w-[calc(100%-2rem)] rounded-2xl bg-card p-5 sm:p-6">
          <AlertDialogTitle className="font-display text-xl">Descartar alterações?</AlertDialogTitle>
          <AlertDialogDescription className="text-sm leading-relaxed">
            Você fez alterações que ainda não foram salvas. Ao sair, elas serão descartadas.
          </AlertDialogDescription>
          <div className="mt-2 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
            <AlertDialogCancel className="m-0 min-h-11 rounded-xl border-border bg-transparent text-xs">
              Continuar editando
            </AlertDialogCancel>
            <button
              type="button"
              onClick={() => {
                setDiscard(false)
                onClose()
              }}
              className="min-h-11 rounded-xl bg-rose-500 px-4 text-xs font-semibold text-white hover:bg-rose-600"
            >
              Descartar alterações
            </button>
          </div>
        </AlertDialogContent>
      </AlertDialog>
    </>
  )
}
