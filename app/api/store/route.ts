import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/db"

export async function PATCH(request: NextRequest) {
  try {
    const body = await request.json()
    const store = await prisma.store.findFirst()
    if (!store) {
      return NextResponse.json({ error: "Store not found" }, { status: 404 })
    }

    const {
      name,
      address,
      city,
      state,
      phone,
      whatsapp,
      instagram,
      about,
      pixKey,
      paymentMethods,
      hours,
      deliveryFees,
    } = body

    const basicFields = {
      name,
      address,
      city,
      state,
      phone,
      whatsapp,
      instagram,
      about,
      pixKey,
    }
    const hasBasicUpdate = Object.entries(basicFields).some(
      ([, v]) => v !== undefined
    )
    if (hasBasicUpdate) {
      await prisma.store.update({
        where: { id: store.id },
        data: Object.fromEntries(
          Object.entries(basicFields).filter(([, v]) => v !== undefined)
        ) as Record<string, string>,
      })
    }

    if (paymentMethods !== undefined) {
      await prisma.paymentMethod.deleteMany({ where: { storeId: store.id } })
      if (paymentMethods.length > 0) {
        await prisma.paymentMethod.createMany({
          data: paymentMethods.map((name: string) => ({
            storeId: store.id,
            name,
          })),
        })
      }
    }

    if (hours !== undefined) {
      await prisma.storeHour.deleteMany({ where: { storeId: store.id } })
      if (hours.length > 0) {
        await prisma.storeHour.createMany({
          data: hours.map((h: { day: string; open: string; close: string }) => ({
            storeId: store.id,
            day: h.day,
            open: h.open,
            close: h.close,
          })),
        })
      }
    }

    if (deliveryFees !== undefined) {
      await prisma.deliveryFee.deleteMany({ where: { storeId: store.id } })
      if (deliveryFees.length > 0) {
        await prisma.deliveryFee.createMany({
          data: deliveryFees.map(
            (f: { neighborhood: string; fee: number }) => ({
              storeId: store.id,
              neighborhood: f.neighborhood,
              fee: f.fee,
            })
          ),
        })
      }
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error("API /api/store error:", error)
    return NextResponse.json(
      { error: "Failed to update store" },
      { status: 500 }
    )
  }
}
