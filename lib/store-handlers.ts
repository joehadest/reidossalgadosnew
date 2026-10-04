import { NextRequest, NextResponse } from "next/server"
import type { PrismaClient } from "@prisma/client"
import { normalizeStoreHours } from "./store-hours"
import { storeUpdateSchema, storeInfoKeys, hasPix } from "./store-info-validation"

export function storeHandlers(prisma: PrismaClient) {
  async function PATCH(request: NextRequest) {
    try {
      const parsed = storeUpdateSchema.safeParse(await request.json())
      if (!parsed.success)
        return NextResponse.json(
          { error: parsed.error.issues[0].message, fields: parsed.error.flatten().fieldErrors },
          { status: 400 },
        )
      const body = parsed.data
      const result = await prisma.$transaction(async (tx) => {
        const current = await tx.store.findFirst({ select: { id: true } })
        if (!current) throw new Error("STORE_MISSING")
        // Serialize configuration edits before checking the Pix/key dependency.
        await tx.$queryRaw`SELECT id FROM "Store" WHERE id = ${current.id} FOR UPDATE`
        const store = await tx.store.findUnique({
          where: { id: current.id },
          include: { paymentMethods: true },
        })
        if (!store) throw new Error("STORE_MISSING")
        if (
          (body.pixKey !== undefined || body.paymentMethods !== undefined) &&
          hasPix(body.paymentMethods ?? store.paymentMethods.map((method) => method.name)) &&
          !(body.pixKey ?? store.pixKey).trim()
        )
          throw new Error("STORE_PIX_REQUIRED")
        const fields = Object.fromEntries(
          storeInfoKeys.filter((key) => body[key] !== undefined).map((key) => [key, body[key]]),
        )
        const canonical: Record<string, unknown> = {}
        if (Object.keys(fields).length) {
          const saved = await tx.store.update({
            where: { id: store.id },
            data: fields,
            select: Object.fromEntries(storeInfoKeys.map((key) => [key, true])),
          })
          for (const key of storeInfoKeys) canonical[key] = saved[key]
        }
        if (body.paymentMethods !== undefined) {
          await tx.paymentMethod.deleteMany({ where: { storeId: store.id } })
          if (body.paymentMethods.length)
            await tx.paymentMethod.createMany({
              data: body.paymentMethods.map((name) => ({ storeId: store.id, name })),
            })
          canonical.paymentMethods = body.paymentMethods
        }
        if (body.hours !== undefined) {
          const hours = normalizeStoreHours(
            body.hours.map((hour) => ({ ...hour, open: hour.open ?? "15:30", close: hour.close ?? "21:00" })),
          )
          await tx.storeHour.deleteMany({ where: { storeId: store.id } })
          await tx.storeHour.createMany({
            data: hours.map((hour) => ({ storeId: store.id, ...hour, closed: !!hour.closed })),
          })
          canonical.hours = hours
        }
        if (body.deliveryFees !== undefined) {
          await tx.deliveryFee.deleteMany({ where: { storeId: store.id } })
          if (body.deliveryFees.length)
            await tx.deliveryFee.createMany({
              data: body.deliveryFees.map((fee) => ({ storeId: store.id, ...fee })),
            })
          canonical.deliveryFees = body.deliveryFees
        }
        return canonical
      })
      return NextResponse.json({ success: true, store: result })
    } catch (error) {
      if (error instanceof SyntaxError)
        return NextResponse.json({ error: "Dados da loja inválidos." }, { status: 400 })
      if (error instanceof Error && error.message === "STORE_MISSING")
        return NextResponse.json({ error: "Loja não encontrada." }, { status: 404 })
      if (error instanceof Error && error.message === "STORE_PIX_REQUIRED")
        return NextResponse.json(
          {
            error: "Informe uma chave Pix antes de oferecer esse pagamento.",
            fields: { pixKey: ["Informe a chave Pix."] },
          },
          { status: 400 },
        )
      console.error("Store update failed:", error)
      return NextResponse.json(
        { error: "Não foi possível salvar as informações. Tente novamente." },
        { status: 500 },
      )
    }
  }
  return { PATCH }
}
