import { z } from "zod"

export const DEFAULT_ADMIN_PASSWORD = "admin123"
export const passwordBytes = (value: string) => new TextEncoder().encode(value).length

export const adminLoginSchema = z
  .object({
    password: z
      .string()
      .trim()
      .min(1, "Informe a senha de acesso.")
      .max(1024, "Senha inválida. Confira e tente novamente."),
  })
  .strict()

export const passwordChangeSchema = z
  .object({
    currentPassword: z
      .string()
      .trim()
      .min(1, "Informe a senha atual.")
      .max(1024, "Senha atual inválida."),
    newPassword: z
      .string()
      .min(6, "Use pelo menos 6 caracteres.")
      .refine((value) => value === value.trim(), "Não use espaços no início ou no fim da senha.")
      .refine(
        (value) => passwordBytes(value) <= 72,
        "A senha excede o limite. Use até 72 caracteres simples ou menos caracteres acentuados.",
      )
      .refine(
        (value) => value !== DEFAULT_ADMIN_PASSWORD,
        "Escolha uma senha diferente da senha padrão.",
      ),
  })
  .strict()
  .superRefine((value, context) => {
    if (value.newPassword === value.currentPassword)
      context.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["newPassword"],
        message: "Escolha uma senha diferente da atual.",
      })
  })

export const passwordFormSchema = passwordChangeSchema
  .innerType()
  .extend({
    confirmPassword: z.string().min(1, "Confirme a nova senha."),
  })
  .strict()
  .superRefine((value, context) => {
    if (value.newPassword === value.currentPassword)
      context.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["newPassword"],
        message: "Escolha uma senha diferente da atual.",
      })
    if (value.confirmPassword && value.confirmPassword !== value.newPassword)
      context.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["confirmPassword"],
        message: "As senhas não conferem. Digite a mesma nova senha.",
      })
  })

export type PasswordForm = z.infer<typeof passwordFormSchema>
export type PasswordField = keyof PasswordForm
export const passwordFields: PasswordField[] = ["currentPassword", "newPassword", "confirmPassword"]

export function passwordSuggestions(value: string) {
  return [
    { label: "Prefira 12 caracteres ou mais", met: value.length >= 12 },
    {
      label: "Combine letras maiúsculas e minúsculas",
      met: /\p{Lu}/u.test(value) && /\p{Ll}/u.test(value),
    },
    {
      label: "Inclua números e símbolos",
      met: /\d/.test(value) && /[^\p{L}\p{N}\s]/u.test(value),
    },
  ]
}
