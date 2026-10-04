"use client"

import { useRef, type FormEvent } from "react"
import {
  Banknote,
  Check,
  CircleAlert,
  CreditCard,
  Loader2,
  Minus,
  Plus,
  ShoppingBag,
  Trash2,
  UserRound,
} from "lucide-react"
import { menuMoney } from "@/lib/admin-menu"
import { counterCash, counterTotal, counterUnits, type CounterCartItem } from "@/lib/counter"
import { paymentKind } from "@/lib/payment-methods"

export function CounterOrderPanel({
  prefix,
  cart,
  customerName,
  paymentMethod,
  paymentMethods,
  cash,
  busy,
  error,
  onName,
  onPayment,
  onCash,
  onQuantity,
  onRemove,
  onClear,
  onFinish,
  compact = false,
}: {
  prefix: string
  cart: CounterCartItem[]
  customerName: string
  paymentMethod: string
  paymentMethods: string[]
  cash: string
  busy: boolean
  error: string
  onName: (value: string) => void
  onPayment: (value: string) => void
  onCash: (value: string) => void
  onQuantity: (id: string, delta: number) => void
  onRemove: (id: string) => void
  onClear: () => void
  onFinish: () => Promise<void>
  compact?: boolean
}) {
  const [total, units] = [counterTotal(cart), counterUnits(cart)]
  const amount = counterCash(cash)
  const isCash = paymentKind(paymentMethod) === "cash"
  const invalidCash =
    isCash && cash.trim() !== "" && (amount === null || Math.round(amount * 100) < Math.round(total * 100))
  const cashInput = useRef<HTMLInputElement>(null)
  function submit(event: FormEvent) {
    event.preventDefault()
    if (busy) return
    if (invalidCash) {
      cashInput.current?.focus()
      return
    }
    void onFinish()
  }
  return (
    <form onSubmit={submit} noValidate className="flex min-h-0 flex-1 flex-col">
      {!compact && (
        <header className="flex shrink-0 items-center justify-between gap-3 border-b border-border p-5">
          <div className="flex items-center gap-3">
            <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10 text-primary">
              <ShoppingBag aria-hidden="true" className="h-5 w-5" />
            </span>
            <div>
              <h2 className="text-sm font-semibold">Pedido atual</h2>
              <p className="mt-1 text-xs text-muted-foreground" aria-live="polite">
                {units} {units === 1 ? "item selecionado" : "itens selecionados"}
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClear}
            disabled={!cart.length || busy}
            aria-label="Limpar pedido"
            className="orders-button flex h-11 w-11 items-center justify-center rounded-xl text-muted-foreground disabled:opacity-30"
          >
            <Trash2 aria-hidden="true" className="h-4 w-4" />
          </button>
        </header>
      )}
      <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain p-5">
        <fieldset disabled={busy} className="min-w-0 space-y-5">
          {compact && (
            <div className="flex items-center justify-between gap-3">
              <p className="text-xs font-medium text-muted-foreground" aria-live="polite">
                {units} {units === 1 ? "item selecionado" : "itens selecionados"}
              </p>
              <button
                type="button"
                onClick={onClear}
                disabled={!cart.length || busy}
                aria-label="Limpar pedido"
                className="orders-button flex min-h-11 items-center gap-2 rounded-xl px-3 text-xs text-muted-foreground disabled:opacity-30"
              >
                <Trash2 aria-hidden="true" className="h-4 w-4" />
                Limpar
              </button>
            </div>
          )}
          <div>
            <label htmlFor={`${prefix}-customer`} className="flex items-center gap-2 text-xs font-medium">
              <UserRound aria-hidden="true" className="h-3.5 w-3.5 text-muted-foreground" />
              Nome do cliente <span className="font-normal text-muted-foreground">(opcional)</span>
            </label>
            <input
              id={`${prefix}-customer`}
              value={customerName}
              onChange={(event) => onName(event.target.value)}
              maxLength={100}
              placeholder="Ex.: Ana · sem nome, Cliente"
              className="mt-2 min-h-12 w-full min-w-0 rounded-xl border border-border bg-background px-3 text-base sm:text-sm"
            />
          </div>
          {cart.length ? (
            <ol className="space-y-3" aria-label="Itens do pedido">
              {cart.map((line) => (
                <li key={line.id} className="min-w-0 rounded-xl border border-border bg-background p-3">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <p className="break-words text-sm font-medium">{line.name}</p>
                      {line.variantName && (
                        <p className="mt-1 break-words text-xs text-muted-foreground">{line.variantName}</p>
                      )}
                      <p className="mt-2 text-[11px] tabular-nums text-muted-foreground">
                        {menuMoney(line.price)} / unidade
                      </p>
                    </div>
                    <p className="shrink-0 text-sm font-semibold tabular-nums">
                      {menuMoney(counterTotal([line]))}
                    </p>
                  </div>
                  <div className="mt-3 flex items-center justify-between gap-2">
                    <div className="flex items-center rounded-xl border border-border">
                      <button
                        type="button"
                        onClick={() => onQuantity(line.id, -1)}
                        aria-label={`Diminuir quantidade de ${line.name}${line.variantName ? `, ${line.variantName}` : ""}`}
                        className="orders-button flex h-11 w-11 items-center justify-center rounded-l-xl"
                      >
                        <Minus aria-hidden="true" className="h-3.5 w-3.5" />
                      </button>
                      <span
                        className="w-8 text-center text-sm font-semibold tabular-nums"
                        aria-label={`Quantidade: ${line.quantity}`}
                      >
                        {line.quantity}
                      </span>
                      <button
                        type="button"
                        disabled={line.quantity >= 99}
                        onClick={() => onQuantity(line.id, 1)}
                        aria-label={`Aumentar quantidade de ${line.name}${line.variantName ? `, ${line.variantName}` : ""}`}
                        className="orders-button flex h-11 w-11 items-center justify-center rounded-r-xl disabled:opacity-30"
                      >
                        <Plus aria-hidden="true" className="h-3.5 w-3.5" />
                      </button>
                    </div>
                    <button
                      type="button"
                      onClick={() => onRemove(line.id)}
                      aria-label={`Remover ${line.name}${line.variantName ? `, ${line.variantName}` : ""}`}
                      className="flex h-11 w-11 items-center justify-center rounded-xl text-muted-foreground hover:bg-destructive/10 hover:text-red-300"
                    >
                      <Trash2 aria-hidden="true" className="h-4 w-4" />
                    </button>
                  </div>
                </li>
              ))}
            </ol>
          ) : (
            <div className="flex flex-col items-center rounded-xl border border-dashed border-border px-4 py-8 text-center">
              <ShoppingBag aria-hidden="true" className="mb-3 h-8 w-8 text-muted-foreground/60" />
              <h3 className="text-sm font-medium">Seu pedido começa aqui</h3>
              <p className="mt-2 max-w-[230px] text-xs leading-relaxed text-muted-foreground">
                Escolha um produto do catálogo para adicionar ao pedido.
              </p>
            </div>
          )}
          <div className="border-t border-border pt-5">
            <label htmlFor={`${prefix}-payment`} className="mb-2 flex items-center gap-2 text-xs font-medium">
              <CreditCard aria-hidden="true" className="h-3.5 w-3.5 text-muted-foreground" />
              Forma de pagamento
            </label>
            <select
              id={`${prefix}-payment`}
              value={paymentMethod}
              onChange={(event) => onPayment(event.target.value)}
              disabled={!paymentMethods.length || busy}
              className="min-h-12 w-full min-w-0 rounded-xl border border-border bg-background px-3 text-base sm:text-sm"
            >
              {!paymentMethods.length && <option value="">Nenhuma forma cadastrada</option>}
              {paymentMethods.map((method) => (
                <option key={method} value={method}>
                  {method}
                </option>
              ))}
            </select>
            {!paymentMethods.length && (
              <p className="mt-2 text-xs leading-relaxed text-orange-300">
                Cadastre uma forma de pagamento no painel para registrar pedidos.
              </p>
            )}
          </div>
          {isCash && (
            <div>
              <label htmlFor={`${prefix}-cash`} className="mb-2 flex items-center gap-2 text-xs font-medium">
                <Banknote aria-hidden="true" className="h-3.5 w-3.5 text-muted-foreground" />
                Valor recebido <span className="font-normal text-muted-foreground">(opcional)</span>
              </label>
              <div className="relative">
                <span
                  aria-hidden="true"
                  className="absolute left-3 top-1/2 -translate-y-1/2 text-sm text-muted-foreground"
                >
                  R$
                </span>
                <input
                  ref={cashInput}
                  id={`${prefix}-cash`}
                  value={cash}
                  onChange={(event) => onCash(event.target.value)}
                  maxLength={12}
                  inputMode="decimal"
                  placeholder="0,00"
                  aria-invalid={invalidCash}
                  aria-describedby={`${prefix}-cash-help`}
                  className="min-h-12 w-full min-w-0 rounded-xl border border-border bg-background pl-10 pr-3 text-base tabular-nums sm:text-sm"
                />
              </div>
              <p
                id={`${prefix}-cash-help`}
                className={`mt-2 text-xs leading-relaxed ${invalidCash ? "text-red-300" : "text-muted-foreground"}`}
              >
                {invalidCash
                  ? "Informe um valor válido, igual ou maior que o total."
                  : amount !== null && cart.length
                    ? `Troco: ${menuMoney(Math.max(0, Math.round(amount * 100) - Math.round(total * 100)) / 100)}`
                    : "Deixe em branco se não precisar informar troco."}
              </p>
            </div>
          )}
          {error && (
            <div
              role="alert"
              className="flex items-start gap-2 rounded-xl border border-red-400/20 bg-red-400/10 p-3 text-xs leading-relaxed text-red-300"
            >
              <CircleAlert aria-hidden="true" className="mt-0.5 h-4 w-4 shrink-0" />
              {error}
            </div>
          )}
        </fieldset>
      </div>
      <footer
        className={`shrink-0 space-y-3 border-t border-border bg-card ${compact ? "p-4 pb-[max(1rem,env(safe-area-inset-bottom))]" : "p-5 pb-[max(1.25rem,env(safe-area-inset-bottom))]"}`}
      >
        {!compact && (
          <>
            <div className="flex items-center justify-between text-xs text-muted-foreground">
              <span>Subtotal</span>
              <span className="tabular-nums">{menuMoney(total)}</span>
            </div>
            <div className="flex items-center justify-between text-xs text-muted-foreground">
              <span>Retirada no balcão</span>
              <span>Sem taxa</span>
            </div>
          </>
        )}
        <div className="flex flex-wrap items-center justify-between gap-3 py-1">
          <span className="text-sm font-semibold">Total do pedido</span>
          <strong className="font-display text-2xl tabular-nums text-primary">{menuMoney(total)}</strong>
        </div>
        <button
          type="submit"
          disabled={!cart.length || !paymentMethod || invalidCash || busy}
          className="flex min-h-12 w-full items-center justify-center gap-2 rounded-xl bg-primary px-3 text-sm font-semibold text-primary-foreground hover:bg-primary/90 disabled:cursor-not-allowed disabled:opacity-40"
        >
          {busy ? (
            <Loader2 aria-hidden="true" className="h-4 w-4 animate-spin" />
          ) : (
            <Check aria-hidden="true" className="h-4 w-4" />
          )}
          {busy ? "Registrando pedido…" : "Registrar pedido"}
        </button>
        <p className="text-center text-[10px] leading-relaxed text-muted-foreground">
          O pedido será enviado para a lista de Pedidos.
        </p>
      </footer>
    </form>
  )
}
