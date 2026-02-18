import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/db"

export async function PATCH(request: NextRequest) {
  try {
    const body = await request.json()
    const { ids } = body as { ids: string[] }
    if (!Array.isArray(ids) || ids.length === 0) {
      return NextResponse.json(
        { error: "ids array is required" },
        { status: 400 }
      )
    }
    await prisma.$transaction(
      ids.map((id, index) =>
        prisma.category.update({
          where: { id },
          data: { sortOrder: index },
        })
      )
    )
    return NextResponse.json({ success: true })
  } catch (error) {
    console.error("API PATCH /api/categories/reorder error:", error)
    return NextResponse.json(
      { error: "Failed to reorder categories" },
      { status: 500 }
    )
  }
}
