"use client"

import Image from "next/image"
import { useEffect, useRef, useState, type FormEvent, type InputHTMLAttributes, type ReactNode } from "react"
import {
  ArrowUpRight,
  Check,
  CheckCircle2,
  ChevronRight,
  CircleAlert,
  Clock,
  CreditCard,
  Eye,
  EyeOff,
  Instagram,
  Loader2,
  MapPin,
  MessageCircle,
  Phone,
  Pencil,
  RotateCcw,
  Save,
  Store,
  Truck,
  UserRound,
} from "lucide-react"
import { toast } from "sonner"
import { useAdmin } from "@/lib/admin-context"
import {
  brazilStates,
  getBrazilState,
  hasPix,
  normalizeStoreInstagram,
  normalizeStoreWhatsapp,
  pickStoreInfo,
  storeInfoKeys,
  storeProfileSchema,
  type StoreInfoDraft,
} from "@/lib/store-info-validation"
import {
  AlertDialog,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog"
import type { AdminSection } from "./admin-sidebar"

export type StoreNavigationGuard = ((proceed: () => void) => void) | null
const fieldClass =
  "mt-2 block min-h-12 w-full min-w-0 rounded-xl border bg-background px-3 py-3 text-base text-foreground placeholder:text-muted-foreground disabled:opacity-60 sm:text-sm"
const sections = [
  { id: "identity", label: "Identidade", Icon: Store },
  { id: "location", label: "Localização", Icon: MapPin },
  { id: "contact", label: "Contato", Icon: MessageCircle },
  { id: "pix", label: "Pix", Icon: CreditCard },
]
function Field({
  name,
  label,
  hint,
  error,
  required,
  children,
  ...props
}: Omit<InputHTMLAttributes<HTMLInputElement>, "name"> & {
  name: keyof StoreInfoDraft
  label: string
  hint: string
  error?: string
  children?: ReactNode
}) {
  return (
    <div className="min-w-0">
      <label htmlFor={`store-info-${name}`} className="text-sm font-medium">
        {label}
        {required && <span className="ml-1 text-primary">*</span>}
      </label>
      <div className="relative">
        <input
          {...props}
          id={`store-info-${name}`}
          name={name}
          aria-required={required}
          aria-invalid={!!error}
          aria-describedby={`store-help-${name}${error ? ` store-error-${name}` : ""}`}
          className={`${fieldClass} ${error ? "border-red-400/60" : "border-border"} ${children ? "pr-14" : ""}`}
        />
        {children}
      </div>
      <p id={`store-help-${name}`} className="mt-2 text-[11px] leading-relaxed text-muted-foreground">
        {hint}
      </p>
      {error && (
        <p id={`store-error-${name}`} role="alert" className="mt-1.5 text-xs leading-relaxed text-red-300">
          {error}
        </p>
      )}
    </div>
  )
}
function Section({
  id,
  title,
  description,
  Icon,
  number,
  children,
}: {
  id: string
  title: string
  description: string
  Icon: typeof Store
  number: string
  children: ReactNode
}) {
  return (
    <section
      id={`store-${id}`}
      aria-labelledby={`store-heading-${id}`}
      className="scroll-mt-28 overflow-hidden rounded-2xl border border-border bg-card"
    >
      <header className="flex items-center gap-3 border-b border-border p-4 sm:px-5">
        <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary">
          <Icon aria-hidden="true" className="h-5 w-5" />
        </span>
        <div className="min-w-0 flex-1">
          <h2 id={`store-heading-${id}`} className="font-display text-base font-bold sm:text-lg">
            {title}
          </h2>
          <p className="mt-1 text-xs leading-relaxed text-muted-foreground">{description}</p>
        </div>
        <span className="hidden text-xs tabular-nums text-muted-foreground/60 sm:block">{number}</span>
      </header>
      <div className="p-4 sm:p-5">{children}</div>
    </section>
  )
}

export function StoreInfoSection({
  onRegisterGuard,
  onNavigate,
}: {
  onRegisterGuard?: (guard: StoreNavigationGuard) => void
  onNavigate?: (section: AdminSection) => void
}) {
  const { store, updateStore } = useAdmin()
  const [form, setForm] = useState(() => pickStoreInfo(store))
  const [baseline, setBaseline] = useState(() => pickStoreInfo(store))
  const baselineRef = useRef(baseline)
  const [errors, setErrors] = useState<Partial<Record<keyof StoreInfoDraft, string>>>({})
  const [saveError, setSaveError] = useState("")
  const [saving, setSaving] = useState(false)
  const savingRef = useRef(false)
  const allowLeave = useRef(false)
  const [showPix, setShowPix] = useState(false)
  const [savedAt, setSavedAt] = useState<Date | null>(null)
  const [pending, setPending] = useState<{ kind: "reset" | "leave"; proceed: () => void } | null>(null)
  const heading = useRef<HTMLHeadingElement>(null)
  const dirty = storeInfoKeys.some((key) => form[key] !== baseline[key])
  const pixRequired = hasPix(store.paymentMethods)
  const filled = storeInfoKeys.filter((key) => form[key].trim()).length
  const completion = Math.round((filled / storeInfoKeys.length) * 100)
  const state = getBrazilState(form.state)
  const whatsapp = normalizeStoreWhatsapp(form.whatsapp)
  const instagram = normalizeStoreInstagram(form.instagram)
  const cityLabel = [
    form.city.trim(),
    state && !form.city.trim().toUpperCase().endsWith(`- ${state[0]}`) ? state[0] : "",
  ]
    .filter(Boolean)
    .join(" · ")

  useEffect(() => {
    const previous = baselineRef.current
    const next = pickStoreInfo(store)
    setForm((value) => (storeInfoKeys.some((key) => value[key] !== previous[key]) ? value : next))
    baselineRef.current = next
    setBaseline(next)
  }, [store])
  useEffect(() => {
    if (!dirty && !saving) return
    function beforeUnload(event: BeforeUnloadEvent) {
      if (allowLeave.current) return
      event.preventDefault()
      event.returnValue = ""
    }
    window.addEventListener("beforeunload", beforeUnload)
    return () => window.removeEventListener("beforeunload", beforeUnload)
  }, [dirty, saving])
  useEffect(() => {
    onRegisterGuard?.(
      dirty || saving
        ? (proceed) => {
            if (savingRef.current) {
              toast.info("Aguarde o salvamento terminar.")
              return
            }
            setPending({ kind: "leave", proceed })
          }
        : null,
    )
    return () => onRegisterGuard?.(null)
  }, [dirty, saving, onRegisterGuard])
  useEffect(() => {
    if (!dirty && !saving) return
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
      const link = event.target instanceof Element ? event.target.closest<HTMLAnchorElement>("a[href]") : null
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
      if (savingRef.current) {
        toast.info("Aguarde o salvamento terminar.")
        return
      }
      setPending({
        kind: "leave",
        proceed: () => {
          allowLeave.current = true
          window.location.assign(destination.href)
        },
      })
    }
    document.addEventListener("click", protectLink, true)
    return () => document.removeEventListener("click", protectLink, true)
  }, [dirty, saving])

  function change(key: keyof StoreInfoDraft, value: string) {
    allowLeave.current = false
    setForm((draft) => ({ ...draft, [key]: value }))
    setErrors((value) => ({ ...value, [key]: undefined }))
    setSaveError("")
  }
  async function submit(event: FormEvent) {
    event.preventDefault()
    if (savingRef.current || !dirty) return
    const parsed = storeProfileSchema(pixRequired).safeParse(form)
    setSaveError("")
    if (!parsed.success) {
      const next: Partial<Record<keyof StoreInfoDraft, string>> = {}
      for (const issue of parsed.error.issues) {
        const key = issue.path[0] as keyof StoreInfoDraft
        if (!next[key]) next[key] = issue.message
      }
      setErrors(next)
      document.getElementById(`store-info-${parsed.error.issues[0].path[0]}`)?.focus()
      return
    }
    setErrors({})
    const data = Object.fromEntries(
      storeInfoKeys.filter((key) => form[key] !== baseline[key]).map((key) => [key, parsed.data[key]]),
    )
    savingRef.current = true
    setSaving(true)
    try {
      await updateStore(data)
      const saved = { ...form, ...data }
      baselineRef.current = saved
      setBaseline(saved)
      setForm(saved)
      setSavedAt(new Date())
      toast.success("Informações da loja atualizadas.")
    } catch (cause) {
      setSaveError(
        cause instanceof Error ? cause.message : "Não foi possível salvar. Suas alterações continuam aqui.",
      )
    } finally {
      savingRef.current = false
      setSaving(false)
    }
  }
  function reset() {
    setForm(baselineRef.current)
    setErrors({})
    setSaveError("")
    setShowPix(false)
    heading.current?.focus()
  }
  const field = (
    name: keyof StoreInfoDraft,
    label: string,
    hint: string,
    props: Omit<InputHTMLAttributes<HTMLInputElement>, "name" | "value" | "onChange"> = {},
    children?: ReactNode,
  ) => (
    <Field
      name={name}
      label={label}
      hint={hint}
      error={errors[name]}
      value={form[name]}
      onChange={(event) => change(name, event.target.value)}
      {...props}
    >
      {children}
    </Field>
  )

  return (
    <div className="store-info-section flex min-w-0 flex-col gap-6">
      <header className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div className="min-w-0">
          <p className="mb-2 text-[10px] font-semibold uppercase tracking-[0.2em] text-primary">
            Perfil e configurações
          </p>
          <h1
            ref={heading}
            tabIndex={-1}
            className="font-display text-3xl font-bold tracking-tight outline-none sm:text-4xl"
          >
            Informações da loja<span className="text-primary">.</span>
          </h1>
          <p className="mt-2 max-w-xl text-sm leading-relaxed text-muted-foreground">
            Cuide de cada detalhe que apresenta sua loja aos clientes.
          </p>
        </div>
        <a
          href="/"
          target="_blank"
          rel="noopener noreferrer"
          className="orders-button flex min-h-11 shrink-0 items-center justify-center gap-2 rounded-xl border border-border bg-card px-4 text-xs font-semibold"
        >
          Visualizar loja<span className="sr-only"> (abre em nova aba)</span>
          <ArrowUpRight aria-hidden="true" className="h-4 w-4" />
        </a>
      </header>
      <nav
        aria-label="Seções das informações da loja"
        className="grid grid-cols-2 gap-2 sm:flex sm:flex-wrap"
      >
        {sections.map(({ id, label, Icon }, index) => (
          <a
            key={id}
            href={`#store-${id}`}
            className="orders-button flex min-h-11 items-center gap-2 rounded-xl border border-border bg-card px-3 text-xs font-medium"
          >
            <Icon aria-hidden="true" className="h-3.5 w-3.5 text-primary" />
            {label}
            <span className="ml-auto pl-2 text-[10px] text-muted-foreground">0{index + 1}</span>
          </a>
        ))}
      </nav>

      <form id="store-information-form" onSubmit={submit} noValidate className="min-w-0 space-y-5">
        <div className="grid items-start gap-5 xl:grid-cols-[minmax(0,1fr)_300px]">
          <fieldset disabled={saving} className="min-w-0 space-y-5">
            <Section
              id="identity"
              title="Identidade da loja"
              description="O nome e a história que seus clientes conhecem."
              Icon={Store}
              number="01"
            >
              {field("name", "Nome da loja", "Exibido no site e nos comprovantes de pedido.", {
                required: true,
                maxLength: 100,
                autoComplete: "organization",
                placeholder: "Ex.: Rei dos Salgados",
              })}
              <div className="mt-5 min-w-0">
                <label htmlFor="store-info-about" className="text-sm font-medium">
                  Sobre a loja{" "}
                  <span className="ml-1 text-[10px] font-normal text-muted-foreground">Opcional</span>
                </label>
                <textarea
                  id="store-info-about"
                  value={form.about}
                  onChange={(event) => change("about", event.target.value)}
                  maxLength={1000}
                  rows={3}
                  aria-invalid={!!errors.about}
                  aria-describedby={`store-help-about${errors.about ? " store-error-about" : ""}`}
                  placeholder="Conte o que torna sua loja especial…"
                  className={`${fieldClass} min-h-28 resize-y ${errors.about ? "border-red-400/60" : "border-border"}`}
                />
                <div
                  id="store-help-about"
                  className="mt-2 flex justify-between gap-3 text-[11px] leading-relaxed text-muted-foreground"
                >
                  <span>Uma descrição curta, com a personalidade da sua marca.</span>
                  <span className="shrink-0 tabular-nums">{form.about.length}/1.000</span>
                </div>
                {errors.about && (
                  <p id="store-error-about" role="alert" className="mt-1.5 text-xs text-red-300">
                    {errors.about}
                  </p>
                )}
              </div>
            </Section>
            <Section
              id="location"
              title="Localização"
              description="Ajude os clientes a encontrar sua loja."
              Icon={MapPin}
              number="02"
            >
              {field("address", "Endereço", "Inclua rua, número e bairro, se necessário.", {
                required: true,
                maxLength: 200,
                autoComplete: "street-address",
                placeholder: "Rua, número e bairro",
              })}
              <div className="mt-5 grid gap-5 sm:grid-cols-2">
                {field("city", "Cidade", "Município onde a loja está localizada.", {
                  required: true,
                  maxLength: 100,
                  autoComplete: "address-level2",
                  placeholder: "Nome da cidade",
                })}
                <div className="min-w-0">
                  <label htmlFor="store-info-state" className="text-sm font-medium">
                    Estado <span className="text-primary">*</span>
                  </label>
                  <select
                    id="store-info-state"
                    value={state?.[1] ?? ""}
                    onChange={(event) => change("state", event.target.value)}
                    autoComplete="address-level1"
                    aria-required="true"
                    aria-invalid={!!errors.state}
                    aria-describedby={`store-help-state${errors.state ? " store-error-state" : ""}`}
                    className={`${fieldClass} ${errors.state ? "border-red-400/60" : "border-border"}`}
                  >
                    <option value="">Selecione o estado</option>
                    {brazilStates.map(([code, name]) => (
                      <option key={code} value={name}>
                        {code} · {name}
                      </option>
                    ))}
                  </select>
                  <p id="store-help-state" className="mt-2 text-[11px] text-muted-foreground">
                    Selecione a unidade federativa.
                  </p>
                  {errors.state && (
                    <p id="store-error-state" role="alert" className="mt-1.5 text-xs text-red-300">
                      {errors.state}
                    </p>
                  )}
                </div>
              </div>
            </Section>
            <Section
              id="contact"
              title="Contato e redes sociais"
              description="Deixe sua loja a uma mensagem de distância."
              Icon={MessageCircle}
              number="03"
            >
              <div className="grid gap-5 sm:grid-cols-2">
                {field("phone", "Telefone", "Número de contato, com DDD.", {
                  required: true,
                  type: "tel",
                  inputMode: "tel",
                  maxLength: 30,
                  autoComplete: "tel",
                  placeholder: "(84) 99999-9999",
                })}
                {field(
                  "whatsapp",
                  "WhatsApp para pedidos",
                  "Aceita DDD + número. O código 55 é adicionado aos números brasileiros.",
                  {
                    required: true,
                    type: "tel",
                    inputMode: "tel",
                    maxLength: 30,
                    autoComplete: "off",
                    placeholder: "55 84 99999-9999",
                  },
                )}
              </div>
              <div className="mt-5">
                {field("instagram", "Instagram", "Opcional. Cole o @usuário ou o link do seu perfil.", {
                  maxLength: 250,
                  autoCapitalize: "none",
                  spellCheck: false,
                  autoComplete: "off",
                  placeholder: "@sua_loja",
                })}
              </div>
            </Section>
            <Section
              id="pix"
              title="Recebimento por Pix"
              description="A chave que será mostrada no checkout."
              Icon={CreditCard}
              number="04"
            >
              {field(
                "pixKey",
                "Chave Pix",
                "Cole a chave exatamente como cadastrada no banco. Ela será exibida quando o cliente escolher Pix.",
                {
                  required: pixRequired,
                  maxLength: 140,
                  type: showPix ? "text" : "password",
                  autoComplete: "off",
                  spellCheck: false,
                  autoCapitalize: "none",
                  placeholder: "CPF/CNPJ, e-mail, telefone ou chave aleatória",
                },
                <button
                  type="button"
                  disabled={saving}
                  aria-label={showPix ? "Ocultar chave Pix" : "Mostrar chave Pix"}
                  aria-pressed={showPix}
                  onClick={() => setShowPix(!showPix)}
                  className="absolute right-1 top-3 flex h-10 w-10 items-center justify-center rounded-lg text-muted-foreground hover:bg-secondary hover:text-foreground"
                >
                  {showPix ? (
                    <EyeOff aria-hidden="true" className="h-4 w-4" />
                  ) : (
                    <Eye aria-hidden="true" className="h-4 w-4" />
                  )}
                </button>,
              )}
              <div className="mt-4 flex items-start gap-2.5 rounded-xl border border-border bg-background p-3">
                <CreditCard aria-hidden="true" className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
                <p className="text-[11px] leading-relaxed text-muted-foreground">
                  {pixRequired
                    ? "Pix está entre suas formas de pagamento. Mantenha uma chave preenchida para receber os pedidos."
                    : "Cadastre a chave e ative Pix na página de Pagamentos quando quiser oferecer essa opção."}
                </p>
              </div>
            </Section>
          </fieldset>

          <aside className="grid min-w-0 gap-4 md:grid-cols-2 xl:sticky xl:top-6 xl:grid-cols-1">
            <section
              className="min-w-0 overflow-hidden rounded-2xl border border-border bg-card"
              aria-labelledby="store-preview-title"
            >
              <div className="border-b border-border p-5">
                <div className="flex items-center gap-2 text-primary">
                  <Eye aria-hidden="true" className="h-4 w-4" />
                  <span className="text-[10px] font-semibold uppercase tracking-[0.15em]">
                    Visão do cliente
                  </span>
                </div>
                <h2 id="store-preview-title" className="mt-3 font-display text-lg font-bold">
                  O rosto da sua loja
                </h2>
                <p className="mt-1.5 text-xs leading-relaxed text-muted-foreground">
                  Uma prévia dos dados que aparecem no site.
                </p>
              </div>
              <div className="p-5">
                <div className="overflow-hidden rounded-xl border border-border bg-background">
                  <div className="h-14 border-b border-primary/10 bg-gradient-to-r from-primary/15 to-primary/[0.02]" />
                  <div className="px-4 pb-4">
                    <div className="relative -mt-6 flex h-12 w-12 items-center justify-center overflow-hidden rounded-xl border-4 border-background bg-secondary">
                      <Image
                        src="/logo/logoreidossalgados.png"
                        alt="Logotipo da loja"
                        fill
                        sizes="48px"
                        className="object-cover"
                      />
                    </div>
                    <p className="mt-3 break-words font-display text-base font-bold">
                      {form.name.trim() || "Nome da sua loja"}
                    </p>
                    <p className="mt-2 whitespace-pre-wrap break-words text-[11px] leading-relaxed text-muted-foreground">
                      {form.about.trim() || "Conte um pouco sobre sua loja."}
                    </p>
                    <div className="mt-4 space-y-3 border-t border-border pt-4">
                      <div className="flex items-start gap-2">
                        <MapPin aria-hidden="true" className="mt-0.5 h-3.5 w-3.5 shrink-0 text-primary" />
                        <div className="min-w-0 text-[11px] leading-relaxed">
                          <p className="break-words">{form.address.trim() || "Endereço da loja"}</p>
                          <p className="mt-0.5 break-words text-muted-foreground">
                            {cityLabel || "Cidade e estado"}
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center gap-2 text-[11px] text-muted-foreground">
                        <Phone aria-hidden="true" className="h-3.5 w-3.5 shrink-0" />
                        <span className="min-w-0 break-words">
                          {form.phone.trim() || "Telefone de contato"}
                        </span>
                      </div>
                      {instagram && (
                        <div className="flex items-center gap-2 text-[11px] text-muted-foreground">
                          <Instagram aria-hidden="true" className="h-3.5 w-3.5 shrink-0" />
                          <span className="min-w-0 break-words">{instagram}</span>
                        </div>
                      )}
                    </div>
                    <div className="mt-4 flex min-h-10 items-center justify-center gap-2 rounded-lg border border-emerald-400/20 bg-emerald-400/10 px-2 text-[11px] font-semibold text-emerald-300">
                      <MessageCircle aria-hidden="true" className="h-3.5 w-3.5 shrink-0" />
                      Peça pelo WhatsApp
                    </div>
                  </div>
                </div>
                <p className="mt-3 flex items-start gap-1.5 text-[10px] leading-relaxed text-muted-foreground">
                  <CircleAlert aria-hidden="true" className="mt-0.5 h-3 w-3 shrink-0" />
                  {dirty
                    ? "Prévia com alterações ainda não salvas."
                    : "Alterações no site são aplicadas após salvar."}
                </p>
              </div>
            </section>
            <div className="space-y-4">
              <section
                className="rounded-2xl border border-border bg-card p-5"
                aria-labelledby="store-completion-title"
              >
                <div className="flex items-center justify-between gap-2">
                  <h2 id="store-completion-title" className="font-display text-base font-bold">
                    Perfil da loja
                  </h2>
                  <span className="text-sm font-semibold tabular-nums text-primary">{completion}%</span>
                </div>
                <p className="mt-1.5 text-xs text-muted-foreground">
                  {filled} de {storeInfoKeys.length} informações preenchidas
                </p>
                <div className="mt-4 h-1.5 overflow-hidden rounded-full bg-secondary" aria-hidden="true">
                  <div className="h-full rounded-full bg-primary" style={{ width: `${completion}%` }} />
                </div>
                <ul className="mt-4 space-y-3">
                  {[
                    { label: "Identidade", done: !!form.name.trim() && !!form.about.trim(), Icon: UserRound },
                    {
                      label: "Localização",
                      done: !!form.address.trim() && !!form.city.trim() && !!state,
                      Icon: MapPin,
                    },
                    {
                      label: "Contato",
                      done: !!form.phone.trim() && /^[1-9]\d{7,14}$/.test(whatsapp),
                      Icon: MessageCircle,
                    },
                    { label: "Chave Pix", done: !!form.pixKey.trim(), Icon: CreditCard },
                  ].map(({ label, done, Icon }) => (
                    <li key={label} className="flex items-center gap-2 text-xs">
                      <Icon aria-hidden="true" className="h-3.5 w-3.5 text-muted-foreground" />
                      <span className="flex-1 text-muted-foreground">{label}</span>
                      {done ? (
                        <Check aria-label="Preenchido" className="h-3.5 w-3.5 text-emerald-300" />
                      ) : (
                        <span className="text-[10px] text-muted-foreground">A preencher</span>
                      )}
                    </li>
                  ))}
                </ul>
                <p className="mt-4 border-t border-border pt-3 text-[10px] leading-relaxed text-muted-foreground">
                  Descrição e Instagram são opcionais e também entram na contagem.
                </p>
              </section>
              {onNavigate && (
                <section
                  className="rounded-2xl border border-border bg-card p-5"
                  aria-labelledby="store-operation-title"
                >
                  <h2 id="store-operation-title" className="font-display text-base font-bold">
                    Complete a operação
                  </h2>
                  <p className="mt-1.5 text-xs leading-relaxed text-muted-foreground">
                    Outras configurações da sua loja.
                  </p>
                  <div className="mt-3 space-y-1">
                    {[
                      { label: "Horários de funcionamento", section: "hours" as const, Icon: Clock },
                      { label: "Taxas de entrega", section: "delivery" as const, Icon: Truck },
                      { label: "Formas de pagamento", section: "payments" as const, Icon: CreditCard },
                    ].map(({ label, section, Icon }) => (
                      <button
                        key={section}
                        type="button"
                        disabled={saving}
                        onClick={() => onNavigate(section)}
                        className="orders-button flex min-h-11 w-full items-center gap-2 rounded-lg px-2 text-left text-[11px] text-muted-foreground hover:text-foreground disabled:opacity-40"
                      >
                        <Icon aria-hidden="true" className="h-3.5 w-3.5 shrink-0" />
                        {label}
                        <ChevronRight aria-hidden="true" className="ml-auto h-3.5 w-3.5 shrink-0" />
                      </button>
                    ))}
                  </div>
                </section>
              )}
            </div>
          </aside>
        </div>
        {saveError && (
          <div
            role="alert"
            className="flex items-start gap-2 rounded-xl border border-red-400/20 bg-red-400/10 p-4 text-sm text-red-300"
          >
            <CircleAlert aria-hidden="true" className="mt-0.5 h-4 w-4 shrink-0" />
            <div>
              <p className="font-semibold">Não foi possível salvar</p>
              <p className="mt-1 text-xs leading-relaxed">
                {saveError} Suas alterações continuam no formulário.
              </p>
            </div>
          </div>
        )}
        <footer className="sticky bottom-[max(0.75rem,env(safe-area-inset-bottom))] z-20 flex flex-col gap-3 rounded-2xl border border-border bg-card p-4 shadow-[0_8px_32px_rgba(0,0,0,0.4)] sm:flex-row sm:items-center sm:justify-between">
          <div role="status" className="flex items-start gap-2.5">
            <span
              className={`mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg ${dirty ? "bg-primary/10 text-primary" : "bg-emerald-400/10 text-emerald-300"}`}
            >
              {saving ? (
                <Loader2 aria-hidden="true" className="h-4 w-4 animate-spin" />
              ) : dirty ? (
                <Pencil aria-hidden="true" className="h-4 w-4" />
              ) : (
                <CheckCircle2 aria-hidden="true" className="h-4 w-4" />
              )}
            </span>
            <div>
              <p className="text-xs font-semibold">
                {saving ? "Salvando informações…" : dirty ? "Alterações não salvas" : "Tudo salvo"}
              </p>
              <p className="mt-1 text-[10px] leading-relaxed text-muted-foreground">
                {dirty
                  ? "Salve para atualizar os dados no site."
                  : savedAt
                    ? `Último salvamento às ${savedAt.toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" })}.`
                    : "Edite os campos para atualizar sua loja."}
              </p>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-2 sm:flex">
            <button
              type="button"
              disabled={!dirty || saving}
              onClick={() => setPending({ kind: "reset", proceed: reset })}
              className="orders-button flex min-h-11 items-center justify-center gap-2 rounded-xl border border-border px-3 text-xs font-semibold disabled:cursor-not-allowed disabled:opacity-40"
            >
              <RotateCcw aria-hidden="true" className="h-4 w-4" />
              Descartar
            </button>
            <button
              type="submit"
              disabled={!dirty || saving}
              className="flex min-h-11 items-center justify-center gap-2 rounded-xl bg-primary px-3 text-xs font-semibold text-primary-foreground hover:bg-primary/90 disabled:cursor-not-allowed disabled:opacity-40"
            >
              {saving ? (
                <Loader2 aria-hidden="true" className="h-4 w-4 animate-spin" />
              ) : (
                <Save aria-hidden="true" className="h-4 w-4" />
              )}
              {saving ? "Salvando…" : "Salvar alterações"}
            </button>
          </div>
        </footer>
      </form>
      <AlertDialog
        open={!!pending}
        onOpenChange={(open) => {
          if (!open) setPending(null)
        }}
      >
        <AlertDialogContent className="admin-menu-dialog max-h-[90dvh] w-[calc(100%-2rem)] overflow-y-auto rounded-2xl bg-card p-5 sm:p-6">
          <AlertDialogTitle>
            {pending?.kind === "leave" ? "Sair sem salvar?" : "Descartar alterações?"}
          </AlertDialogTitle>
          <AlertDialogDescription>
            As alterações nas informações da loja ainda não foram salvas.{" "}
            {pending?.kind === "leave"
              ? "Se continuar, elas serão descartadas."
              : "O formulário voltará aos dados salvos."}
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
              {pending?.kind === "leave" ? "Descartar e sair" : "Descartar alterações"}
            </button>
          </div>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}
