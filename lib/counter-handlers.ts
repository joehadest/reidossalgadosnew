import { NextRequest, NextResponse } from "next/server"
import type { PrismaClient } from "@prisma/client"
import {
  counterCash,
  counterLineId,
  counterOrderSchema,
  counterTotal,
  type CounterOrderInput,
} from "./counter"
import { paymentKind } from "./payment-methods"

type ExistingOrder = {
  name: string
  paymentMethod: string
  changeFor: string | null
  items: { itemId: string; variantId: string | null; quantity: number; price: number }[]
}
function sameRequest(order: ExistingOrder, body: CounterOrderInput) {
  const signature = (items: ExistingOrder["items"] | CounterOrderInput["items"]) =>
    items
      .map((line) =>
        JSON.stringify([
          counterLineId(line.itemId, line.variantId),
          line.quantity,
          Math.round(line.price * 100),
        ]),
      )
      .sort()
      .join(";")
  return (
    order.name === body.name &&
    order.paymentMethod === body.paymentMethod &&
    (order.changeFor ? counterCash(order.changeFor) : null) ===
      (body.changeFor ? counterCash(body.changeFor) : null) &&
    signature(order.items) === signature(body.items)
  )
}
export function counterHandlers(prisma: PrismaClient) {
  async function POST(request: NextRequest) {
    let body: CounterOrderInput | undefined
    try {
      const parsed = counterOrderSchema.safeParse(await request.json())
      if (!parsed.success)
        return NextResponse.json({ error: parsed.error.issues[0].message }, { status: 400 })
      body = parsed.data
      const input = body
      const result = await prisma.$transaction(async (tx) => {
        const id = `balcao-${input.requestId}`
        const existing = await tx.order.findUnique({ where: { id }, include: { items: true } })
        if (existing) {
          if (!sameRequest(existing, input)) throw new Error("REQUEST_CHANGED")
          return { order: existing, replayed: true }
        }
        const store = await tx.store.findFirst({ select: { paymentMethods: { select: { name: true } } } })
        if (!store) throw new Error("STORE_MISSING")
        if (!store.paymentMethods.some((method) => method.name === input.paymentMethod))
          throw new Error("PAYMENT_CHANGED")
        const products = await tx.menuItem.findMany({
          where: { id: { in: input.items.map((line) => line.itemId) } },
          include: { variants: true },
        })
        const items = input.items.map((line) => {
          const product = products.find((entry) => entry.id === line.itemId)
          if (!product || !product.available) throw new Error("PRODUCT_CHANGED")
          const variant = line.variantId
            ? product.variants.find((entry) => entry.id === line.variantId)
            : undefined
          if ((line.variantId && (!variant || !variant.available)) || (product.variants.length && !variant))
            throw new Error("PRODUCT_CHANGED")
          const price = variant?.price ?? product.price
          if (
            !Number.isFinite(price) ||
            price < 0 ||
            Math.round(price * 100) !== Math.round(line.price * 100)
          )
            throw new Error("PRICE_CHANGED")
          return {
            itemId: product.id,
            variantId: variant?.id ?? null,
            name: product.name,
            variantName: variant?.name ?? null,
            price,
            quantity: line.quantity,
          }
        })
        const total = counterTotal(items)
        const amount = input.changeFor ? counterCash(input.changeFor) : null
        if (
          paymentKind(input.paymentMethod) === "cash" &&
          amount !== null &&
          Math.round(amount * 100) < Math.round(total * 100)
        )
          throw new Error("CHANGE_TOO_SMALL")
        const order = await tx.order.create({
          data: {
            id,
            name: input.name,
            phone: "-",
            address: "Balcão",
            neighborhood: "-",
            complement: null,
            paymentMethod: input.paymentMethod,
            changeFor: amount === null ? null : amount.toFixed(2).replace(".", ","),
            subtotal: total,
            deliveryFee: 0,
            total,
            items: { create: items },
          },
          include: { items: true },
        })
        return { order, replayed: false }
      })
      return NextResponse.json(result.order, { status: result.replayed ? 200 : 201 })
    } catch (error) {
      if ((error as { code?: string })?.code === "P2002" && body) {
        const existing = await prisma.order
          .findUnique({ where: { id: `balcao-${body.requestId}` }, include: { items: true } })
          .catch(() => null)
        if (existing && sameRequest(existing, body)) return NextResponse.json(existing)
        return NextResponse.json(
          { error: "Este pedido já foi registrado com outros dados. Inicie um novo pedido." },
          { status: 409 },
        )
      }
      const messages: Record<string, [number, string]> = {
        STORE_MISSING: [404, "Loja não encontrada."],
        PAYMENT_CHANGED: [
          409,
          "Esta forma de pagamento não está mais disponível. Atualize o cardápio e escolha outra opção.",
        ],
        PRODUCT_CHANGED: [
          409,
          "Um produto ou opção não está mais disponível. Atualize o cardápio e remova o item do pedido.",
        ],
        PRICE_CHANGED: [
          409,
          "O preço de um item mudou. Atualize o cardápio, remova o item e adicione-o novamente para conferir o valor.",
        ],
        REQUEST_CHANGED: [409, "Este pedido já foi registrado com outros dados. Inicie um novo pedido."],
        CHANGE_TOO_SMALL: [400, "O valor recebido deve ser igual ou maior que o total do pedido."],
      }
      const known = error instanceof Error ? messages[error.message] : undefined
      if (known) return NextResponse.json({ error: known[1] }, { status: known[0] })
      if (error instanceof SyntaxError)
        return NextResponse.json({ error: "Dados do pedido inválidos." }, { status: 400 })
      console.error("Counter order creation failed:", error)
      return NextResponse.json(
        {
          error:
            "Não foi possível confirmar o registro. Confira a conexão e tente novamente; o mesmo pedido não será duplicado.",
        },
        { status: 500 },
      )
    }
  }
  return { POST }
}
