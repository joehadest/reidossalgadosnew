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
      padding: 3mm 4mm;
      font-family: 'Courier New', monospace;
      font-size: 14px;
      font-weight: bold;
      color: #000;
      line-height: 1.3;
      text-align: center;
    }
    .center { text-align: center; }
    .left { text-align: left; }
    .bold { font-weight: bold; }
    .hr { border-top: 2px dashed #000; margin: 4px 0; }
    .hr-light { border-top: 1px dashed #000; margin: 2px 0; }
    .store-name { font-size: 20px; font-weight: bold; letter-spacing: 0.5px; margin-bottom: 2px; }
    .section-label { font-size: 11px; font-weight: bold; text-transform: uppercase; margin-bottom: 1px; opacity: 0.9; }
    .text { font-size: 13px; font-weight: bold; }
    .text-small { font-size: 12px; font-weight: bold; }
    .total-box { font-size: 18px; font-weight: bold; margin: 4px 0; padding: 3px 0; border: 2px solid #000; }
    .items-table { width: 100%; border-collapse: collapse; table-layout: fixed; font-weight: bold; }
    .items-table tr { vertical-align: top; }
    .items-table td { padding: 2px 0; vertical-align: top; font-size: 13px; }
    .item-desc { text-align: left; width: 100%; word-break: break-word; font-weight: bold; }
    .item-val { text-align: right; white-space: nowrap; width: 1%; padding-left: 6px; font-weight: bold; }
    .order-id { font-size: 14px; font-weight: bold; margin-top: 4px; }
  </style>
</head>
<body>
  <div class="center store-name">${(storeName || "PEDIDO").toUpperCase()}</div>
  <div class="center text-small">${formatDate(order.createdAt)}</div>
  <div class="hr"></div>

  <div class="section-label center">Cliente</div>
  <div class="center text">${order.name}</div>
  <div class="center text-small">${order.phone}</div>
  <div class="hr-light"></div>

  <div class="section-label center">Endereço</div>
  <div class="center text-small">${addressLine}</div>
  <div class="hr"></div>

  <div class="section-label center">Itens do Pedido</div>
  <table class="items-table"><tbody>${itemsRows}</tbody></table>
  <div class="hr-light"></div>

  <div class="left text-small">Subtotal: R$ ${order.subtotal.toFixed(2).replace(".", ",")}</div>
  <div class="left text-small">Entrega: R$ ${order.deliveryFee.toFixed(2).replace(".", ",")}</div>
  <div class="hr"></div>

  <div class="total-box center">TOTAL R$ ${order.total.toFixed(2).replace(".", ",")}</div>

  <div class="section-label center">Pagamento</div>
  <div class="center text">${paymentLine}</div>

  <div class="hr"></div>
  <div class="center order-id">#${order.id.slice(-6)}</div>
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
