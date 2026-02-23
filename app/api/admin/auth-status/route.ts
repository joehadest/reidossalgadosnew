import { NextResponse } from "next/server"
import { prisma } from "@/lib/db"

export async function GET() {
  try {
    const store = await prisma.store.findFirst({ select: { adminPasswordHash: true } })
    const usingDefaultPassword = !store?.adminPasswordHash
    return NextResponse.json({ usingDefaultPassword })
  } catch {
    return NextResponse.json({ usingDefaultPassword: true }, { status: 200 })
  }
}
