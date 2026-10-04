import { NextRequest, NextResponse } from "next/server"
import type { PrismaClient } from "@prisma/client"
import { menuCreateSchema, menuUpdateSchema } from "./menu-validation"

// Keeping persistence injectable lets the mutation flows be verified without touching store data.
export function menuHandlers(prisma: PrismaClient) {
  async function POST(request: NextRequest) {
    try {
      const parsed = menuCreateSchema.safeParse(await request.json())
      if (!parsed.success)
        return NextResponse.json({ error: parsed.error.issues[0].message }, { status: 400 })
      const body = parsed.data
      const variants = body.variants ?? []
      const item = await prisma.menuItem.create({
        data: {
          id: body.id,
          name: body.name,
          description: body.description,
          price: variants.length ? Math.min(...variants.map((variant) => variant.price)) : body.price,
          image: body.image ?? "",
          categoryId: body.category,
          available: body.available !== false,
          variants: {
            create: variants.map((variant) => ({
              name: variant.name,
              price: variant.price,
              available: variant.available !== false,
            })),
          },
        },
        include: { variants: true },
      })
      return NextResponse.json({ ...item, category: item.categoryId }, { status: 201 })
    } catch (error) {
      const code = (error as { code?: string }).code
      if (code === "P2003")
        return NextResponse.json(
          { error: "A categoria não existe mais. Atualize o cardápio." },
          { status: 400 },
        )
      if (code === "P2002")
        return NextResponse.json(
          { error: "Este produto já foi cadastrado. Atualize o cardápio." },
          { status: 409 },
        )
      if (error instanceof SyntaxError)
        return NextResponse.json({ error: "Dados do produto inválidos." }, { status: 400 })
      console.error("API POST /api/menu error:", error)
      return NextResponse.json(
        { error: "Não foi possível criar o produto. Tente novamente." },
        { status: 500 },
      )
    }
  }

  async function PATCH(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
    try {
      const { id } = await params
      const parsed = menuUpdateSchema.safeParse(await request.json())
      if (!parsed.success)
        return NextResponse.json({ error: parsed.error.issues[0].message }, { status: 400 })
      const { category, variants, ...fields } = parsed.data
      const item = await prisma.$transaction(async (tx) => {
        const current = await tx.menuItem.findUnique({
          where: { id },
          select: { variants: { select: { id: true } } },
        })
        if (!current) throw new Error("MENU_NOT_FOUND")
        const keepIds =
          variants?.map((variant) => variant.id).filter((value): value is string => !!value) ?? []
        const currentIds = new Set(current.variants.map((variant) => variant.id))
        if (keepIds.some((variantId) => !currentIds.has(variantId))) throw new Error("MENU_INVALID_VARIANT")
        return tx.menuItem.update({
          where: { id },
          data: {
            ...fields,
            ...(category !== undefined ? { categoryId: category } : {}),
            ...(variants?.length ? { price: Math.min(...variants.map((variant) => variant.price)) } : {}),
            ...(variants !== undefined
              ? {
                  variants: {
                    deleteMany: { id: { notIn: keepIds } },
                    update: variants
                      .filter((variant) => !!variant.id)
                      .map((variant) => ({
                        where: { id: variant.id! },
                        data: {
                          name: variant.name,
                          price: variant.price,
                          available: variant.available !== false,
                        },
                      })),
                    create: variants
                      .filter((variant) => !variant.id)
                      .map((variant) => ({
                        name: variant.name,
                        price: variant.price,
                        available: variant.available !== false,
                      })),
                  },
                }
              : {}),
          },
          include: { variants: true },
        })
      })
      return NextResponse.json({ ...item, category: item.categoryId })
    } catch (error) {
      const code = (error as { code?: string }).code
      if (code === "P2025" || (error instanceof Error && error.message === "MENU_NOT_FOUND"))
        return NextResponse.json(
          { error: "Este produto não existe mais. Atualize o cardápio." },
          { status: 404 },
        )
      if (code === "P2003")
        return NextResponse.json(
          { error: "A categoria não existe mais. Atualize o cardápio." },
          { status: 400 },
        )
      if (error instanceof Error && error.message === "MENU_INVALID_VARIANT")
        return NextResponse.json(
          { error: "As opções deste produto mudaram. Reabra a edição e tente novamente." },
          { status: 400 },
        )
      if (error instanceof SyntaxError)
        return NextResponse.json({ error: "Dados do produto inválidos." }, { status: 400 })
      console.error("API PATCH /api/menu/[id] error:", error)
      return NextResponse.json(
        { error: "Não foi possível salvar o produto. Tente novamente." },
        { status: 500 },
      )
    }
  }

  async function DELETE(_request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
    try {
      const { id } = await params
      await prisma.menuItem.delete({ where: { id } })
      return NextResponse.json({ success: true })
    } catch (error) {
      if ((error as { code?: string }).code === "P2025")
        return NextResponse.json({ error: "Este produto já foi excluído." }, { status: 404 })
      console.error("API DELETE /api/menu/[id] error:", error)
      return NextResponse.json(
        { error: "Não foi possível excluir o produto. Tente novamente." },
        { status: 500 },
      )
    }
  }

  return { POST, PATCH, DELETE }
}
