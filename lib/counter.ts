import { z } from "zod"
import type { Category, MenuItem, MenuItemVariant } from "./store-data"
import { normalizeMenuText, parseMenuPrice } from "./admin-menu"
import { paymentKind } from "./payment-methods"

export interface CounterCartItem {
  id: string
  itemId: string
  variantId?: string
  name: string
  variantName?: string
  price: number
  quantity: number
}
export const counterLineId = (itemId: string, variantId?: string | null) =>
  JSON.stringify([itemId, variantId ?? null])
export const counterAvailable = (item: MenuItem) =>
  item.available !== false && (!item.variants?.length || item.variants.some((variant) => variant.available))
export function counterProducts(items: MenuItem[], categories: Category[], query: string, category: string) {
  const names = new Map(categories.map((entry) => [entry.id, entry.name]))
  const terms = normalizeMenuText(query).split(/\s+/).filter(Boolean)
  return items.filter(
    (item) =>
      counterAvailable(item) &&
      (!category || item.category === category) &&
      terms.every((term) =>
        normalizeMenuText(
          [
            item.name,
            item.description,
            names.get(item.category) ?? "",
            ...(item.variants?.filter((variant) => variant.available).map((variant) => variant.name) ?? []),
          ].join(" "),
        ).includes(term),
      ),
  )
}
export function counterAdd(cart: CounterCartItem[], item: MenuItem, variant?: MenuItemVariant) {
  if (
    !counterAvailable(item) ||
    (item.variants?.length && !variant) ||
    (variant && !item.variants?.some((entry) => entry.id === variant.id && entry.available))
  )
    return cart
  const id = counterLineId(item.id, variant?.id)
  const existing = cart.find((line) => line.id === id)
  if (existing && existing.quantity >= 99) return cart
  if (!existing && cart.length >= 50) return cart
  const line: CounterCartItem = {
    id,
    itemId: item.id,
    variantId: variant?.id,
    name: item.name,
    variantName: variant?.name,
    price: variant?.price ?? item.price,
    quantity: (existing?.quantity ?? 0) + 1,
  }
  return existing ? cart.map((entry) => (entry.id === id ? line : entry)) : [...cart, line]
}
export function counterQuantity(cart: CounterCartItem[], id: string, delta: number) {
  return cart
    .map((line) => (line.id === id ? { ...line, quantity: Math.min(99, line.quantity + delta) } : line))
    .filter((line) => line.quantity > 0)
}
export const counterTotal = (cart: readonly { price: number; quantity: number }[]) =>
  cart.reduce((cents, line) => cents + Math.round(line.price * 100) * line.quantity, 0) / 100
export const counterUnits = (cart: readonly { quantity: number }[]) =>
  cart.reduce((sum, line) => sum + line.quantity, 0)
export function counterCash(value: string) {
  const amount = parseMenuPrice(value)
  return amount !== null && amount <= 100000 ? amount : null
}
const lineSchema = z
  .object({
    itemId: z.string().min(1).max(150),
    variantId: z.string().min(1).max(150).optional(),
    price: z
      .number()
      .finite()
      .nonnegative()
      .max(100000)
      .refine(
        (value) => Math.abs(value * 100 - Math.round(value * 100)) < 0.000001,
        "O preço deve ter até duas casas decimais.",
      ),
    quantity: z.number().int().min(1).max(99),
  })
  .strict()
export const counterOrderSchema = z
  .object({
    requestId: z.string().uuid("Identificação do pedido inválida."),
    name: z
      .string()
      .trim()
      .max(100, "Use até 100 caracteres no nome.")
      .transform((value) => value || "Cliente"),
    paymentMethod: z.string().min(1, "Selecione uma forma de pagamento.").max(60),
    changeFor: z.string().max(12).nullable().optional(),
    items: z
      .array(lineSchema)
      .min(1, "Adicione pelo menos um item ao pedido.")
      .max(50, "Use até 50 itens diferentes por pedido.")
      .refine(
        (items) =>
          new Set(items.map((line) => counterLineId(line.itemId, line.variantId))).size === items.length,
        "Há itens repetidos no pedido.",
      ),
  })
  .strict()
  .superRefine((body, context) => {
    if (
      body.changeFor != null &&
      (paymentKind(body.paymentMethod) !== "cash" || counterCash(body.changeFor) === null)
    )
      context.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["changeFor"],
        message: "Informe um valor válido para o troco em dinheiro.",
      })
  })
export type CounterOrderInput = z.infer<typeof counterOrderSchema>
