import { z } from "zod"

export const normalizeNeighborhood = (value: string) =>
  value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .trim()
    .replace(/\s+/g, " ")
    .toLocaleLowerCase("pt-BR")
export const deliveryMoney = (value: number) =>
  new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(value)
export const deliveryFeeSchema = z
  .object({
    neighborhood: z
      .string()
      .trim()
      .min(1, "Informe o nome do bairro.")
      .max(120, "Use até 120 caracteres no nome.")
      .transform((value) => value.replace(/\s+/g, " ")),
    fee: z
      .number({ invalid_type_error: "Informe uma taxa válida." })
      .finite()
      .nonnegative("A taxa não pode ser negativa.")
      .max(100000, "A taxa deve ser de até R$ 100.000,00.")
      .refine(
        (value) => Math.abs(value * 100 - Math.round(value * 100)) < 0.000001,
        "Use no máximo duas casas decimais.",
      ),
  })
  .strict()
export type DeliveryFeeData = z.infer<typeof deliveryFeeSchema>
export type DeliveryFilter = "all" | "paid" | "free"
export type DeliverySort = "name" | "fee" | "fee-desc"

export function parseDeliveryFee(value: string): number | null {
  const text = value.trim().replace(",", ".")
  if (!/^\d+(?:\.\d{1,2})?$/.test(text)) return null
  const fee = Number(text)
  return Number.isFinite(fee) && fee <= 100000 ? fee : null
}
export function filterDeliveryFees(
  fees: DeliveryFeeData[],
  query: string,
  filter: DeliveryFilter,
  sort: DeliverySort,
) {
  const terms = normalizeNeighborhood(query).split(" ").filter(Boolean)
  return fees
    .filter(
      (entry) =>
        terms.every((term) => normalizeNeighborhood(entry.neighborhood).includes(term)) &&
        (filter === "all" || (filter === "free" ? entry.fee === 0 : entry.fee > 0)),
    )
    .sort((a, b) => {
      const name = a.neighborhood.localeCompare(b.neighborhood, "pt-BR")
      return sort === "name" ? name : (a.fee - b.fee) * (sort === "fee" ? 1 : -1) || name
    })
}
