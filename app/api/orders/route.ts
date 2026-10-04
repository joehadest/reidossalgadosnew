import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/db"
import { parseOrderQuery, orderBaseWhere } from "@/lib/order-query"

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
    const query = parseOrderQuery(request.nextUrl.searchParams)
    const baseWhere = orderBaseWhere(query)
    const where = query.status && !query.newOnly ? { ...baseWhere, status: query.status } : baseWhere
    const total = await prisma.order.count({ where })
    const pages = Math.max(1, Math.ceil(total / query.limit))
    const page = Math.min(query.page, pages)
    const [orders, grouped, revenue, globalTotal] = await Promise.all([
      prisma.order.findMany({
        where,
        include: { items: true },
        orderBy: [{ createdAt: "desc" }, { id: "desc" }],
        skip: (page - 1) * query.limit,
        take: query.limit,
      }),
      query.withSummary ? prisma.order.groupBy({ by: ["status"], where: baseWhere, _count: true }) : null,
      query.withSummary ? prisma.order.aggregate({ where: { AND: [baseWhere, { status: { not: "cancelado" } }] }, _sum: { total: true } }) : null,
      query.withSummary ? prisma.order.count() : null,
    ])
    return NextResponse.json({
      orders, total, page, pages,
      ...(grouped && revenue ? {
        globalTotal,
        summary: {
          counts: Object.fromEntries(grouped.map((entry) => [entry.status, entry._count])),
          total: grouped.reduce((sum, entry) => sum + entry._count, 0),
          revenue: revenue._sum.total ?? 0,
        },
      } : {}),
    }, { headers: { "Cache-Control": "no-store" } })
  } catch (error) {
    console.error("API GET /api/orders error:", error)
    return NextResponse.json(
      { error: "Failed to fetch orders" },
      { status: 500 }
    )
  }
}

export async function DELETE() {
  try {
    const result = await prisma.order.deleteMany({})
    return NextResponse.json({ deleted: result.count })
  } catch (error) {
    console.error("API DELETE /api/orders error:", error)
    return NextResponse.json(
      { error: "Failed to delete orders" },
      { status: 500 }
    )
  }
}
