import { NextResponse } from "next/server"
import type { PrismaClient } from "@prisma/client"
import { compare } from "bcryptjs"
import { adminLoginSchema, DEFAULT_ADMIN_PASSWORD } from "./admin-password"

export function adminLoginHandler(prisma: PrismaClient) {
  return async function POST(request: Request) {
    try {
      const parsed = adminLoginSchema.safeParse(await request.json())
      if (!parsed.success)
        return NextResponse.json({ error: "Informe uma senha de acesso válida." }, { status: 400 })
      const store = await prisma.store.findFirst({ select: { adminPasswordHash: true } })
      if (!store)
        return NextResponse.json(
          { error: "O acesso ao painel está indisponível. Tente novamente em instantes." },
          { status: 503 },
        )
      const valid = store.adminPasswordHash
        ? await compare(parsed.data.password, store.adminPasswordHash)
        : parsed.data.password === DEFAULT_ADMIN_PASSWORD
      if (!valid)
        return NextResponse.json(
          { error: "Senha incorreta. Confira e tente novamente." },
          { status: 401 },
        )
      return NextResponse.json({ ok: true }, { headers: { "Cache-Control": "no-store" } })
    } catch (error) {
      if (error instanceof SyntaxError)
        return NextResponse.json(
          { error: "Dados inválidos. Confira a senha e tente novamente." },
          { status: 400 },
        )
      return NextResponse.json(
        { error: "Não foi possível validar o acesso. Tente novamente em instantes." },
        { status: 503 },
      )
    }
  }
}
