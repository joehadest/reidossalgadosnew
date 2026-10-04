"use client"

import { useEffect, useState } from "react"
import { CircleAlert, Trash2 } from "lucide-react"
import { AlertDialog, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogTitle } from "@/components/ui/alert-dialog"
import { orderCode, type AdminOrder } from "@/lib/admin-orders"

export type OrderConfirmation = { action: "delete" | "cancel"; order: AdminOrder } | { action: "delete-all" }

export function OrderConfirmationDialog({ confirmation, busy, total, onClose, onConfirm, onReturnFocus }: {
  confirmation: OrderConfirmation | null
  busy: boolean
  total: number
  onClose: () => void
  onConfirm: () => void
  onReturnFocus: () => void
}) {
  const [acknowledgement, setAcknowledgement] = useState("")
  useEffect(() => { setAcknowledgement("") }, [confirmation])
  const all = confirmation?.action === "delete-all"
  const cancel = confirmation?.action === "cancel"
  return (
    <AlertDialog open={!!confirmation} onOpenChange={(open) => { if (!open && !busy) onClose() }}>
      <AlertDialogContent className="admin-orders-dialog w-[calc(100%-2rem)] max-h-[90dvh] overflow-y-auto rounded-2xl bg-card p-5 sm:p-6"
        onCloseAutoFocus={(event) => { event.preventDefault(); onReturnFocus() }} onEscapeKeyDown={(event) => { if (busy) event.preventDefault() }}>
        <span className="flex h-12 w-12 items-center justify-center rounded-xl bg-rose-400/10 text-rose-300">{cancel ? <CircleAlert className="h-6 w-6" /> : <Trash2 className="h-6 w-6" />}</span>
        <AlertDialogTitle className="font-display text-xl">{all ? "Excluir todo o histórico?" : cancel ? "Cancelar este pedido?" : "Excluir este pedido?"}</AlertDialogTitle>
        <AlertDialogDescription className="text-sm leading-relaxed">
          {all ? `Todos os ${total} pedidos da loja serão excluídos, incluindo os que estão fora dos filtros atuais. Essa ação é permanente e também remove os valores do faturamento.` : confirmation && "order" in confirmation
            ? cancel ? `O pedido #${orderCode(confirmation.order)} de ${confirmation.order.name} será marcado como cancelado e deixará de contar no faturamento. Seus dados permanecerão no histórico.`
            : `O pedido #${orderCode(confirmation.order)} de ${confirmation.order.name} será excluído do histórico e do faturamento. Essa ação não pode ser desfeita.`
            : ""}
        </AlertDialogDescription>
        {all && <div><label htmlFor="delete-history-confirmation" className="mb-2 block text-xs font-medium">Digite EXCLUIR para confirmar</label><input id="delete-history-confirmation" value={acknowledgement} disabled={busy} onChange={(event) => setAcknowledgement(event.target.value)} autoComplete="off" className="min-h-11 w-full rounded-xl border border-border bg-background px-3 text-sm" /></div>}
        <div className="mt-2 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
          <AlertDialogCancel disabled={busy} className="m-0 min-h-11 rounded-xl border-border bg-transparent text-xs">Voltar</AlertDialogCancel>
          <button disabled={busy || (all && acknowledgement !== "EXCLUIR")} onClick={onConfirm} className="min-h-11 rounded-xl bg-rose-500 px-4 text-xs font-semibold text-white transition-colors hover:bg-rose-600 disabled:opacity-40">{busy ? "Aguarde…" : all ? "Excluir todos os pedidos" : cancel ? "Cancelar pedido" : "Excluir pedido"}</button>
        </div>
      </AlertDialogContent>
    </AlertDialog>
  )
}
