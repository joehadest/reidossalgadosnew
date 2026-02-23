import { NextRequest, NextResponse } from "next/server"
import { compare, hash } from "bcryptjs"
import { prisma } from "@/lib/db"

const DEFAULT_PASSWORD = "admin123"

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const currentPassword = typeof body.currentPassword === "string" ? body.currentPassword.trim() : ""
    const newPassword = typeof body.newPassword === "string" ? body.newPassword.trim() : ""
    if (!currentPassword || !newPassword) {
      return NextResponse.json(
        { error: "Senha atual e nova senha são obrigatórias" },
        { status: 400 }
      )
    }
    if (newPassword.length < 6) {
      return NextResponse.json(
        { error: "A nova senha deve ter no mínimo 6 caracteres" },
        { status: 400 }
      )
    }

    const store = await prisma.store.findFirst()
    if (!store) {
      return NextResponse.json({ error: "Loja não encontrada" }, { status: 404 })
    }

    let currentValid = false
    if (store.adminPasswordHash) {
      currentValid = await compare(currentPassword, store.adminPasswordHash)
    } else {
      currentValid = currentPassword === DEFAULT_PASSWORD
    }
    if (!currentValid) {
      return NextResponse.json({ error: "Senha atual incorreta" }, { status: 401 })
    }

    const adminPasswordHash = await hash(newPassword, 10)
    await prisma.store.update({
      where: { id: store.id },
      data: { adminPasswordHash },
    })
    return NextResponse.json({ ok: true })
  } catch (e) {
    console.error("API POST /api/admin/change-password error:", e)
    return NextResponse.json({ error: "Erro ao alterar senha" }, { status: 500 })
  }
}
