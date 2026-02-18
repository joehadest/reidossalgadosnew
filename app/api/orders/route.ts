import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/db"

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const {
      name,
      phone,
      address,
      neighborhood,
      complement,
      paymentMethod,
      changeFor,
      subtotal,
      deliveryFee,
      total,
      items,
    } = body

    if (!name || !phone || !address || !neighborhood || !paymentMethod || subtotal === undefined || deliveryFee === undefined || total === undefined || !Array.isArray(items)) {
      return NextResponse.json(
        { error: "name, phone, address, neighborhood, paymentMethod, subtotal, deliveryFee, total and items are required" },
        { status: 400 }
      )
    }

    const order = await prisma.order.create({
      data: {
        name,
        phone,
        address,
        neighborhood,
        complement: complement || null,
        paymentMethod,
        changeFor: changeFor || null,
        subtotal: parseFloat(String(subtotal)),
        deliveryFee: parseFloat(String(deliveryFee)),
        total: parseFloat(String(total)),
        items: {
          create: items.map((i: { itemId: string; variantId?: string; name: string; variantName?: string; price: number; quantity: number }) => ({
            itemId: i.itemId,
            variantId: i.variantId || null,
            name: i.name,
            variantName: i.variantName || null,
            price: parseFloat(String(i.price)),
            quantity: parseInt(String(i.quantity), 10),
          })),
        },
      },
      include: { items: true },
    })

    return NextResponse.json(order)
  } catch (error) {
    console.error("API POST /api/orders error:", error)
    return NextResponse.json(
      { error: "Failed to create order" },
      { status: 500 }
    )
  }
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const status = searchParams.get("status")
    const dateFilter = searchParams.get("date") // hoje | semana | todos
    const newOnly = searchParams.get("new") === "true"
    const page = parseInt(searchParams.get("page") || "1", 10)
    const limit = parseInt(searchParams.get("limit") || "50", 10)
    const skip = (page - 1) * limit

    const where: Record<string, unknown> = {}

    if (status) {
      where.status = status
    }

    if (newOnly) {
      where.status = "recebido"
      where.createdAt = {
        gte: new Date(Date.now() - 5 * 60 * 1000), // últimos 5 min
      }
    } else if (dateFilter === "hoje") {
      const today = new Date()
      today.setHours(0, 0, 0, 0)
      where.createdAt = { gte: today }
    } else if (dateFilter === "semana") {
      const weekAgo = new Date()
      weekAgo.setDate(weekAgo.getDate() - 7)
      where.createdAt = { gte: weekAgo }
    }

    const [orders, total] = await Promise.all([
      prisma.order.findMany({
        where,
        include: { items: true },
        orderBy: { createdAt: "desc" },
        skip,
        take: limit,
      }),
      prisma.order.count({ where }),
    ])

    return NextResponse.json({ orders, total })
  } catch (error) {
    console.error("API GET /api/orders error:", error)
    return NextResponse.json(
      { error: "Failed to fetch orders" },
      { status: 500 }
    )
  }
}
