import { NextRequest, NextResponse } from "next/server"
import type { PrismaClient } from "@prisma/client"
import { z } from "zod"
import { deliveryFeeSchema, normalizeNeighborhood } from "./delivery-fees"

const previousSchema = z
  .object({ neighborhood: z.string().min(1).max(120), fee: z.number().finite().nonnegative() })
  .strict()
const updateSchema = z.object({ previous: previousSchema, data: deliveryFeeSchema }).strict()
const deleteSchema = z.object({ previous: previousSchema }).strict()

export function deliveryFeeHandlers(prisma: PrismaClient) {
  async function mutate(request: NextRequest, method: "POST" | "PATCH" | "DELETE") {
    try {
      const body: unknown = await request.json()
      const parsed = (
        method === "POST" ? deliveryFeeSchema : method === "PATCH" ? updateSchema : deleteSchema
      ).safeParse(body)
      if (!parsed.success)
        return NextResponse.json({ error: parsed.error.issues[0].message }, { status: 400 })
      const previous =
        method === "POST"
          ? null
          : method === "PATCH"
            ? updateSchema.parse(body).previous
            : deleteSchema.parse(body).previous
      const data =
        method === "DELETE"
          ? null
          : method === "POST"
            ? deliveryFeeSchema.parse(body)
            : updateSchema.parse(body).data
      const result = await prisma.$transaction(async (tx) => {
        const store = await tx.store.findFirst({ select: { id: true } })
        if (!store) throw new Error("STORE_MISSING")
        // The shared store lock also serializes legacy bulk configuration updates.
        const locked = await tx.$queryRaw<
          { id: string }[]
        >`SELECT id FROM "Store" WHERE id = ${store.id} FOR UPDATE`
        if (!locked.length) throw new Error("STORE_MISSING")
        const fees = await tx.deliveryFee.findMany({ where: { storeId: store.id } })
        const current = previous ? fees.find((fee) => fee.neighborhood === previous.neighborhood) : null
        if (previous && !current) throw new Error("FEE_MISSING")
        if (previous && current?.fee !== previous.fee) throw new Error("FEE_CHANGED")
        if (
          data &&
          fees.some(
            (fee) =>
              fee.id !== current?.id &&
              normalizeNeighborhood(fee.neighborhood) === normalizeNeighborhood(data.neighborhood),
          )
        )
          throw new Error("FEE_DUPLICATE")
        if (method === "POST") {
          if (fees.length >= 500) throw new Error("FEE_LIMIT")
          await tx.deliveryFee.create({ data: { storeId: store.id, ...data! } })
        } else if (method === "PATCH") {
          await tx.deliveryFee.update({ where: { id: current!.id }, data: data! })
        } else {
          await tx.deliveryFee.delete({ where: { id: current!.id } })
        }
        return tx.deliveryFee.findMany({
          where: { storeId: store.id },
          select: { neighborhood: true, fee: true },
          orderBy: { neighborhood: "asc" },
        })
      })
      return NextResponse.json({ deliveryFees: result }, { status: method === "POST" ? 201 : 200 })
    } catch (error) {
      const known: Record<string, [number, string]> = {
        STORE_MISSING: [404, "Loja não encontrada."],
        FEE_MISSING: [409, "Este bairro foi removido ou renomeado em outra sessão. Atualize a página."],
        FEE_CHANGED: [
          409,
          "A taxa deste bairro mudou em outra sessão. Atualize a página antes de continuar.",
        ],
        FEE_DUPLICATE: [409, "Já existe um bairro com esse nome."],
        FEE_LIMIT: [400, "O limite é de 500 bairros cadastrados."],
      }
      const result = error instanceof Error ? known[error.message] : undefined
      if (result) return NextResponse.json({ error: result[1] }, { status: result[0] })
      if (error instanceof SyntaxError || error instanceof z.ZodError)
        return NextResponse.json({ error: "Dados da entrega inválidos." }, { status: 400 })
      console.error("Delivery fee mutation failed:", error)
      return NextResponse.json(
        { error: "Não foi possível salvar a alteração. Tente novamente." },
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
