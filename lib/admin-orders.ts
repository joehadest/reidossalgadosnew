export const ORDER_STATUSES = [
  { value: "recebido", label: "Recebido", className: "bg-amber-400/10 text-amber-300" },
  { value: "confirmado", label: "Confirmado", className: "bg-blue-400/10 text-blue-300" },
  { value: "preparando", label: "Em preparação", className: "bg-violet-400/10 text-violet-300" },
  { value: "entrega", label: "Em entrega", className: "bg-sky-400/10 text-sky-300" },
  { value: "entregue", label: "Entregue", className: "bg-emerald-400/10 text-emerald-300" },
  { value: "cancelado", label: "Cancelado", className: "bg-rose-400/10 text-rose-300" },
] as const

export type OrderStatus = typeof ORDER_STATUSES[number]["value"]
export interface OrderItem {
  id: string
  itemId: string
  variantId: string | null
  name: string
  variantName: string | null
  price: number
  quantity: number
}
export interface AdminOrder {
  id: string
  name: string
  phone: string
  address: string
  neighborhood: string
  complement: string | null
  paymentMethod: string
  changeFor: string | null
  subtotal: number
  deliveryFee: number
  total: number
  status: string
  createdAt: string
  items: OrderItem[]
}
export interface OrdersResult {
  orders: AdminOrder[]
  total: number
  page: number
  pages: number
  globalTotal: number
  summary: { counts: Record<string, number>; total: number; revenue: number }
}
export const orderMoney = (value: number) => new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(value)
export const orderCode = (order: Pick<AdminOrder, "id">) => order.id.slice(-6).toUpperCase()
export const orderQuantity = (order: { items: readonly { quantity: number }[] }) => order.items.reduce((sum, item) => sum + item.quantity, 0)
export const orderStatus = (value: string) => ORDER_STATUSES.find((status) => status.value === value) ?? { value, label: value, className: "bg-secondary text-muted-foreground" }
export const ORDER_NEXT: Record<string, { status: OrderStatus; label: string }> = {
  recebido: { status: "confirmado", label: "Confirmar pedido" },
  confirmado: { status: "preparando", label: "Iniciar preparo" },
  preparando: { status: "entrega", label: "Enviar para entrega" },
  entrega: { status: "entregue", label: "Concluir pedido" },
}
