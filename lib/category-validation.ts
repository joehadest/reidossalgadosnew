import { z } from "zod"

export const categoryIcons = ["flame", "cookie", "sandwich", "cup-soda", "package"] as const
export const categorySchema = z.object({
  name: z.string().trim().min(1, "Informe o nome da categoria.").max(60, "Use até 60 caracteres no nome."),
  icon: z.enum(categoryIcons, { errorMap: () => ({ message: "Escolha um dos ícones disponíveis." }) }),
})
export const categoryCreateSchema = categorySchema.extend({
  id: z
    .string()
    .min(1)
    .max(100)
    .regex(/^[a-zA-Z0-9_-]+$/, "Identificador inválido."),
})
export const categoryUpdateSchema = categorySchema
  .partial()
  .strict()
  .refine((data) => Object.keys(data).length > 0, "Informe as alterações da categoria.")
const ids = z
  .array(z.string().min(1).max(100))
  .min(1)
  .max(1000)
  .refine((values) => new Set(values).size === values.length, "A ordem contém categorias repetidas.")
export const categoryOrderSchema = z.object({ ids, previousIds: ids.optional() })

export function normalizeCategoryName(value: string) {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .trim()
    .replace(/\s+/g, " ")
    .toLocaleLowerCase("pt-BR")
}
