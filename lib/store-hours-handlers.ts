import { NextRequest, NextResponse } from "next/server"
import type { PrismaClient } from "@prisma/client"
import { z } from "zod"
import { previousHoursSchema, sameHours, weekHoursSchema } from "./hours-management"

const updateSchema = z
  .object({ hours: weekHoursSchema, previousHours: previousHoursSchema.optional() })
  .strict()
export function storeHoursHandlers(prisma: PrismaClient) {
  async function PATCH(request: NextRequest) {
    try {
      const input = await request.json()
      const parsed = updateSchema.safeParse(Array.isArray(input) ? { hours: input } : input)
      if (!parsed.success)
        return NextResponse.json({ error: parsed.error.issues[0].message }, { status: 400 })
      const { hours, previousHours } = parsed.data
      const result = await prisma.$transaction(async (tx) => {
        const store = await tx.store.findFirst({ select: { id: true } })
        if (!store) throw new Error("STORE_MISSING")
        const locked = await tx.$queryRaw<
          { id: string }[]
        >`SELECT id FROM "Store" WHERE id = ${store.id} FOR UPDATE`
        if (!locked.length) throw new Error("STORE_MISSING")
        const current = await tx.storeHour.findMany({
          where: { storeId: store.id },
          select: { day: true, open: true, close: true, closed: true },
        })
        if (previousHours && !sameHours(previousHours, current)) throw new Error("HOURS_CHANGED")
        await tx.storeHour.deleteMany({ where: { storeId: store.id } })
        await tx.storeHour.createMany({
          data: hours.map((entry) => ({ ...entry, closed: !!entry.closed, storeId: store.id })),
        })
        return hours
      })
      return NextResponse.json({ success: true, hours: result })
    } catch (error) {
      if (error instanceof SyntaxError)
        return NextResponse.json({ error: "Dados dos horários inválidos." }, { status: 400 })
      if (error instanceof Error && error.message === "STORE_MISSING")
        return NextResponse.json({ error: "Loja não encontrada." }, { status: 404 })
      if (error instanceof Error && error.message === "HOURS_CHANGED")
        return NextResponse.json(
          { error: "Os horários mudaram em outra sessão. Atualize a página antes de salvar." },
          { status: 409 },
        )
      console.error("Store hours update failed:", error)
      return NextResponse.json(
        { error: "Não foi possível salvar os horários. Suas alterações continuam aqui." },
        { status: 500 },
      )
    }
  }
  return { PATCH }
}
