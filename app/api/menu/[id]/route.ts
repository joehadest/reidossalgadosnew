import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/db"

export const dynamic = "force-dynamic"

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const body = await request.json()
    const { name, description, price, image, category, available, variants } = body

    const updateData: {
      name?: string
      description?: string
      price?: number
      image?: string
      categoryId?: string
      available?: boolean
    } = {}
    if (name !== undefined) updateData.name = name
    if (description !== undefined) updateData.description = description
    if (price !== undefined) updateData.price = parseFloat(String(price))
    if (image !== undefined) updateData.image = image
    if (category !== undefined) updateData.categoryId = category
    if (available !== undefined) updateData.available = Boolean(available)

    if (Object.keys(updateData).length > 0) {
      await prisma.menuItem.update({
        where: { id },
        data: updateData,
      })
    }

    if (variants !== undefined && Array.isArray(variants)) {
      await prisma.menuItemVariant.deleteMany({ where: { menuItemId: id } })
      if (variants.length > 0) {
        await prisma.menuItemVariant.createMany({
          data: variants.map((v: { name: string; price: number; available?: boolean }) => ({
            menuItemId: id,
            name: v.name,
            price: parseFloat(String(v.price)),
            available: v.available !== false,
          })),
        })
      }
    }

    const item = await prisma.menuItem.findUnique({
      where: { id },
      include: { variants: true },
    })
    if (!item) return NextResponse.json({ error: "Not found" }, { status: 404 })
    return NextResponse.json({
      id: item.id,
      name: item.name,
      description: item.description,
      price: item.price,
      image: item.image,
      category: item.categoryId,
      available: item.available,
      variants: item.variants.map((v) => ({
        id: v.id,
        name: v.name,
        price: v.price,
        available: v.available,
      })),
    })
  } catch (error) {
    const err = error as Error & { code?: string; meta?: unknown }
    console.error("API PATCH /api/menu/[id] error:", err.message, err.code, err.meta)
    const message = err.message || "Failed to update menu item"
    return NextResponse.json(
      { error: message },
      { status: 500 }
    )
  }
}

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    await prisma.menuItem.delete({ where: { id } })
    return NextResponse.json({ success: true })
  } catch (error) {
    console.error("API DELETE /api/menu/[id] error:", error)
    return NextResponse.json(
      { error: "Failed to delete menu item" },
      { status: 500 }
    )
  }
}
