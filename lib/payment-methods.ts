import { z } from "zod"

export const normalizePaymentName = (name: string) =>
  name
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .trim()
    .replace(/\s+/g, " ")
export type PaymentKind = "pix" | "cash" | "credit" | "debit" | "card" | "other"
export function paymentKind(name: string): PaymentKind {
  const normalized = normalizePaymentName(name)
  if (normalized === "pix") return "pix"
  if (normalized === "dinheiro") return "cash"
  if (["credito", "cartao de credito", "cartao credito"].includes(normalized)) return "credit"
  if (["debito", "cartao de debito", "cartao debito"].includes(normalized)) return "debit"
  if (["cartao", "cartoes"].includes(normalized)) return "card"
  return "other"
}
export const paymentPresets = ["PIX", "Dinheiro", "Cartão de Crédito", "Cartão de Débito", "Vale-refeição"]
const canonical: Partial<Record<PaymentKind, string>> = {
  pix: "PIX",
  cash: "Dinheiro",
  credit: "Cartão de Crédito",
  debit: "Cartão de Débito",
}
export const paymentIdentity = (name: string) => normalizePaymentName(canonical[paymentKind(name)] ?? name)
export const paymentNameSchema = z
  .string()
  .trim()
  .min(1, "Informe o nome da forma de pagamento.")
  .max(60, "Use até 60 caracteres.")
  .transform((name) => name.replace(/\s+/g, " "))
export const paymentMethodSchema = paymentNameSchema.transform((name) => canonical[paymentKind(name)] ?? name)
export const pixKeySchema = z.string().trim().max(140, "A chave Pix deve ter até 140 caracteres.")
export const acceptsPix = (methods: string[]) => methods.some((name) => paymentKind(name) === "pix")
export const paymentDescription = (name: string) =>
  ({
    pix: "Transferência com a chave da loja",
    cash: "Pagamento em espécie, com opção de troco",
    credit: "Pagamento com cartão de crédito",
    debit: "Pagamento com cartão de débito",
    card: "Pagamento com cartão",
    other: "Opção personalizada para seus clientes",
  })[paymentKind(name)]
