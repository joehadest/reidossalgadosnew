import { NextRequest, NextResponse } from "next/server"
import type { PrismaClient } from "@prisma/client"
import { z } from "zod"
import { acceptsPix, paymentIdentity, paymentMethodSchema, pixKeySchema } from "./payment-methods"

const previousName = z.string().min(1).max(60)
const keyFields = { pixKey: pixKeySchema.optional(), previousPixKey: z.string().max(140).optional() }
const createSchema = z.object({ name: paymentMethodSchema, ...keyFields }).strict()
const renameSchema = z
  .object({ action: z.literal("rename"), previousName, name: paymentMethodSchema, ...keyFields })
  .strict()
const pixSchema = z
  .object({ action: z.literal("pix"), pixKey: pixKeySchema, previousPixKey: z.string().max(140) })
  .strict()
const updateSchema = z.discriminatedUnion("action", [renameSchema, pixSchema])
const deleteSchema = z.object({ name: previousName }).strict()

export function paymentHandlers(prisma: PrismaClient) {
  async function mutate(request: NextRequest, method: "POST" | "PATCH" | "DELETE") {
    try {
      const body = await request.json()
      const parsed = (
        method === "POST" ? createSchema : method === "PATCH" ? updateSchema : deleteSchema
      ).safeParse(body)
      if (!parsed.success)
        return NextResponse.json({ error: parsed.error.issues[0].message }, { status: 400 })
      const create = method === "POST" ? createSchema.parse(body) : null
      const update = method === "PATCH" ? updateSchema.parse(body) : null
      const remove = method === "DELETE" ? deleteSchema.parse(body) : null
      const rename = update?.action === "rename" ? update : null
      const data = create ?? rename
      const keyUpdate = create ?? update
      if (keyUpdate?.pixKey !== undefined && keyUpdate.previousPixKey === undefined)
        return NextResponse.json(
          { error: "Informe a configuração anterior do Pix. Atualize a página." },
          { status: 400 },
        )
      const result = await prisma.$transaction(async (tx) => {
        const found = await tx.store.findFirst({ select: { id: true } })
        if (!found) throw new Error("STORE_MISSING")
        const locked = await tx.$queryRaw<
          { id: string }[]
        >`SELECT id FROM "Store" WHERE id = ${found.id} FOR UPDATE`
        if (!locked.length) throw new Error("STORE_MISSING")
        const store = await tx.store.findUnique({
          where: { id: found.id },
          select: { pixKey: true, paymentMethods: { select: { id: true, name: true } } },
        })
        if (!store) throw new Error("STORE_MISSING")
        const target = rename?.previousName ?? remove?.name
        const current = target ? store.paymentMethods.find((entry) => entry.name === target) : undefined
        if (target && !current) throw new Error("METHOD_CHANGED")
        if (
          data &&
          store.paymentMethods.some(
            (entry) => entry.id !== current?.id && paymentIdentity(entry.name) === paymentIdentity(data.name),
          )
        )
          throw new Error("METHOD_DUPLICATE")
        if (create && store.paymentMethods.length >= 30) throw new Error("METHOD_LIMIT")
        if (keyUpdate?.pixKey !== undefined && keyUpdate.previousPixKey !== store.pixKey)
          throw new Error("PIX_CHANGED")
        const names = store.paymentMethods
          .filter((entry) => entry.id !== current?.id)
          .map((entry) => entry.name)
        if (data) names.push(data.name)
        const key = keyUpdate?.pixKey ?? store.pixKey
        if (acceptsPix(names) && !key.trim()) throw new Error("PIX_REQUIRED")
        if (keyUpdate?.pixKey !== undefined)
          await tx.store.update({ where: { id: found.id }, data: { pixKey: key } })
        if (create) await tx.paymentMethod.create({ data: { storeId: found.id, name: create.name } })
        if (rename) await tx.paymentMethod.update({ where: { id: current!.id }, data: { name: rename.name } })
        if (remove) await tx.paymentMethod.delete({ where: { id: current!.id } })
        const methods = await tx.paymentMethod.findMany({
          where: { storeId: found.id },
          select: { name: true },
          orderBy: { name: "asc" },
        })
        return { paymentMethods: methods.map((entry) => entry.name), pixKey: key }
      })
      return NextResponse.json(result, { status: create ? 201 : 200 })
    } catch (error) {
      const known: Record<string, [number, string]> = {
        STORE_MISSING: [404, "Loja não encontrada."],
        METHOD_CHANGED: [
          409,
          "Esta forma de pagamento foi removida ou renomeada em outra sessão. Atualize a página.",
        ],
        METHOD_DUPLICATE: [409, "Já existe uma forma de pagamento com esse nome."],
        METHOD_LIMIT: [400, "O limite é de 30 formas de pagamento."],
        PIX_CHANGED: [409, "A chave Pix mudou em outra sessão. Atualize a página antes de continuar."],
        PIX_REQUIRED: [400, "Informe a chave Pix para continuar oferecendo esse pagamento."],
      }
      const result = error instanceof Error ? known[error.message] : undefined
      if (result) return NextResponse.json({ error: result[1] }, { status: result[0] })
      if (error instanceof SyntaxError || error instanceof z.ZodError)
        return NextResponse.json({ error: "Dados de pagamento inválidos." }, { status: 400 })
      console.error("Payment configuration mutation failed:", error)
      return NextResponse.json(
        { error: "Não foi possível salvar. Suas alterações continuam no formulário." },
        { status: 500 },
      )
    }
  }
  return {
    POST: (request: NextRequest) => mutate(request, "POST"),
    PATCH: (request: NextRequest) => mutate(request, "PATCH"),
    DELETE: (request: NextRequest) => mutate(request, "DELETE"),
  }
}
