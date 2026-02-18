import { NextResponse } from "next/server"
import { prisma } from "@/lib/db"

export async function GET() {
  try {
    let store = await prisma.store.findFirst({
      include: {
        hours: true,
        deliveryFees: true,
        paymentMethods: true,
      },
    })

    if (!store) {
      return NextResponse.json(
        { error: "Store not initialized. Run: npx prisma db seed" },
        { status: 503 }
      )
    }

    const categories = await prisma.category.findMany({
      orderBy: { sortOrder: "asc" },
    })

    const menuItems = await prisma.menuItem.findMany({
      orderBy: { name: "asc" },
      include: { variants: true },
    })

    const storeData = {
      name: store.name,
      address: store.address,
      city: store.city,
      state: store.state,
      phone: store.phone,
      whatsapp: store.whatsapp,
      instagram: store.instagram,
      about: store.about,
      pixKey: store.pixKey,
      paymentMethods: store.paymentMethods.map((p) => p.name),
      hours: store.hours.map((h) => ({ day: h.day, open: h.open, close: h.close })),
      deliveryFees: store.deliveryFees.map((f) => ({
        neighborhood: f.neighborhood,
        fee: f.fee,
      })),
    }

    const categoriesData = categories.map((c) => ({
      id: c.id,
      name: c.name,
      icon: c.icon,
    }))

    const menuItemsData = menuItems.map((m) => ({
      id: m.id,
      name: m.name,
      description: m.description,
      price: m.price,
      image: m.image,
      category: m.categoryId,
      available: m.available,
      variants: m.variants.map((v) => ({
        id: v.id,
        name: v.name,
        price: v.price,
        available: v.available,
      })),
    }))

    return NextResponse.json({
      store: storeData,
      categories: categoriesData,
      menuItems: menuItemsData,
    })
  } catch (error) {
    console.error("API /api/data error:", error)
    return NextResponse.json(
      { error: "Failed to fetch data" },
      { status: 500 }
    )
  }
}
