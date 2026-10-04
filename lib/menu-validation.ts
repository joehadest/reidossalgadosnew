import { z } from "zod"
import { validMenuImage } from "./admin-menu"

const price = z
  .number({ invalid_type_error: "Informe um preço válido." })
  .finite()
  .nonnegative("O preço não pode ser negativo.")
  .max(Number.MAX_SAFE_INTEGER / 100)
  .refine(
    (value) => Math.abs(value * 100 - Math.round(value * 100)) < 0.000001,
    "Use no máximo duas casas decimais.",
  )
const variant = z.object({
  id: z.string().max(200).optional(),
  name: z
    .string()
    .trim()
    .min(1, "Dê um nome a cada opção.")
    .max(120, "O nome da opção deve ter até 120 caracteres."),
  price,
  available: z.boolean().optional(),
})
export const menuCreateSchema = z.object({
  id: z.string().min(1).max(200).optional(),
  name: z
    .string()
    .trim()
    .min(1, "Informe o nome do produto.")
    .max(120, "O nome deve ter até 120 caracteres."),
  description: z
    .string()
    .trim()
    .min(1, "Informe uma descrição.")
    .max(2000, "A descrição deve ter até 2.000 caracteres."),
  price,
  image: z
    .string()
    .trim()
    .max(2048)
    .refine(validMenuImage, "Use um link HTTP/HTTPS ou um caminho de imagem da loja.")
    .optional(),
  category: z.string().trim().min(1, "Selecione uma categoria."),
  available: z.boolean().optional(),
  variants: z
    .array(variant)
    .max(100, "Use até 100 opções por produto.")
    .refine((variants) => {
      const ids = variants.map((entry) => entry.id).filter(Boolean)
      return new Set(ids).size === ids.length
    }, "Há opções repetidas. Reabra o produto e tente novamente.")
    .optional(),
})
export const menuUpdateSchema = menuCreateSchema.omit({ id: true }).partial()
