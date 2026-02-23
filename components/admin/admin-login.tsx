"use client"

import { useState, useEffect } from "react"
import Image from "next/image"
import { motion } from "framer-motion"
import { Lock, Eye, EyeOff, AlertCircle } from "lucide-react"

interface AdminLoginProps {
  onLogin: () => void
}

export function AdminLogin({ onLogin }: AdminLoginProps) {
  const [password, setPassword] = useState("")
  const [showPassword, setShowPassword] = useState(false)
  const [error, setError] = useState(false)
  const [usingDefaultPassword, setUsingDefaultPassword] = useState(true)

  useEffect(() => {
    fetch("/api/admin/auth-status")
      .then((res) => res.json())
      .then((data) => setUsingDefaultPassword(data.usingDefaultPassword !== false))
      .catch(() => setUsingDefaultPassword(true))
  }, [])

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    try {
      const res = await fetch("/api/admin/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ password }),
      })
      const data = await res.json().catch(() => ({}))
      if (res.ok && data.ok) {
        localStorage.setItem("rs-admin-auth", "true")
        onLogin()
      } else {
        setError(true)
        setTimeout(() => setError(false), 3000)
      }
    } catch {
      setError(true)
      setTimeout(() => setError(false), 3000)
    }
  }

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="w-full max-w-sm"
      >
        <div className="text-center mb-8">
          <div className="relative mx-auto h-20 w-20 rounded-2xl overflow-hidden mb-4">
            <Image
              src="/logo/logoreidossalgados.png"
              alt="Rei dos Salgados"
              fill
              className="object-cover"
              sizes="80px"
              priority
            />
          </div>
          <h1 className="font-display text-2xl font-bold">Painel Admin</h1>
          <p className="text-sm text-muted-foreground mt-1">Rei dos Salgados</p>
        </div>

        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <div>
            <label className="text-xs text-muted-foreground mb-1.5 block">Senha de acesso</label>
            <div className="relative">
              <input
                type={showPassword ? "text" : "password"}
                value={password}
                onChange={(e) => { setPassword(e.target.value); setError(false) }}
                className="w-full rounded-xl border border-border bg-card px-4 py-3 pr-10 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/50"
                placeholder="Digite a senha"
                autoFocus
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
              >
                {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </button>
            </div>
          </div>

          {error && (
            <motion.div
              initial={{ opacity: 0, y: -5 }}
              animate={{ opacity: 1, y: 0 }}
              className="flex items-center gap-2 text-sm text-destructive"
            >
              <AlertCircle className="h-4 w-4" />
              <span>Senha incorreta</span>
            </motion.div>
          )}

          <button
            type="submit"
            className="w-full rounded-xl bg-primary py-3 text-sm font-bold text-primary-foreground hover:bg-primary/90 transition-colors"
          >
            Entrar
          </button>

          {usingDefaultPassword && (
            <p className="text-xs text-center text-muted-foreground">
              Senha padrao: admin123
            </p>
          )}
        </form>
      </motion.div>
    </div>
  )
}
