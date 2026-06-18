import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/db"
import { normalizeStoreHours } from "@/lib/store-hours"

function isValidHourEntry(h: {
  day?: string
  open?: string
  close?: string
  closed?: boolean
}) {
  if (!h?.day) return false
  if (h.closed) return true
  return Boolean(h.open && h.close)
}

export async function PATCH(request: NextRequest) {
  try {
    const body = await request.json()
    const hours = body.hours ?? body

    if (!Array.isArray(hours)) {
      return NextResponse.json({ error: "hours must be an array" }, { status: 400 })
    }

    const store = await prisma.store.findFirst()
    if (!store) {
      return NextResponse.json({ error: "Store not found" }, { status: 404 })
    }

    await prisma.storeHour.deleteMany({ where: { storeId: store.id } })

    const normalized = normalizeStoreHours(hours)
    for (const h of normalized) {
      if (!isValidHourEntry(h)) continue
      await prisma.storeHour.create({
        data: {
          storeId: store.id,
          day: String(h.day),
          open: String(h.open || "00:00"),
          close: String(h.close || "00:00"),
          closed: Boolean(h.closed),
        },
      })
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error("API /api/store/hours error:", error)
    const err = error instanceof Error ? error : new Error(String(error))
    return NextResponse.json(
      { error: err.message },
      { status: 500 }
    )
  }
}
