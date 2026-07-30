"use client"

import { useEffect, useState } from "react"
import { Bell, BellOff, BellRing } from "lucide-react"
import { toast } from "sonner"
import { unlockNotificationAudio, playNotificationSound } from "@/lib/notification-sound"

type PermissionState = "unsupported" | "default" | "granted" | "denied"

export function NotificationBell() {
  const [permission, setPermission] = useState<PermissionState>("default")

  useEffect(() => {
    if (!("Notification" in window)) {
      setPermission("unsupported")
      return
    }
    setPermission(Notification.permission as PermissionState)
  }, [])

  async function handleClick() {
    unlockNotificationAudio()
    playNotificationSound()
    if (navigator.vibrate) navigator.vibrate(150)

    if (permission === "unsupported") {
      toast.info("Notificacoes nao suportadas", {
        description: "Seu navegador nao suporta notificacoes. O som de alerta continua funcionando com a aba aberta.",
      })
      return
    }

    if (permission === "denied") {
      toast.error("Notificacoes bloqueadas", {
        description: "Voce bloqueou as notificacoes para este site. Ative nas configuracoes do navegador para receber alertas.",
      })
      return
    }

    if (permission === "granted") {
      toast.success("Notificacoes ja estao ativadas", {
        description: "Voce recebera um alerta sonoro e visual quando chegar um novo pedido.",
      })
      return
    }

    const result = await Notification.requestPermission()
    setPermission(result as PermissionState)
    if (result === "granted") {
      toast.success("Notificacoes ativadas!", {
        description: "Deixe esta aba aberta no navegador para receber alertas de novos pedidos.",
      })
      new Notification("Notificacoes ativadas", {
        body: "Voce sera avisado quando chegar um novo pedido.",
        icon: "/logo/logoreidossalgados.png",
      })
    } else {
      toast.error("Notificacoes nao ativadas", {
        description: "Voce nao permitiu o envio de notificacoes.",
      })
    }
  }

  const icon =
    permission === "granted" ? (
      <BellRing className="h-4 w-4" />
    ) : permission === "denied" ? (
      <BellOff className="h-4 w-4" />
    ) : (
      <Bell className="h-4 w-4" />
    )

  const label =
    permission === "granted"
      ? "Notificacoes ativadas"
      : permission === "denied"
        ? "Notificacoes bloqueadas"
        : "Ativar notificacoes"

  return (
    <button
      onClick={handleClick}
      className={`flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition-colors ${
        permission === "granted"
          ? "text-green-600 dark:text-green-400 hover:bg-green-500/10"
          : permission === "denied"
            ? "text-destructive hover:bg-destructive/10"
            : "text-muted-foreground hover:text-foreground hover:bg-secondary"
      }`}
    >
      {icon}
      {label}
    </button>
  )
}
