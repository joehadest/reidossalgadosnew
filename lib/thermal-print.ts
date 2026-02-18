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
  const itemsHtml = order.items
    .map(
      (i) =>
        `<tr><td>${i.quantity}x ${i.name}${i.variantName ? ` (${i.variantName})` : ""}</td><td style="text-align:right">R$ ${(i.price * i.quantity).toFixed(2).replace(".", ",")}</td></tr>`
    )
    .join("")

  const html = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <title>Pedido #${order.id.slice(-6)}</title>
  <style>
    @media print {
      @page { size: 80mm auto; margin: 2mm; }
      body { margin: 0; padding: 0; }
    }
    * { box-sizing: border-box; }
    body {
      font-family: 'Courier New', monospace;
      font-size: 11px;
      width: 80mm;
      max-width: 80mm;
      margin: 0 auto;
      padding: 4mm;
      color: #000;
      line-height: 1.3;
    }
    .center { text-align: center; }
    .bold { font-weight: bold; }
    .divider { border-top: 1px dashed #000; margin: 4px 0; }
    table { width: 100%; border-collapse: collapse; }
    td { padding: 1px 0; vertical-align: top; }
    .total { font-size: 13px; font-weight: bold; }
  </style>
</head>
<body>
  <div class="center bold">${storeName || "PEDIDO"}</div>
  <div class="center" style="font-size:9px">${formatDate(order.createdAt)}</div>
  <div class="divider"></div>
  <div class="bold">${order.name}</div>
  <div>Tel: ${order.phone}</div>
  <div>${order.address}, ${order.neighborhood}</div>
  ${order.complement ? `<div>${order.complement}</div>` : ""}
  <div class="divider"></div>
  <table>
    ${itemsHtml}
  </table>
  <div class="divider"></div>
  <table>
    <tr><td>Subtotal</td><td style="text-align:right">R$ ${order.subtotal.toFixed(2).replace(".", ",")}</td></tr>
    <tr><td>Entrega</td><td style="text-align:right">R$ ${order.deliveryFee.toFixed(2).replace(".", ",")}</td></tr>
    <tr class="total"><td>TOTAL</td><td style="text-align:right">R$ ${order.total.toFixed(2).replace(".", ",")}</td></tr>
  </table>
  <div class="divider"></div>
  <div>Pgto: ${order.paymentMethod}</div>
  ${order.changeFor ? `<div>Troco: R$ ${order.changeFor}</div>` : ""}
  <div class="divider"></div>
  <div class="center" style="font-size:9px">#${order.id.slice(-6)}</div>
</body>
</html>
`

  const win = window.open("", "_blank", "width=302,height=600")
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
