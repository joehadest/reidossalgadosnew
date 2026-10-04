"use client"

import { useRef, useState, type FormEvent } from "react"
import { CircleAlert, Loader2, Save, Check } from "lucide-react"
import { Dialog, DialogContent, DialogDescription, DialogTitle } from "@/components/ui/dialog"
import {
  AlertDialog,
  AlertDialogContent,
  AlertDialogTitle,
  AlertDialogDescription,
  AlertDialogCancel,
} from "@/components/ui/alert-dialog"
import { categorySchema, normalizeCategoryName } from "@/lib/category-validation"
import type { Category } from "@/lib/store-data"
import { CategoryIcon, categoryIconOptions, categoryVisual } from "./category-visual"

export function CategoryEditor({
  category,
  categories,
  onSave,
  onClose,
  onReturnFocus,
}: {
  category: Category | null
  categories: Category[]
  onSave: (category: Category) => Promise<void>
  onClose: () => void
  onReturnFocus: () => void
}) {
  const [initial] = useState(() => ({ name: category?.name ?? "", icon: category?.icon ?? "flame" }))
  const [draft, setDraft] = useState(initial)
  const [saving, setSaving] = useState(false)
  const savingRef = useRef(false)
  const title = useRef<HTMLHeadingElement>(null)
  const [error, setError] = useState("")
  const [discard, setDiscard] = useState(false)
  const dirty = draft.name !== initial.name || draft.icon !== initial.icon
  function requestClose() {
    if (savingRef.current) return
    if (dirty) setDiscard(true)
    else onClose()
  }
  async function submit(event: FormEvent) {
    event.preventDefault()
    if (savingRef.current) return
    setError("")
    const result = categorySchema.safeParse(draft)
    if (!result.success) {
      setError(result.error.issues[0].message)
      return
    }
    if (
      categories.some(
        (cat) =>
          cat.id !== category?.id &&
          normalizeCategoryName(cat.name) === normalizeCategoryName(result.data.name),
      )
    ) {
      setError("Já existe uma categoria com esse nome. Escolha outro nome.")
      return
    }
    savingRef.current = true
    setSaving(true)
    try {
      await onSave({ ...result.data, id: category?.id ?? crypto.randomUUID() })
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
          closeLabel="Fechar editor de categoria"
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
            if (savingRef.current) event.preventDefault()
          }}
        >
          <header className="shrink-0 border-b border-border px-5 py-5 pr-16 sm:px-6 sm:pr-16">
            <DialogTitle
              ref={title}
              tabIndex={-1}
              className="font-display text-xl font-bold outline-none sm:text-2xl"
            >
              {category ? "Editar categoria" : "Nova categoria"}
            </DialogTitle>
            <DialogDescription className="mt-1.5 text-xs leading-relaxed">
              Organize seus produtos com um nome e um ícone fáceis de reconhecer.
            </DialogDescription>
          </header>
          <form onSubmit={submit} className="flex min-h-0 flex-1 flex-col">
            <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain p-5 sm:p-6">
              <fieldset disabled={saving} className="min-w-0 space-y-6">
                <div>
                  <label htmlFor="category-name" className="text-sm font-medium">
                    Nome da categoria <span className="text-primary">*</span>
                  </label>
                  <input
                    id="category-name"
                    value={draft.name}
                    onChange={(event) => {
                      setDraft({ ...draft, name: event.target.value })
                      setError("")
                    }}
                    maxLength={60}
                    aria-required="true"
                    aria-invalid={!!error}
                    aria-describedby={`category-name-help${error ? " category-editor-error" : ""}`}
                    placeholder="Ex.: Salgados, Sobremesas, Bebidas"
                    className="mt-2 min-h-12 w-full min-w-0 rounded-xl border border-border bg-background px-3 text-sm placeholder:text-muted-foreground"
                  />
                  <div
                    id="category-name-help"
                    className="mt-2 flex justify-between gap-3 text-xs text-muted-foreground"
                  >
                    <span>Como aparecerá no cardápio.</span>
                    <span className="shrink-0 tabular-nums">{draft.name.length}/60</span>
                  </div>
                </div>
                <fieldset>
                  <legend className="text-sm font-medium">Ícone da categoria</legend>
                  <p className="mt-1 text-xs text-muted-foreground">
                    Escolha o símbolo que combina com seus produtos.
                  </p>
                  <div className="mt-3 grid grid-cols-3 gap-2 sm:grid-cols-5">
                    {categoryIconOptions.map(({ value, label, Icon }) => (
                      <button
                        key={value}
                        type="button"
                        aria-pressed={draft.icon === value}
                        onClick={() => setDraft({ ...draft, icon: value })}
                        className={`relative flex min-h-20 flex-col items-center justify-center gap-2 rounded-xl border text-xs transition-colors ${draft.icon === value ? "border-primary/60 bg-primary/10 text-primary" : "border-border bg-background text-muted-foreground hover:bg-secondary"}`}
                      >
                        <Icon aria-hidden="true" className="h-5 w-5" />
                        {label}
                        {draft.icon === value && (
                          <Check aria-hidden="true" className="absolute right-1.5 top-1.5 h-3 w-3" />
                        )}
                      </button>
                    ))}
                  </div>
                </fieldset>
                <section
                  className="rounded-xl border border-border bg-background p-4"
                  aria-label="Prévia da categoria"
                >
                  <p className="text-[10px] font-semibold uppercase tracking-[0.15em] text-muted-foreground">
                    Prévia no cardápio
                  </p>
                  <div className="mt-3 flex min-w-0 items-center gap-3">
                    <span
                      className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-xl ${categoryVisual(draft.icon).tone}`}
                    >
                      <CategoryIcon icon={draft.icon} />
                    </span>
                    <p className="min-w-0 break-words text-sm font-semibold">
                      {draft.name.trim() || "Nome da categoria"}
                    </p>
                  </div>
                </section>
                {error && (
                  <div
                    id="category-editor-error"
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
                disabled={saving || (!!category && !dirty)}
                className="flex min-h-11 items-center justify-center gap-2 rounded-xl bg-primary px-2 text-sm font-semibold text-primary-foreground hover:bg-primary/90 disabled:opacity-40"
              >
                {saving ? (
                  <Loader2 aria-hidden="true" className="h-4 w-4 animate-spin" />
                ) : (
                  <Save aria-hidden="true" className="h-4 w-4" />
                )}
                {saving ? "Salvando…" : "Salvar categoria"}
              </button>
            </footer>
          </form>
        </DialogContent>
      </Dialog>
      <AlertDialog open={discard} onOpenChange={setDiscard}>
        <AlertDialogContent className="admin-menu-dialog max-h-[90dvh] w-[calc(100%-2rem)] overflow-y-auto rounded-2xl bg-card p-5 sm:p-6">
          <AlertDialogTitle>Descartar alterações?</AlertDialogTitle>
          <AlertDialogDescription>
            As mudanças feitas nesta categoria ainda não foram salvas.
          </AlertDialogDescription>
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
