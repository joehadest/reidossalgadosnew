"use client"

import { useState, useEffect, useRef, type FormEvent } from "react"
import Image from "next/image"
import Link from "next/link"
import {
  ArrowRight,
  ArrowUpRight,
  ChartNoAxesCombined,
  ChevronDown,
  CircleAlert,
  Crown,
  Eye,
  EyeOff,
  HelpCircle,
  KeyRound,
  LayoutGrid,
  Loader2,
  LockKeyhole,
  ShoppingBag,
} from "lucide-react"
import { adminLoginSchema } from "@/lib/admin-password"

interface AdminLoginProps {
  onLogin: () => void
}

const features = [
  {
    Icon: ShoppingBag,
    title: "Cada pedido, no seu lugar",
    description: "Acompanhe os atendimentos do início ao fim.",
  },
  {
    Icon: LayoutGrid,
    title: "Seu cardápio sempre em dia",
    description: "Produtos, categorias e detalhes da loja.",
  },
  {
    Icon: ChartNoAxesCombined,
    title: "Uma visão clara da operação",
    description: "Veja os resultados e organize sua rotina.",
  },
]

export function AdminLogin({ onLogin }: AdminLoginProps) {
  const [password, setPassword] = useState("")
  const [showPassword, setShowPassword] = useState(false)
  const [error, setError] = useState("")
  const [fieldInvalid, setFieldInvalid] = useState(false)
  const [busy, setBusy] = useState(false)
  const [capsLock, setCapsLock] = useState(false)
  const [help, setHelp] = useState(false)
  const [usingDefaultPassword, setUsingDefaultPassword] = useState(false)
  const passwordInput = useRef<HTMLInputElement>(null)
  const lock = useRef(false)
  const request = useRef<AbortController | null>(null)
  const mounted = useRef(true)

  useEffect(() => {
    mounted.current = true
    if (window.matchMedia("(min-width: 1024px)").matches)
      passwordInput.current?.focus({ preventScroll: true })
    const controller = new AbortController()
    fetch("/api/admin/auth-status", {
      cache: "no-store",
      signal: AbortSignal.any([controller.signal, AbortSignal.timeout(10000)]),
    })
      .then((response) => (response.ok ? response.json() : null))
      .then((data) => {
        if (!controller.signal.aborted) setUsingDefaultPassword(data?.usingDefaultPassword === true)
      })
      .catch(() => {})
    return () => {
      mounted.current = false
      controller.abort()
      request.current?.abort()
    }
  }, [])
  useEffect(() => {
    if (!busy && fieldInvalid) passwordInput.current?.focus()
  }, [busy, fieldInvalid])

  async function handleSubmit(event: FormEvent) {
    event.preventDefault()
    if (lock.current) return
    const parsed = adminLoginSchema.safeParse({ password })
    if (!parsed.success) {
      setError(parsed.error.issues[0].message)
      setFieldInvalid(true)
      passwordInput.current?.focus()
      return
    }
    lock.current = true
    setBusy(true)
    setError("")
    setFieldInvalid(false)
    setShowPassword(false)
    setCapsLock(false)
    const controller = new AbortController()
    request.current = controller
    try {
      const response = await fetch("/api/admin/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(parsed.data),
        signal: AbortSignal.any([controller.signal, AbortSignal.timeout(20000)]),
      })
      const data = await response.json().catch(() => ({}))
      if (!mounted.current) return
      if (!response.ok) {
        setError(
          typeof data.error === "string" ? data.error : "Não foi possível entrar. Tente novamente.",
        )
        setFieldInvalid(response.status === 400 || response.status === 401)
        return
      }
      if (data.ok !== true) throw new Error()
      try {
        localStorage.setItem("rs-admin-auth", "true")
      } catch {
        setError(
          "Seu navegador não permitiu salvar o acesso. Permita o armazenamento deste site e tente novamente.",
        )
        return
      }
      setPassword("")
      onLogin()
    } catch {
      if (mounted.current && !controller.signal.aborted)
        setError("Não foi possível conectar ao painel. Confira sua conexão e tente novamente.")
    } finally {
      lock.current = false
      if (mounted.current) setBusy(false)
    }
  }

  return (
    <div className="admin-workspace admin-login relative isolate flex min-h-[100dvh] flex-col overflow-x-clip bg-background">
      <a href="#admin-login-main" className="admin-skip-link">
        Pular para o login
      </a>
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 -z-10 overflow-hidden"
      >
        <div className="absolute -left-40 top-12 h-[600px] w-[600px] rounded-full bg-primary/[0.035] blur-[100px]" />
        <div className="absolute -right-40 bottom-0 h-[500px] w-[500px] rounded-full bg-primary/[0.025] blur-[100px]" />
      </div>
      <header className="mx-auto flex w-full max-w-[1320px] items-center justify-between gap-3 px-4 py-5 sm:px-8 sm:py-7 lg:px-10 lg:py-5">
        <Link
          href="/"
          className="flex min-w-0 items-center gap-3 rounded-xl"
          aria-label="Rei dos Salgados — voltar à loja"
        >
          <Image
            src="/logo/logoreidossalgados.png"
            alt=""
            width={48}
            height={48}
            sizes="48px"
            loading="eager"
            className="h-11 w-11 shrink-0 rounded-xl border border-border object-cover sm:h-12 sm:w-12"
          />
          <div className="min-w-0">
            <p className="font-display text-sm font-bold sm:text-base">Rei dos Salgados</p>
            <p className="mt-1 text-[9px] font-medium uppercase tracking-[0.18em] text-muted-foreground sm:text-[10px]">
              Administração
            </p>
          </div>
        </Link>
        <Link
          href="/"
          className="orders-button flex min-h-11 shrink-0 items-center gap-2 rounded-xl border border-border px-3 text-xs font-medium text-muted-foreground sm:px-4"
        >
          <span>Ver loja</span>
          <ArrowUpRight aria-hidden="true" className="h-4 w-4" />
        </Link>
      </header>

      <main
        id="admin-login-main"
        tabIndex={-1}
        className="mx-auto grid w-full max-w-[1200px] flex-1 items-start gap-12 px-4 py-6 outline-none sm:px-8 sm:py-10 lg:grid-cols-[minmax(0,1fr)_440px] lg:items-center lg:gap-16 lg:px-10 lg:py-6 xl:gap-24"
      >
        <section aria-labelledby="login-brand-title" className="relative hidden min-w-0 lg:block">
          <div
            aria-hidden="true"
            className="absolute -left-8 -top-16 -z-10 h-40 w-40 rounded-full border border-primary/[0.04]"
          />
          <p className="flex items-center gap-2.5 text-[10px] font-semibold uppercase tracking-[0.22em] text-primary">
            <span className="h-px w-7 bg-primary/70" />
            Sua loja, bem cuidada
          </p>
          <h2
            id="login-brand-title"
            className="mt-6 font-display text-[44px] font-bold leading-[1.12] tracking-tight xl:text-[54px]"
          >
            O sabor é da casa.
            <br />
            <span className="text-primary">A gestão é sua.</span>
          </h2>
          <p className="mt-5 max-w-md text-sm leading-relaxed text-muted-foreground">
            Tudo o que você precisa para organizar os pedidos, cuidar do cardápio e acompanhar sua
            loja.
          </p>
          <ul className="mt-9 space-y-5 border-t border-border/70 pt-7">
            {features.map(({ Icon, title, description }) => (
              <li key={title} className="flex items-start gap-3.5">
                <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-primary/15 bg-primary/[0.04] text-primary">
                  <Icon aria-hidden="true" className="h-[18px] w-[18px]" />
                </span>
                <div>
                  <p className="text-sm font-medium">{title}</p>
                  <p className="mt-1 text-xs leading-relaxed text-muted-foreground">
                    {description}
                  </p>
                </div>
              </li>
            ))}
          </ul>
          <div className="mt-9 flex items-center gap-2 text-[10px] uppercase tracking-[0.16em] text-muted-foreground/70">
            <Crown aria-hidden="true" className="h-4 w-4 text-primary/70" />
            Feito para cuidar do seu negócio
          </div>
        </section>

        <div className="mx-auto w-full min-w-0 max-w-[440px] lg:mx-0">
          <section
            aria-labelledby="login-title"
            className="dashboard-panel relative overflow-hidden rounded-3xl border border-border bg-card shadow-[0_24px_80px_rgba(0,0,0,0.2)]"
          >
            <div
              aria-hidden="true"
              className="absolute inset-x-8 top-0 h-px bg-gradient-to-r from-transparent via-primary/50 to-transparent"
            />
            <div className="p-5 sm:p-7">
              <span className="mb-5 flex h-12 w-12 items-center justify-center rounded-2xl border border-primary/15 bg-primary/[0.07] text-primary">
                <KeyRound aria-hidden="true" className="h-5 w-5" />
              </span>
              <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-primary">
                Acesso ao painel
              </p>
              <h1
                id="login-title"
                className="mt-2.5 font-display text-[28px] font-bold leading-tight tracking-tight sm:text-[32px]"
              >
                Bem-vindo de volta<span className="text-primary">.</span>
              </h1>
              <p className="mt-3 text-sm leading-relaxed text-muted-foreground">
                Entre para continuar cuidando da sua loja.
              </p>

              <form noValidate onSubmit={handleSubmit} aria-busy={busy} className="mt-6">
                <label htmlFor="admin-login-password" className="text-sm font-medium">
                  Senha de acesso
                </label>
                <div className="relative mt-2.5">
                  <LockKeyhole
                    aria-hidden="true"
                    className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground"
                  />
                  <input
                    ref={passwordInput}
                    id="admin-login-password"
                    name="password"
                    type={showPassword ? "text" : "password"}
                    value={password}
                    onChange={(event) => {
                      setPassword(event.target.value)
                      setError("")
                      setFieldInvalid(false)
                    }}
                    onKeyDown={(event) => setCapsLock(event.getModifierState("CapsLock"))}
                    onKeyUp={(event) => setCapsLock(event.getModifierState("CapsLock"))}
                    onBlur={() => setCapsLock(false)}
                    required
                    disabled={busy}
                    autoComplete="current-password"
                    autoCapitalize="none"
                    spellCheck={false}
                    aria-invalid={fieldInvalid}
                    aria-describedby={`login-password-hint${error ? " login-error" : ""}${capsLock ? " login-caps" : ""}`}
                    className={`min-h-14 w-full min-w-0 scroll-mt-8 rounded-xl border bg-background py-3 pl-11 pr-14 text-base placeholder:text-muted-foreground disabled:opacity-50 sm:text-sm ${fieldInvalid ? "border-red-400/60" : "border-border"}`}
                    placeholder="Digite sua senha"
                  />
                  <button
                    type="button"
                    disabled={busy}
                    onClick={() => setShowPassword((value) => !value)}
                    aria-label={showPassword ? "Ocultar senha" : "Mostrar senha"}
                    aria-pressed={showPassword}
                    className="dashboard-icon-button absolute right-1.5 top-1/2 flex h-11 w-11 -translate-y-1/2 items-center justify-center rounded-lg text-muted-foreground disabled:opacity-40"
                  >
                    {showPassword ? (
                      <EyeOff aria-hidden="true" className="h-4 w-4" />
                    ) : (
                      <Eye aria-hidden="true" className="h-4 w-4" />
                    )}
                  </button>
                </div>
                <p
                  id="login-password-hint"
                  className="mt-2.5 text-[11px] leading-relaxed text-muted-foreground"
                >
                  Use a senha cadastrada para o painel administrativo.
                </p>
                {capsLock && (
                  <p
                    id="login-caps"
                    role="status"
                    className="mt-3 flex items-center gap-2 text-xs text-primary"
                  >
                    <CircleAlert aria-hidden="true" className="h-3.5 w-3.5" />
                    Caps Lock está ativado.
                  </p>
                )}
                {error && (
                  <div
                    id="login-error"
                    role="alert"
                    className="mt-4 flex items-start gap-2.5 rounded-xl border border-red-400/20 bg-red-400/5 p-3.5 text-xs leading-relaxed text-red-300"
                  >
                    <CircleAlert aria-hidden="true" className="mt-0.5 h-4 w-4 shrink-0" />
                    <span>{error}</span>
                  </div>
                )}
                <button
                  type="submit"
                  disabled={busy}
                  className="mt-6 flex min-h-14 w-full items-center justify-center gap-2.5 rounded-xl bg-primary px-4 text-sm font-semibold text-primary-foreground transition-colors hover:bg-primary/90 disabled:cursor-wait disabled:opacity-60"
                >
                  {busy ? (
                    <>
                      <Loader2 aria-hidden="true" className="h-4 w-4 animate-spin" />
                      Validando acesso…
                    </>
                  ) : (
                    <>
                      Entrar no painel
                      <ArrowRight aria-hidden="true" className="h-4 w-4" />
                    </>
                  )}
                </button>
              </form>
              <button
                type="button"
                onClick={() => setHelp((value) => !value)}
                aria-expanded={help}
                aria-controls="login-help"
                className="dashboard-secondary-button mx-auto mt-3 flex min-h-11 items-center gap-2 rounded-xl px-3 text-xs text-muted-foreground"
              >
                <HelpCircle aria-hidden="true" className="h-3.5 w-3.5" />
                Precisa de ajuda para entrar?
                <ChevronDown
                  aria-hidden="true"
                  className={`h-3.5 w-3.5 transition-transform ${help ? "rotate-180" : ""}`}
                />
              </button>
              {help && (
                <div
                  id="login-help"
                  role="region"
                  aria-label="Ajuda para acessar o painel"
                  className="mt-3 rounded-xl border border-border bg-background/60 p-4"
                >
                  <p className="text-xs font-medium">Não lembra a senha?</p>
                  <p className="mt-2 text-xs leading-relaxed text-muted-foreground">
                    Peça a senha a quem administra a loja. Se ninguém tiver o acesso, fale com o
                    responsável pela configuração do painel para recuperá-lo.
                  </p>
                </div>
              )}
            </div>
            <footer className="flex items-start gap-2.5 border-t border-border bg-background/30 px-5 py-3 text-[11px] leading-relaxed text-muted-foreground sm:px-8">
              <LockKeyhole aria-hidden="true" className="mt-0.5 h-3.5 w-3.5 shrink-0" />
              <p>Área exclusiva para a equipe de administração.</p>
            </footer>
          </section>
          {usingDefaultPassword && (
            <aside
              aria-label="Orientação para o primeiro acesso"
              className="mt-4 flex items-start gap-3 rounded-2xl border border-primary/15 bg-primary/[0.035] p-4"
            >
              <KeyRound aria-hidden="true" className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
              <div>
                <p className="text-xs font-medium">Primeiro acesso?</p>
                <p className="mt-1.5 text-[11px] leading-relaxed text-muted-foreground">
                  Use a senha inicial fornecida à loja. Depois de entrar, personalize em{" "}
                  <span className="font-medium text-foreground">Conta → Alterar senha</span>.
                </p>
              </div>
            </aside>
          )}
        </div>
      </main>
      <footer className="mx-auto flex w-full max-w-[1320px] flex-col items-center justify-between gap-2 px-4 py-4 text-[10px] text-muted-foreground/70 sm:flex-row sm:px-8 lg:px-10">
        <p>Rei dos Salgados · Painel administrativo</p>
        <p>O cuidado com a loja começa aqui.</p>
      </footer>
    </div>
  )
}
