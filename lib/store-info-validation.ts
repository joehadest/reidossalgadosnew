import { z } from "zod"
import { deliveryFeeSchema, normalizeNeighborhood } from "./delivery-fees"
import { storeHoursEntrySchema } from "./hours-management"
import { acceptsPix, paymentIdentity, paymentNameSchema, pixKeySchema } from "./payment-methods"

export const brazilStates = [
  ["AC", "Acre"],
  ["AL", "Alagoas"],
  ["AP", "Amapá"],
  ["AM", "Amazonas"],
  ["BA", "Bahia"],
  ["CE", "Ceará"],
  ["DF", "Distrito Federal"],
  ["ES", "Espírito Santo"],
  ["GO", "Goiás"],
  ["MA", "Maranhão"],
  ["MT", "Mato Grosso"],
  ["MS", "Mato Grosso do Sul"],
  ["MG", "Minas Gerais"],
  ["PA", "Pará"],
  ["PB", "Paraíba"],
  ["PR", "Paraná"],
  ["PE", "Pernambuco"],
  ["PI", "Piauí"],
  ["RJ", "Rio de Janeiro"],
  ["RN", "Rio Grande do Norte"],
  ["RS", "Rio Grande do Sul"],
  ["RO", "Rondônia"],
  ["RR", "Roraima"],
  ["SC", "Santa Catarina"],
  ["SP", "São Paulo"],
  ["SE", "Sergipe"],
  ["TO", "Tocantins"],
] as const
const normalize = (value: string) =>
  value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .trim()
    .toLowerCase()
export const getBrazilState = (value: string) =>
  brazilStates.find(
    ([code, name]) => normalize(value) === normalize(code) || normalize(value) === normalize(name),
  )
const digits = (value: string) => value.replace(/\D/g, "")
const telephoneCharacters = /^[+\d\s().-]+$/

export function formatStorePhone(value: string): string {
  const number = digits(value)
  if (number.length === 10) return `(${number.slice(0, 2)}) ${number.slice(2, 6)}-${number.slice(6)}`
  if (number.length === 11) return `(${number.slice(0, 2)}) ${number.slice(2, 7)}-${number.slice(7)}`
  if (number.startsWith("55") && [12, 13].includes(number.length))
    return `+55 ${formatStorePhone(number.slice(2))}`
  return value.trim()
}
export function normalizeStoreWhatsapp(value: string) {
  const number = digits(value)
  return !value.trim().startsWith("+") && [10, 11].includes(number.length) ? `55${number}` : number
}
export function normalizeStoreInstagram(value: string): string | null {
  let handle = value.trim()
  if (!handle) return ""
  if (/^https?:\/\//i.test(handle)) {
    try {
      const url = new URL(handle)
      if (
        !["instagram.com", "www.instagram.com"].includes(url.hostname.toLowerCase()) ||
        url.username ||
        url.password
      )
        return null
      const segments = url.pathname.split("/").filter(Boolean)
      if (segments.length !== 1) return null
      handle = segments[0]
    } catch {
      return null
    }
  }
  handle = handle.replace(/^@/, "")
  return /^[a-zA-Z0-9._]{1,30}$/.test(handle) ? `@${handle}` : null
}
const required = (label: string, max: number) =>
  z.string().trim().min(1, `Informe ${label}.`).max(max, `Use até ${max} caracteres.`)
export const storeInfoSchema = z.object({
  name: required("o nome da loja", 100),
  about: z.string().trim().max(1000, "A descrição deve ter até 1.000 caracteres."),
  address: required("o endereço", 200),
  city: required("a cidade", 100),
  state: z
    .string()
    .trim()
    .refine((value) => !!getBrazilState(value), "Selecione um estado válido.")
    .transform((value) => getBrazilState(value)![1]),
  phone: z
    .string()
    .trim()
    .refine(
      (value) =>
        telephoneCharacters.test(value) &&
        ([10, 11].includes(digits(value).length) ||
          (value.startsWith("+") && digits(value).length >= 8 && digits(value).length <= 15) ||
          (digits(value).startsWith("55") && [12, 13].includes(digits(value).length))),
      "Informe um telefone válido, com DDD.",
    )
    .transform(formatStorePhone),
  whatsapp: z
    .string()
    .trim()
    .refine(
      (value) =>
        telephoneCharacters.test(value) &&
        (value.startsWith("+") || digits(value).length >= 10) &&
        /^[1-9]\d{7,14}$/.test(normalizeStoreWhatsapp(value)),
      "Informe um WhatsApp válido, com DDD ou código do país.",
    )
    .transform(normalizeStoreWhatsapp),
  instagram: z
    .string()
    .max(250)
    .refine(
      (value) => normalizeStoreInstagram(value) !== null,
      "Informe um @usuário ou link de perfil válido do Instagram.",
    )
    .transform((value) => normalizeStoreInstagram(value)!),
  pixKey: pixKeySchema,
})
export type StoreInfoDraft = z.input<typeof storeInfoSchema>
export const storeInfoKeys = Object.keys(storeInfoSchema.shape) as (keyof StoreInfoDraft)[]
export function pickStoreInfo(store: StoreInfoDraft): StoreInfoDraft {
  return Object.fromEntries(storeInfoKeys.map((key) => [key, store[key]])) as StoreInfoDraft
}
export function hasPix(methods: string[]) {
  return acceptsPix(methods)
}
export function storeProfileSchema(pixRequired: boolean) {
  return storeInfoSchema.refine((value) => !pixRequired || !!value.pixKey, {
    path: ["pixKey"],
    message: "Informe a chave Pix para continuar oferecendo esse pagamento.",
  })
}
export const storeUpdateSchema = storeInfoSchema
  .partial()
  .extend({
    paymentMethods: z
      .array(paymentNameSchema)
      .max(30)
      .refine(
        (list) => new Set(list.map(paymentIdentity)).size === list.length,
        "Há formas de pagamento repetidas.",
      )
      .optional(),
    hours: z
      .array(storeHoursEntrySchema)
      .max(7)
      .refine(
        (list) => new Set(list.map((entry) => entry.day)).size === list.length,
        "Há dias da semana repetidos.",
      )
      .optional(),
    deliveryFees: z
      .array(deliveryFeeSchema)
      .max(500)
      .refine(
        (list) =>
          new Set(list.map((entry) => normalizeNeighborhood(entry.neighborhood))).size === list.length,
        "Há bairros repetidos.",
      )
      .optional(),
  })
  .strict()
  .refine((data) => Object.keys(data).length > 0, "Informe as alterações da loja.")
