interface OrderItem {
  name: string
  variantName: string | null
  price: number
  quantity: number
}

interface Order {
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

function formatDate(dateStr: string): string {
  const d = new Date(dateStr)
  return d.toLocaleDateString("pt-BR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  })
}

export function printOrderThermal(order: Order, storeName?: string) {
  const itemsRows = order.items
    .map(
      (i) =>
        `<tr><td class="item-desc">${i.quantity}x ${i.name}${i.variantName ? ` (${i.variantName})` : ""}</td><td class="item-val">R$ ${(i.price * i.quantity).toFixed(2).replace(".", ",")}</td></tr>`
    )
    .join("")

  const addressLine = [order.address, order.neighborhood].filter(Boolean).join(", ") + (order.complement ? " - " + order.complement : "")
  const paymentLine = order.paymentMethod + (order.changeFor ? ` | Troco R$ ${order.changeFor}` : "")

  const html = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <title>Pedido #${order.id.slice(-6)}</title>
  <style>
    @media print {
      @page { size: 88mm auto; margin: 0; }
      body { margin: 0; padding: 0; }
    }
    * { box-sizing: border-box; }
    html, body {
      width: 88mm;
      min-width: 88mm;
      max-width: 88mm;
      margin: 0 auto;
      padding: 4mm;
      font-family: 'Courier New', monospace;
      font-size: 15px;
      font-weight: bold;
      color: #000;
      line-height: 1.25;
      text-align: center;
    }
    .center { text-align: center; }
    .bold { font-weight: bold; }
    .hr { border-top: 1px dashed #000; margin: 3px 0; }
    .store-name { font-size: 18px; }
    .small { font-size: 12px; }
    .total { font-size: 17px; }
    .items-table { width: 100%; border-collapse: collapse; table-layout: fixed; }
    .items-table tr { vertical-align: top; }
    .items-table td { padding: 0 0 1px 0; vertical-align: top; }
    .item-desc { text-align: left; width: 100%; word-break: break-word; }
    .item-val { text-align: right; white-space: nowrap; width: 1%; padding-left: 4px; }
  </style>
</head>
<body>
  <div class="center bold store-name">${storeName || "PEDIDO"}</div>
  <div class="center small">${formatDate(order.createdAt)}</div>
  <div class="hr"></div>
  <div class="bold">${order.name}</div>
  <div class="small">${order.phone}</div>
  <div class="small">${addressLine}</div>
  <div class="hr"></div>
  <table class="items-table"><tbody>${itemsRows}</tbody></table>
  <div class="hr"></div>
  <div class="small">Subtotal R$ ${order.subtotal.toFixed(2).replace(".", ",")} | Entrega R$ ${order.deliveryFee.toFixed(2).replace(".", ",")}</div>
  <div class="total">TOTAL R$ ${order.total.toFixed(2).replace(".", ",")}</div>
  <div class="small">${paymentLine}</div>
  <div class="small">#${order.id.slice(-6)}</div>
</body>
</html>
`

  const win = window.open("", "_blank", "width=333,height=700")
  if (!win) {
    alert("Permita pop-ups para imprimir o pedido.")
    return
  }
  win.document.write(html)
  win.document.close()
  win.focus()
  setTimeout(() => {
    win.print()
    win.close()
  }, 250)
}
