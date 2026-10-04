"use client"

import { useEffect, useRef, useState, type FormEvent } from "react"
import {
  Check,
  CheckCircle2,
  CircleAlert,
  Eye,
  EyeOff,
  Info,
  KeyRound,
  Loader2,
  LockKeyhole,
  RefreshCw,
  RotateCcw,
  ShieldCheck,
  Sparkles,
} from "lucide-react"
import { toast } from "sonner"
import {
  passwordFields,
  passwordFormSchema,
  passwordSuggestions,
  type PasswordField,
  type PasswordForm,
} from "@/lib/admin-password"
import {
  AlertDialog,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog"
import type { StoreNavigationGuard } from "./store-info-section"

const emptyForm: PasswordForm = {
  currentPassword: "",
  newPassword: "",
  confirmPassword: "",
}
const fields: {
  name: PasswordField
  label: string
  placeholder: string
  hint: string
}[] = [
  {
    name: "currentPassword",
    label: "Senha atual",
    placeholder: "Digite sua senha atual",
    hint: "Confirme a senha que você usa para entrar no painel.",
  },
  {
    name: "newPassword",
    label: "Nova senha",
    placeholder: "Crie uma nova senha",
    hint: "Use pelo menos 6 caracteres e escolha uma senha diferente da atual.",
  },
  {
    name: "confirmPassword",
    label: "Confirmar nova senha",
    placeholder: "Repita a nova senha",
    hint: "Digite novamente a nova senha para evitar erros.",
  },
]

export function PasswordSection({
  onRegisterGuard,
}: {
  onRegisterGuard?: (guard: StoreNavigationGuard) => void
}) {
  const [form, setForm] = useState<PasswordForm>(emptyForm)
  const [shown, setShown] = useState<Partial<Record<PasswordField, boolean>>>({})
  const [touched, setTouched] = useState<Partial<Record<PasswordField, boolean>>>({})
  const [serverErrors, setServerErrors] = useState<Partial<Record<PasswordField, string>>>({})
  const [caps, setCaps] = useState<PasswordField | null>(null)
  const [saving, setSaving] = useState(false)
  const [saveError, setSaveError] = useState("")
  const [saved, setSaved] = useState(false)
  const [status, setStatus] = useState<"loading" | "default" | "custom" | "error">("loading")
  const [refresh, setRefresh] = useState(0)
  const [pending, setPending] = useState<{
    kind: "leave" | "reset"
    proceed: () => void
  } | null>(null)
  const lock = useRef(false)
  const statusRequest = useRef<AbortController | null>(null)
  const allowLeave = useRef(false)
  const returnTarget = useRef<HTMLElement | null>(null)
  const success = useRef<HTMLDivElement>(null)
  const dirty = passwordFields.some((field) => !!form[field])
  const parsed = passwordFormSchema.safeParse(form)
  const localErrors: Partial<Record<PasswordField, string>> = {}
  if (!parsed.success)
    for (const issue of parsed.error.issues) {
      const field = issue.path[0] as PasswordField
      if (!localErrors[field]) localErrors[field] = issue.message
    }
  const suggestions = passwordSuggestions(form.newPassword)
  const score = suggestions.filter((suggestion) => suggestion.met).length

  useEffect(() => {
    const controller = new AbortController()
    statusRequest.current = controller
    setStatus("loading")
    async function load() {
      try {
        const response = await fetch("/api/admin/auth-status", {
          cache: "no-store",
          signal: AbortSignal.any([controller.signal, AbortSignal.timeout(15000)]),
        })
        const data = await response.json()
        if (!response.ok || typeof data.usingDefaultPassword !== "boolean") throw new Error()
        if (!controller.signal.aborted) setStatus(data.usingDefaultPassword ? "default" : "custom")
      } catch {
        if (!controller.signal.aborted) setStatus("error")
      }
    }
    void load()
    return () => controller.abort()
  }, [refresh])

  function prompt(kind: "leave" | "reset", proceed: () => void) {
    if (lock.current) {
      toast.info("Aguarde a alteração da senha terminar.")
      return
    }
    returnTarget.current =
      document.activeElement instanceof HTMLElement ? document.activeElement : null
    setPending({ kind, proceed })
  }
  useEffect(() => {
    onRegisterGuard?.(dirty || saving ? (proceed) => prompt("leave", proceed) : null)
    return () => onRegisterGuard?.(null)
  }, [dirty, saving, onRegisterGuard])
  useEffect(() => {
    if (!dirty && !saving) return
    function beforeUnload(event: BeforeUnloadEvent) {
      if (allowLeave.current) return
      event.preventDefault()
      event.returnValue = ""
    }
    function protectLink(event: MouseEvent) {
      if (
        event.defaultPrevented ||
        event.button !== 0 ||
        event.ctrlKey ||
        event.metaKey ||
        event.shiftKey ||
        event.altKey
      )
        return
      const link =
        event.target instanceof Element ? event.target.closest<HTMLAnchorElement>("a[href]") : null
      if (!link || link.target === "_blank" || link.hasAttribute("download")) return
      const destination = new URL(link.href)
      if (
        !["http:", "https:"].includes(destination.protocol) ||
        (destination.origin === location.origin &&
          destination.pathname === location.pathname &&
          destination.search === location.search)
      )
        return
      event.preventDefault()
      event.stopPropagation()
      prompt("leave", () => {
        allowLeave.current = true
        window.location.assign(destination.href)
      })
    }
    window.addEventListener("beforeunload", beforeUnload)
    document.addEventListener("click", protectLink, true)
    return () => {
      window.removeEventListener("beforeunload", beforeUnload)
      document.removeEventListener("click", protectLink, true)
    }
  }, [dirty, saving])
  useEffect(() => {
    if (saved) success.current?.focus()
  }, [saved])
  useEffect(() => {
    if (saving || !saveError) return
    const first = passwordFields.find((field) => serverErrors[field])
    if (first) document.getElementById(`admin-password-${first}`)?.focus()
  }, [saving, saveError, serverErrors])

  function change(field: PasswordField, value: string) {
    allowLeave.current = false
    setForm((valueBefore) => ({ ...valueBefore, [field]: value }))
    setServerErrors((errors) => ({
      ...errors,
      [field]: undefined,
      ...(field === "newPassword" ? { confirmPassword: undefined } : {}),
    }))
    setSaveError("")
    setSaved(false)
  }
  function reset() {
    setForm(emptyForm)
    setShown({})
    setTouched({})
    setServerErrors({})
    setSaveError("")
    setCaps(null)
  }
  async function submit(event: FormEvent) {
    event.preventDefault()
    if (lock.current) return
    setTouched({
      currentPassword: true,
      newPassword: true,
      confirmPassword: true,
    })
    setSaveError("")
    setServerErrors({})
    setSaved(false)
    if (!parsed.success) {
      document.getElementById(`admin-password-${parsed.error.issues[0].path[0]}`)?.focus()
      return
    }
    lock.current = true
    setSaving(true)
    setShown({})
    setCaps(null)
    try {
      const response = await fetch("/api/admin/change-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          currentPassword: parsed.data.currentPassword,
          newPassword: parsed.data.newPassword,
        }),
        signal: AbortSignal.timeout(30000),
      })
      const data = await response.json().catch(() => ({}))
      if (!response.ok) {
        const errors: Partial<Record<PasswordField, string>> = {}
        for (const field of passwordFields)
          if (typeof data.fields?.[field]?.[0] === "string") errors[field] = data.fields[field][0]
        setServerErrors(errors)
        setSaveError(
          typeof data.error === "string"
            ? data.error
            : "Não foi possível alterar a senha. Tente novamente.",
        )
        return
      }
      if (data.ok !== true) throw new Error()
      reset()
      statusRequest.current?.abort()
      setStatus("custom")
      setSaved(true)
      toast.success("Senha de acesso atualizada.")
    } catch {
      setSaveError(
        "Não foi possível confirmar a alteração. Confira sua conexão. Se a solicitação já foi enviada, verifique a nova senha no próximo acesso antes de tentar novamente.",
      )
    } finally {
      lock.current = false
      setSaving(false)
    }
  }

  return (
    <div className="password-section flex min-w-0 flex-col gap-6">
      <header className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <p className="mb-2 text-[10px] font-semibold uppercase tracking-[0.18em] text-primary">
            O cuidado começa pelo acesso
          </p>
          <h1 className="font-display text-3xl font-bold tracking-tight sm:text-4xl">
            Senha de acesso<span className="text-primary">.</span>
          </h1>
          <p className="mt-2 max-w-xl text-sm leading-relaxed text-muted-foreground">
            Atualize a senha do painel e mantenha o acesso nas mãos de quem cuida da loja.
          </p>
        </div>
        <span className="flex w-fit shrink-0 items-center gap-2 rounded-xl border border-border bg-card px-3 py-2.5 text-xs text-muted-foreground">
          <LockKeyhole aria-hidden="true" className="h-4 w-4 text-primary" />
          Painel administrativo
        </span>
      </header>

      {saved && (
        <div
          ref={success}
          tabIndex={-1}
          role="status"
          className="flex items-start gap-3 rounded-2xl border border-emerald-400/20 bg-emerald-400/5 p-4 outline-none sm:p-5"
        >
          <CheckCircle2 aria-hidden="true" className="mt-0.5 h-5 w-5 shrink-0 text-emerald-300" />
          <div>
            <p className="text-sm font-semibold text-emerald-300">Senha atualizada com sucesso</p>
            <p className="mt-1 text-xs leading-relaxed text-muted-foreground">
              Use a nova senha nos próximos acessos. A senha anterior deixou de funcionar.
            </p>
          </div>
        </div>
      )}

      <div className="grid min-w-0 items-start gap-5 xl:grid-cols-[minmax(0,1fr)_320px] 2xl:gap-6">
        <section
          aria-labelledby="password-form-title"
          className="dashboard-panel min-w-0 overflow-hidden rounded-2xl border border-border bg-card"
        >
          <header className="flex items-center gap-3 border-b border-border p-4 sm:p-6">
            <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary">
              <KeyRound aria-hidden="true" className="h-5 w-5" />
            </span>
            <div>
              <h2 id="password-form-title" className="text-base font-semibold">
                Alterar senha
              </h2>
              <p className="mt-1 text-xs leading-relaxed text-muted-foreground">
                Confirme sua senha atual e escolha a próxima.
              </p>
            </div>
          </header>
          <form noValidate onSubmit={submit} aria-busy={saving}>
            <div className="space-y-6 p-4 sm:p-6">
              {fields.map(({ name, label, placeholder, hint }) => {
                const error = serverErrors[name] || (touched[name] ? localErrors[name] : undefined)
                return (
                  <div key={name} className="min-w-0">
                    <label htmlFor={`admin-password-${name}`} className="text-sm font-medium">
                      {label}
                      <span aria-hidden="true" className="ml-1 text-primary">
                        *
                      </span>
                    </label>
                    <div className="relative mt-2">
                      <input
                        id={`admin-password-${name}`}
                        name={name}
                        type={shown[name] ? "text" : "password"}
                        value={form[name]}
                        placeholder={placeholder}
                        required
                        disabled={saving}
                        autoComplete={
                          name === "currentPassword" ? "current-password" : "new-password"
                        }
                        autoCapitalize="none"
                        spellCheck={false}
                        aria-invalid={!!error}
                        aria-describedby={`password-hint-${name}${error ? ` password-error-${name}` : ""}${caps === name ? ` password-caps-${name}` : ""}`}
                        onChange={(event) => change(name, event.target.value)}
                        onBlur={() => {
                          setTouched((value) => ({ ...value, [name]: true }))
                          setCaps(null)
                        }}
                        onKeyDown={(event) =>
                          setCaps(event.getModifierState("CapsLock") ? name : null)
                        }
                        onKeyUp={(event) =>
                          setCaps(event.getModifierState("CapsLock") ? name : null)
                        }
                        className={`min-h-12 w-full min-w-0 rounded-xl border bg-background px-3 py-3 pr-14 text-base placeholder:text-muted-foreground disabled:opacity-50 sm:text-sm ${error ? "border-red-400/60" : "border-border"}`}
                      />
                      <button
                        type="button"
                        disabled={saving}
                        onClick={() =>
                          setShown((value) => ({
                            ...value,
                            [name]: !value[name],
                          }))
                        }
                        aria-label={`${shown[name] ? "Ocultar" : "Mostrar"} ${name === "confirmPassword" ? "confirmação da nova senha" : label.toLowerCase()}`}
                        aria-pressed={!!shown[name]}
                        className="dashboard-icon-button absolute right-1 top-1/2 flex h-11 w-11 -translate-y-1/2 items-center justify-center rounded-lg text-muted-foreground disabled:opacity-40"
                      >
                        {shown[name] ? (
                          <EyeOff aria-hidden="true" className="h-4 w-4" />
                        ) : (
                          <Eye aria-hidden="true" className="h-4 w-4" />
                        )}
                      </button>
                    </div>
                    <p
                      id={`password-hint-${name}`}
                      className="mt-2 text-[11px] leading-relaxed text-muted-foreground"
                    >
                      {hint}
                    </p>
                    {caps === name && (
                      <p
                        id={`password-caps-${name}`}
                        role="status"
                        className="mt-2 flex items-center gap-1.5 text-xs text-primary"
                      >
                        <CircleAlert aria-hidden="true" className="h-3.5 w-3.5" />
                        Caps Lock está ativado.
                      </p>
                    )}
                    {error && (
                      <p
                        id={`password-error-${name}`}
                        role="alert"
                        className="mt-2 text-xs leading-relaxed text-red-300"
                      >
                        {error}
                      </p>
                    )}
                    {name === "newPassword" && (
                      <div className="mt-4 rounded-xl border border-border bg-background/60 p-3.5 sm:p-4">
                        <div className="flex items-center justify-between gap-2">
                          <p className="flex items-center gap-2 text-xs font-medium">
                            <Sparkles aria-hidden="true" className="h-3.5 w-3.5 text-primary" />
                            Sugestões para sua senha
                          </p>
                          <span className="text-[10px] tabular-nums text-muted-foreground">
                            {score}/3
                          </span>
                        </div>
                        <div aria-hidden="true" className="mt-3 grid grid-cols-3 gap-1.5">
                          {suggestions.map((suggestion) => (
                            <div
                              key={suggestion.label}
                              className={`h-1 rounded-full transition-colors ${suggestion.met ? "bg-emerald-400" : "bg-secondary"}`}
                            />
                          ))}
                        </div>
                        <ul className="mt-3 space-y-2">
                          {suggestions.map((suggestion) => (
                            <li
                              key={suggestion.label}
                              className={`flex items-start gap-2 text-[11px] leading-relaxed ${suggestion.met ? "text-emerald-300" : "text-muted-foreground"}`}
                            >
                              {suggestion.met ? (
                                <Check aria-hidden="true" className="mt-0.5 h-3.5 w-3.5 shrink-0" />
                              ) : (
                                <span
                                  aria-hidden="true"
                                  className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-muted-foreground/50"
                                />
                              )}
                              <span>
                                {suggestion.label}
                                {suggestion.met && <span className="sr-only">: atendida</span>}
                              </span>
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}
                    {name === "confirmPassword" &&
                      form.confirmPassword &&
                      !localErrors.confirmPassword &&
                      !localErrors.newPassword && (
                        <p
                          role="status"
                          className="mt-2 flex items-center gap-1.5 text-xs text-emerald-300"
                        >
                          <Check aria-hidden="true" className="h-3.5 w-3.5" />
                          As novas senhas conferem.
                        </p>
                      )}
                  </div>
                )
              })}
              {saveError && (
                <div
                  role="alert"
                  className="flex items-start gap-2.5 rounded-xl border border-red-400/20 bg-red-400/5 p-3.5 text-xs leading-relaxed text-red-300"
                >
                  <CircleAlert aria-hidden="true" className="mt-0.5 h-4 w-4 shrink-0" />
                  <span>{saveError}</span>
                </div>
              )}
            </div>
            <footer className="flex flex-col gap-4 border-t border-border bg-background/30 p-4 sm:p-6">
              <div className="flex flex-col gap-3 sm:flex-row-reverse sm:justify-start">
                <button
                  type="submit"
                  disabled={saving}
                  className="flex min-h-12 items-center justify-center gap-2 rounded-xl bg-primary px-5 text-sm font-semibold text-primary-foreground transition-colors hover:bg-primary/90 disabled:opacity-50"
                >
                  {saving ? (
                    <Loader2 aria-hidden="true" className="h-4 w-4 animate-spin" />
                  ) : (
                    <LockKeyhole aria-hidden="true" className="h-4 w-4" />
                  )}
                  {saving ? "Atualizando senha…" : "Atualizar senha"}
                </button>
                <button
                  type="button"
                  disabled={!dirty || saving}
                  onClick={() => prompt("reset", reset)}
                  className="orders-button flex min-h-12 items-center justify-center gap-2 rounded-xl border border-border px-4 text-sm font-medium disabled:opacity-40"
                >
                  <RotateCcw aria-hidden="true" className="h-4 w-4" />
                  Limpar campos
                </button>
              </div>
              <p className="flex items-start gap-2 text-[11px] leading-relaxed text-muted-foreground">
                <Info aria-hidden="true" className="mt-0.5 h-3.5 w-3.5 shrink-0" />A alteração vale
                para os próximos acessos. Esta sessão continuará aberta.
              </p>
            </footer>
          </form>
        </section>

        <aside
          aria-label="Informações sobre a senha"
          className="grid min-w-0 gap-5 sm:grid-cols-2 xl:grid-cols-1"
        >
          <section
            aria-labelledby="password-status-title"
            className="dashboard-panel rounded-2xl border border-border bg-card p-5 sm:p-6"
          >
            <div className="flex items-center justify-between gap-3">
              <span
                className={`flex h-10 w-10 items-center justify-center rounded-xl ${status === "custom" ? "bg-emerald-400/10 text-emerald-300" : "bg-primary/10 text-primary"}`}
              >
                <ShieldCheck aria-hidden="true" className="h-5 w-5" />
              </span>
              <span className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
                Seu acesso
              </span>
            </div>
            <h2 id="password-status-title" className="mt-4 text-sm font-semibold">
              {status === "loading"
                ? "Consultando senha…"
                : status === "default"
                  ? "Senha padrão em uso"
                  : status === "custom"
                    ? "Senha personalizada"
                    : "Status indisponível"}
            </h2>
            <p role="status" className="mt-2 text-xs leading-relaxed text-muted-foreground">
              {status === "loading"
                ? "Verificando a configuração de acesso do painel."
                : status === "default"
                  ? "Defina uma senha própria para o acesso da sua equipe."
                  : status === "custom"
                    ? "O painel já utiliza uma senha definida pela sua equipe."
                    : "Não foi possível verificar qual tipo de senha está configurado."}
            </p>
            {status !== "loading" && (
              <button
                type="button"
                disabled={saving}
                onClick={() => setRefresh((value) => value + 1)}
                className="orders-button mt-4 flex min-h-11 items-center gap-2 rounded-xl border border-border px-3 text-xs font-medium disabled:opacity-40"
              >
                <RefreshCw aria-hidden="true" className="h-3.5 w-3.5" />
                {status === "error" ? "Tentar novamente" : "Atualizar status"}
              </button>
            )}
          </section>
          <section
            aria-labelledby="password-tips-title"
            className="rounded-2xl border border-primary/15 bg-primary/[0.035] p-5 sm:p-6"
          >
            <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-primary">
              Boas práticas
            </p>
            <h2 id="password-tips-title" className="mt-2 text-base font-semibold">
              Fácil de lembrar.
              <br />
              Difícil de adivinhar.
            </h2>
            <ul className="mt-4 space-y-4 text-xs leading-relaxed text-muted-foreground">
              <li className="flex items-start gap-2.5">
                <span aria-hidden="true" className="mt-0.5 text-primary">
                  01
                </span>
                <span>Use uma frase longa e evite nomes, datas ou sequências comuns.</span>
              </li>
              <li className="flex items-start gap-2.5">
                <span aria-hidden="true" className="mt-0.5 text-primary">
                  02
                </span>
                <span>Escolha uma senha exclusiva para este painel.</span>
              </li>
              <li className="flex items-start gap-2.5">
                <span aria-hidden="true" className="mt-0.5 text-primary">
                  03
                </span>
                <span>
                  Guarde em um gerenciador de senhas e compartilhe apenas com quem administra a
                  loja.
                </span>
              </li>
            </ul>
          </section>
          <div className="flex items-start gap-3 px-1 text-xs leading-relaxed text-muted-foreground sm:col-span-2 xl:col-span-1">
            <Info aria-hidden="true" className="mt-0.5 h-4 w-4 shrink-0" />
            <p>Ao atualizar, avise a equipe: a senha anterior deixará de funcionar.</p>
          </div>
        </aside>
      </div>
      <AlertDialog
        open={!!pending}
        onOpenChange={(open) => {
          if (!open) setPending(null)
        }}
      >
        <AlertDialogContent
          className="admin-menu-dialog max-h-[90dvh] w-[calc(100%-2rem)] overflow-y-auto rounded-2xl bg-card p-5 sm:p-6"
          onCloseAutoFocus={(event) => {
            event.preventDefault()
            const target = returnTarget.current
            ;(target?.isConnected &&
            !target.hasAttribute("disabled") &&
            target.getClientRects().length
              ? target
              : document.getElementById("admin-password-currentPassword")
            )?.focus()
          }}
        >
          <AlertDialogTitle>
            {pending?.kind === "leave" ? "Sair sem atualizar a senha?" : "Limpar os campos?"}
          </AlertDialogTitle>
          <AlertDialogDescription>
            Os dados digitados serão descartados. A senha de acesso atual continuará a mesma.
          </AlertDialogDescription>
          <div className="grid grid-cols-2 gap-3">
            <AlertDialogCancel className="m-0 min-h-11 rounded-xl border-border bg-transparent px-2 text-xs">
              Continuar editando
            </AlertDialogCancel>
            <button
              onClick={() => {
                const action = pending
                setPending(null)
                action?.proceed()
              }}
              className="min-h-11 rounded-xl bg-destructive px-2 text-xs font-semibold text-destructive-foreground"
            >
              {pending?.kind === "leave" ? "Descartar e sair" : "Limpar campos"}
            </button>
          </div>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}
