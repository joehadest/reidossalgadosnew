import { NextResponse } from "next/server"
import type { PrismaClient } from "@prisma/client"
import { compare, hash } from "bcryptjs"
import { DEFAULT_ADMIN_PASSWORD, passwordChangeSchema } from "./admin-password"

export function adminPasswordHandlers(prisma: PrismaClient) {
  async function GET() {
    try {
      const store = await prisma.store.findFirst({
        select: { adminPasswordHash: true },
      })
      if (!store) return NextResponse.json({ error: "Loja não encontrada." }, { status: 404 })
      return NextResponse.json(
        { usingDefaultPassword: !store.adminPasswordHash },
        { headers: { "Cache-Control": "no-store" } },
      )
    } catch {
      return NextResponse.json(
        { error: "Não foi possível consultar o status de acesso." },
        { status: 503 },
      )
    }
  }
  async function POST(request: Request) {
    try {
      const parsed = passwordChangeSchema.safeParse(await request.json())
      if (!parsed.success)
        return NextResponse.json(
          {
            error: parsed.error.issues[0].message,
            fields: parsed.error.flatten().fieldErrors,
          },
          { status: 400 },
        )
      const { currentPassword, newPassword } = parsed.data
      const store = await prisma.store.findFirst({
        select: { id: true, adminPasswordHash: true },
      })
      if (!store) return NextResponse.json({ error: "Loja não encontrada." }, { status: 404 })
      const valid = store.adminPasswordHash
        ? await compare(currentPassword, store.adminPasswordHash)
        : currentPassword === DEFAULT_ADMIN_PASSWORD
      if (!valid)
        return NextResponse.json(
          {
            error: "Senha atual incorreta. Confira e tente novamente.",
            fields: { currentPassword: ["Senha atual incorreta."] },
          },
          { status: 401 },
        )
      // Also reject equivalent passwords against legacy hashes.
      if (store.adminPasswordHash && (await compare(newPassword, store.adminPasswordHash)))
        return NextResponse.json(
          {
            error: "Escolha uma senha diferente da atual.",
            fields: { newPassword: ["Escolha uma senha diferente da atual."] },
          },
          { status: 400 },
        )
      const adminPasswordHash = await hash(newPassword, 10)
      // Compare-and-swap prevents a concurrent change from being overwritten.
      const result = await prisma.store.updateMany({
        where: { id: store.id, adminPasswordHash: store.adminPasswordHash },
        data: { adminPasswordHash },
      })
      if (result.count !== 1)
        return NextResponse.json(
          {
            error:
              "A senha foi alterada em outro acesso. Informe a senha atualizada e tente novamente.",
            fields: { currentPassword: ["Informe a senha atualizada."] },
          },
          { status: 409 },
        )
      return NextResponse.json({ ok: true })
    } catch (error) {
      if (error instanceof SyntaxError)
        return NextResponse.json(
          { error: "Dados inválidos. Confira o formulário." },
          { status: 400 },
        )
      return NextResponse.json(
        { error: "Não foi possível alterar a senha. Tente novamente." },
        { status: 500 },
      )
    }
  }
  return { GET, POST }
}
