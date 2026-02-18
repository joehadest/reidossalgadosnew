import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/db"

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { id, name, icon } = body
    if (!id || !name || !icon) {
      return NextResponse.json(
        { error: "id, name and icon are required" },
        { status: 400 }
      )
    }
    const maxOrder = await prisma.category.aggregate({
      _max: { sortOrder: true },
    })
    const sortOrder = (maxOrder._max.sortOrder ?? -1) + 1
    const category = await prisma.category.create({
      data: { id, name, icon, sortOrder },
    })
    return NextResponse.json({
      id: category.id,
      name: category.name,
      icon: category.icon,
      sortOrder: category.sortOrder,
    })
  } catch (error) {
    console.error("API POST /api/categories error:", error)
    return NextResponse.json(
      { error: "Failed to create category" },
      { status: 500 }
    )
  }
}
