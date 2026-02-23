import { NextRequest, NextResponse } from "next/server"
import { compare } from "bcryptjs"
import { prisma } from "@/lib/db"

const DEFAULT_PASSWORD = "admin123"

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const password = typeof body.password === "string" ? body.password.trim() : ""
    if (!password) {
      return NextResponse.json({ error: "Senha obrigatória" }, { status: 400 })
    }

    const store = await prisma.store.findFirst({ select: { adminPasswordHash: true } })
    let valid = false
    if (store?.adminPasswordHash) {
      valid = await compare(password, store.adminPasswordHash)
    } else {
      valid = password === DEFAULT_PASSWORD
    }

    if (!valid) {
      return NextResponse.json({ error: "Senha incorreta" }, { status: 401 })
    }
    return NextResponse.json({ ok: true })
  } catch (e) {
    console.error("API POST /api/admin/login error:", e)
    return NextResponse.json({ error: "Erro ao validar senha" }, { status: 500 })
  }
}
