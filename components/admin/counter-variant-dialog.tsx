"use client"

import { useRef } from "react"
import { Plus } from "lucide-react"
import { Dialog, DialogContent, DialogTitle, DialogDescription } from "@/components/ui/dialog"
import { MenuProductImage } from "./menu-product-image"
import type { MenuItem, MenuItemVariant } from "@/lib/store-data"
import { menuMoney } from "@/lib/admin-menu"

export function CounterVariantDialog({
  item,
  onSelect,
  onClose,
  onReturnFocus,
}: {
  item: MenuItem
  onSelect: (variant: MenuItemVariant) => void
  onClose: () => void
  onReturnFocus: () => void
}) {
  const title = useRef<HTMLHeadingElement>(null)
  const variants = item.variants?.filter((variant) => variant.available) ?? []
  return (
    <Dialog
      open
      onOpenChange={(open) => {
        if (!open) onClose()
      }}
    >
      <DialogContent
        closeLabel="Fechar opções do produto"
        className="admin-menu-dialog menu-editor-dialog inset-x-0 bottom-0 left-0 top-auto flex max-h-[90dvh] w-full max-w-none translate-x-0 translate-y-0 flex-col gap-0 overflow-hidden rounded-t-2xl bg-card p-0 sm:bottom-auto sm:left-1/2 sm:top-1/2 sm:w-[calc(100%-3rem)] sm:max-w-lg sm:-translate-x-1/2 sm:-translate-y-1/2 sm:rounded-2xl"
        onOpenAutoFocus={(event) => {
          event.preventDefault()
          title.current?.focus()
        }}
        onCloseAutoFocus={(event) => {
          event.preventDefault()
          onReturnFocus()
        }}
      >
        <header className="flex items-center gap-4 border-b border-border p-5 pr-16">
          <MenuProductImage
            src={item.image}
            name={item.name}
            sizes="72px"
            className="h-[72px] w-[72px] shrink-0 rounded-xl"
          />
          <div className="min-w-0">
            <p className="mb-2 text-[10px] font-semibold uppercase tracking-[0.15em] text-primary">
              Escolha uma opção
            </p>
            <DialogTitle
              ref={title}
              tabIndex={-1}
              className="break-words font-display text-xl font-bold outline-none"
            >
              {item.name}
            </DialogTitle>
            <DialogDescription className="mt-2 text-xs leading-relaxed">
              Selecione o sabor ou tamanho para adicionar ao pedido.
            </DialogDescription>
          </div>
        </header>
        <div className="min-h-0 overflow-y-auto overscroll-contain p-5">
          <div className="space-y-3">
            {variants.map((variant) => (
              <button
                key={variant.id}
                onClick={() => onSelect(variant)}
                aria-label={`Adicionar ${item.name}, ${variant.name}`}
                className="flex min-h-[72px] w-full items-center gap-3 rounded-xl border border-border bg-background p-4 text-left transition-colors hover:border-primary/40 hover:bg-primary/5"
              >
                <span className="min-w-0 flex-1 break-words text-sm font-medium">{variant.name}</span>
                <span className="shrink-0 text-sm font-semibold tabular-nums text-primary">
                  {menuMoney(variant.price)}
                </span>
                <Plus aria-hidden="true" className="h-4 w-4 shrink-0 text-muted-foreground" />
              </button>
            ))}
          </div>
        </div>
        <footer className="border-t border-border p-5 pb-[max(1.25rem,env(safe-area-inset-bottom))]">
          <button
            onClick={onClose}
            className="orders-button min-h-11 w-full rounded-xl border border-border text-xs font-semibold"
          >
            Voltar ao catálogo
          </button>
        </footer>
      </DialogContent>
    </Dialog>
  )
}
