import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/db"

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { id, name, description, price, image, category, variants } = body
    if (!name || !description || price === undefined || !category) {
      return NextResponse.json(
        { error: "name, description, price and category are required" },
        { status: 400 }
      )
    }
    const item = await prisma.menuItem.create({
      data: {
        id: id || undefined,
        name,
        description,
        price: parseFloat(String(price)),
        image: image || "/images/hero-bg.jpg",
        categoryId: category,
      },
    })
    const variantsList = Array.isArray(variants) ? variants : []
    if (variantsList.length > 0) {
      await prisma.menuItemVariant.createMany({
        data: variantsList.map((v: { name: string; price: number; available?: boolean }) => ({
          menuItemId: item.id,
          name: v.name,
          price: parseFloat(String(v.price)),
          available: v.available !== false,
        })),
      })
    }
    const withVariants = await prisma.menuItem.findUnique({
      where: { id: item.id },
      include: { variants: true },
    })
    return NextResponse.json({
      id: withVariants!.id,
      name: withVariants!.name,
      description: withVariants!.description,
      price: withVariants!.price,
      image: withVariants!.image,
      category: withVariants!.categoryId,
      variants: withVariants!.variants.map((v) => ({
        id: v.id,
        name: v.name,
        price: v.price,
        available: v.available,
      })),
    })
  } catch (error) {
    console.error("API POST /api/menu error:", error)
    return NextResponse.json(
      { error: "Failed to create menu item" },
      { status: 500 }
    )
  }
}
