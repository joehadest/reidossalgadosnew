import { NextRequest, NextResponse } from "next/server"
import type { PrismaClient, Prisma } from "@prisma/client"
import {
  categoryCreateSchema,
  categoryUpdateSchema,
  categoryOrderSchema,
  normalizeCategoryName,
} from "./category-validation"

const orderBy = [{ sortOrder: "asc" }, { id: "asc" }] satisfies Prisma.CategoryOrderByWithRelationInput[]
const select = { id: true, name: true, icon: true, sortOrder: true }

// Serialize category changes so creation, renaming and reordering agree on the same list.
async function lockCategories(tx: Prisma.TransactionClient) {
  await tx.$executeRaw`SELECT pg_advisory_xact_lock(74821031)`
}
function failure(error: unknown) {
  const message = error instanceof Error ? error.message : ""
  const known: Record<string, [number, string]> = {
    CATEGORY_MISSING: [404, "Esta categoria não existe mais. Atualize a página."],
    CATEGORY_DUPLICATE: [409, "Já existe uma categoria com esse nome."],
    CATEGORY_NOT_EMPTY: [409, "Mova os produtos para outra categoria antes de excluir esta."],
    CATEGORY_STALE_ORDER: [
      409,
      "As categorias mudaram em outra sessão. Atualize a página antes de reordenar.",
    ],
  }
  const result = known[message]
  if (result) return NextResponse.json({ error: result[1] }, { status: result[0] })
  if (error instanceof SyntaxError) return NextResponse.json({ error: "Dados inválidos." }, { status: 400 })
  const code = (error as { code?: string })?.code
  if (code === "P2002")
    return NextResponse.json({ error: "Esta categoria já foi cadastrada." }, { status: 409 })
  if (code === "P2025")
    return NextResponse.json({ error: "Esta categoria não existe mais." }, { status: 404 })
  console.error("Category mutation failed:", error)
  return NextResponse.json(
    { error: "Não foi possível salvar a alteração. Tente novamente." },
    { status: 500 },
  )
}

export function categoryHandlers(prisma: PrismaClient) {
  async function POST(request: NextRequest) {
    try {
      const parsed = categoryCreateSchema.safeParse(await request.json())
      if (!parsed.success)
        return NextResponse.json({ error: parsed.error.issues[0].message }, { status: 400 })
      const created = await prisma.$transaction(async (tx) => {
        await lockCategories(tx)
        const categories = await tx.category.findMany({ orderBy, select })
        if (
          categories.some(
            (cat) => normalizeCategoryName(cat.name) === normalizeCategoryName(parsed.data.name),
          )
        )
          throw new Error("CATEGORY_DUPLICATE")
        return tx.category.create({
          data: { ...parsed.data, sortOrder: Math.max(-1, ...categories.map((cat) => cat.sortOrder)) + 1 },
          select,
        })
      })
      return NextResponse.json(created, { status: 201 })
    } catch (error) {
      return failure(error)
    }
  }

  async function PATCH(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
    try {
      const { id } = await params
      const parsed = categoryUpdateSchema.safeParse(await request.json())
      if (!parsed.success)
        return NextResponse.json({ error: parsed.error.issues[0].message }, { status: 400 })
      const updated = await prisma.$transaction(async (tx) => {
        await lockCategories(tx)
        const categories = await tx.category.findMany({ orderBy, select })
        if (!categories.some((cat) => cat.id === id)) throw new Error("CATEGORY_MISSING")
        if (
          parsed.data.name &&
          categories.some(
            (cat) =>
              cat.id !== id && normalizeCategoryName(cat.name) === normalizeCategoryName(parsed.data.name!),
          )
        )
          throw new Error("CATEGORY_DUPLICATE")
        return tx.category.update({ where: { id }, data: parsed.data, select })
      })
      return NextResponse.json(updated)
    } catch (error) {
      return failure(error)
    }
  }

  async function DELETE(_request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
    try {
      const { id } = await params
      await prisma.$transaction(async (tx) => {
        await lockCategories(tx)
        // Blocks new product FK references until the empty check and delete finish.
        const locked = await tx.$queryRaw<
          { id: string }[]
        >`SELECT id FROM "Category" WHERE id = ${id} FOR UPDATE`
        if (!locked.length) throw new Error("CATEGORY_MISSING")
        const category = await tx.category.findUnique({
          where: { id },
          select: { _count: { select: { menuItems: true } } },
        })
        if (!category) throw new Error("CATEGORY_MISSING")
        if (category._count.menuItems > 0) throw new Error("CATEGORY_NOT_EMPTY")
        await tx.category.delete({ where: { id } })
      })
      return NextResponse.json({ success: true })
    } catch (error) {
      return failure(error)
    }
  }

  async function REORDER(request: NextRequest) {
    try {
      const parsed = categoryOrderSchema.safeParse(await request.json())
      if (!parsed.success)
        return NextResponse.json(
          { error: "Envie a lista completa de categorias, sem repetições." },
          { status: 400 },
        )
      const { ids, previousIds } = parsed.data
      const categories = await prisma.$transaction(async (tx) => {
        await lockCategories(tx)
        const current = await tx.category.findMany({ orderBy, select })
        if (
          ids.length !== current.length ||
          current.some((cat) => !ids.includes(cat.id)) ||
          (previousIds &&
            (previousIds.length !== current.length ||
              current.some((cat, index) => cat.id !== previousIds[index])))
        )
          throw new Error("CATEGORY_STALE_ORDER")
        const result = []
        for (const [sortOrder, id] of ids.entries()) {
          result.push(await tx.category.update({ where: { id }, data: { sortOrder }, select }))
        }
        return result
      })
      return NextResponse.json({ success: true, categories })
    } catch (error) {
      return failure(error)
    }
  }
  return { POST, PATCH, DELETE, REORDER }
}
