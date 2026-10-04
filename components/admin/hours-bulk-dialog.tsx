"use client"

import { useRef, useState, type FormEvent } from "react"
import { Check, CircleAlert, Copy, Moon } from "lucide-react"
import { Dialog, DialogContent, DialogTitle, DialogDescription } from "@/components/ui/dialog"
import {
  AlertDialog,
  AlertDialogContent,
  AlertDialogTitle,
  AlertDialogDescription,
  AlertDialogCancel,
} from "@/components/ui/alert-dialog"
import { WEEK_DAYS, type StoreHourEntry } from "@/lib/store-hours"
import { hourLabels, hoursDuration, intervalMinutes, storeHoursEntrySchema } from "@/lib/hours-management"

export function HoursBulkDialog({
  initial,
  onApply,
  onClose,
  onReturnFocus,
}: {
  initial: StoreHourEntry
  onApply: (days: string[], open: string, close: string) => void
  onClose: () => void
  onReturnFocus: () => void
}) {
  const [open, setOpen] = useState(initial.open)
  const [close, setClose] = useState(initial.close)
  const [days, setDays] = useState<string[]>(WEEK_DAYS.slice(0, 5))
  const [error, setError] = useState("")
  const [discard, setDiscard] = useState(false)
  const title = useRef<HTMLHeadingElement>(null)
  const dirty =
    open !== initial.open ||
    close !== initial.close ||
    JSON.stringify(days) !== JSON.stringify(WEEK_DAYS.slice(0, 5))
  const duration = intervalMinutes({ day: "Segunda", open, close })
  function requestClose() {
    if (dirty) setDiscard(true)
    else onClose()
  }
  function submit(event: FormEvent) {
    event.preventDefault()
    const parsed = storeHoursEntrySchema.safeParse({ day: "Segunda", open, close, closed: false })
    if (!parsed.success) {
      setError(parsed.error.issues[0].message)
      document.getElementById(`bulk-hours-${parsed.error.issues[0].path[0]}`)?.focus()
      return
    }
    if (!days.length) {
      setError("Selecione pelo menos um dia.")
      return
    }
    onApply(days, open, close)
  }
  return (
    <>
      <Dialog
        open
        onOpenChange={(value) => {
          if (!value) requestClose()
        }}
      >
        <DialogContent
          closeLabel="Fechar aplicação de horários"
          className="admin-menu-dialog menu-editor-dialog inset-x-0 bottom-0 left-0 top-auto flex max-h-[94dvh] w-full max-w-none translate-x-0 translate-y-0 flex-col gap-0 overflow-hidden rounded-t-2xl bg-card p-0 sm:bottom-auto sm:left-1/2 sm:top-1/2 sm:max-h-[90dvh] sm:w-[calc(100%-3rem)] sm:max-w-xl sm:-translate-x-1/2 sm:-translate-y-1/2 sm:rounded-2xl"
          onOpenAutoFocus={(event) => {
            event.preventDefault()
            title.current?.focus()
          }}
          onCloseAutoFocus={(event) => {
            event.preventDefault()
            onReturnFocus()
          }}
          onPointerDownOutside={(event) => event.preventDefault()}
        >
          <header className="shrink-0 border-b border-border px-5 py-5 pr-16 sm:px-6 sm:pr-16">
            <p className="mb-2 text-[10px] font-semibold uppercase tracking-[0.18em] text-primary">
              Edição da semana
            </p>
            <DialogTitle ref={title} tabIndex={-1} className="font-display text-xl font-bold outline-none">
              Aplicar em vários dias
            </DialogTitle>
            <DialogDescription className="mt-2 text-xs leading-relaxed">
              Defina um intervalo e escolha quais dias vão usar esse horário.
            </DialogDescription>
          </header>
          <form onSubmit={submit} noValidate className="flex min-h-0 flex-1 flex-col">
            <div className="min-h-0 flex-1 space-y-6 overflow-y-auto overscroll-contain p-5 sm:p-6">
              <div className="grid min-w-0 grid-cols-2 gap-3">
                <div className="min-w-0">
                  <label htmlFor="bulk-hours-open" className="text-sm font-medium">
                    Abre às
                  </label>
                  <input
                    id="bulk-hours-open"
                    type="time"
                    value={open}
                    aria-invalid={!!error}
                    aria-describedby={error ? "bulk-hours-error" : undefined}
                    onInput={(event) => {
                      setOpen(event.currentTarget.value)
                      setError("")
                    }}
                    className="mt-2 min-h-12 w-full min-w-0 rounded-xl border border-border bg-background px-2 text-base [color-scheme:dark] sm:px-3 sm:text-sm"
                  />
                </div>
                <div className="min-w-0">
                  <label htmlFor="bulk-hours-close" className="text-sm font-medium">
                    Fecha às
                  </label>
                  <input
                    id="bulk-hours-close"
                    type="time"
                    value={close}
                    aria-invalid={!!error}
                    aria-describedby={error ? "bulk-hours-error" : undefined}
                    onInput={(event) => {
                      setClose(event.currentTarget.value)
                      setError("")
                    }}
                    className="mt-2 min-h-12 w-full min-w-0 rounded-xl border border-border bg-background px-2 text-base [color-scheme:dark] sm:px-3 sm:text-sm"
                  />
                </div>
              </div>
              {duration !== null && (
                <p className="flex items-center gap-2 text-xs text-muted-foreground">
                  {close < open && <Moon aria-hidden="true" className="h-4 w-4 text-violet-300" />}
                  {hoursDuration(duration)} de atendimento
                  {close < open ? ", com fechamento no dia seguinte." : " por dia."}
                </p>
              )}
              {error && (
                <p
                  id="bulk-hours-error"
                  role="alert"
                  className="flex items-start gap-2 rounded-xl border border-red-400/20 bg-red-400/10 p-3 text-sm text-red-300"
                >
                  <CircleAlert aria-hidden="true" className="mt-0.5 h-4 w-4 shrink-0" />
                  {error}
                </p>
              )}
              <fieldset>
                <legend className="text-sm font-medium">Aplicar nos dias</legend>
                <div className="mt-3 flex flex-wrap gap-2">
                  {[
                    { label: "Seg–Sex", selected: WEEK_DAYS.slice(0, 5) },
                    { label: "Fim de semana", selected: WEEK_DAYS.slice(5) },
                    { label: "Todos", selected: [...WEEK_DAYS] },
                  ].map((choice) => (
                    <button
                      key={choice.label}
                      type="button"
                      aria-pressed={
                        choice.selected.length === days.length &&
                        choice.selected.every((day) => days.includes(day))
                      }
                      onClick={() => {
                        setDays(choice.selected)
                        setError("")
                      }}
                      className="orders-button min-h-11 rounded-xl border border-border px-3 text-xs font-medium aria-pressed:border-primary/40 aria-pressed:bg-primary/10 aria-pressed:text-primary"
                    >
                      {choice.label}
                    </button>
                  ))}
                </div>
                <div className="mt-3 grid grid-cols-2 gap-2">
                  {WEEK_DAYS.map((day) => (
                    <label
                      key={day}
                      className={`flex min-h-12 cursor-pointer items-center gap-2 rounded-xl border px-3 text-xs font-medium ${days.includes(day) ? "border-primary/30 bg-primary/5" : "border-border"}`}
                    >
                      <input
                        type="checkbox"
                        checked={days.includes(day)}
                        onChange={(event) => {
                          setDays((value) =>
                            event.target.checked
                              ? WEEK_DAYS.filter((entry) => value.includes(entry) || entry === day)
                              : value.filter((entry) => entry !== day),
                          )
                          setError("")
                        }}
                        className="h-4 w-4 shrink-0 accent-primary"
                      />
                      {hourLabels[day]}
                    </label>
                  ))}
                </div>
              </fieldset>
              <p className="flex items-start gap-2 rounded-xl border border-primary/20 bg-primary/5 p-3 text-xs leading-relaxed text-muted-foreground">
                <Check aria-hidden="true" className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
                Os dias selecionados ficarão abertos. As mudanças só serão publicadas ao salvar a semana.
              </p>
            </div>
            <footer className="grid shrink-0 grid-cols-2 gap-3 border-t border-border p-5 pb-[max(1.25rem,env(safe-area-inset-bottom))] sm:px-6">
              <button
                type="button"
                onClick={requestClose}
                className="orders-button min-h-11 rounded-xl border border-border text-sm font-semibold"
              >
                Cancelar
              </button>
              <button
                type="submit"
                disabled={!days.length}
                className="flex min-h-11 items-center justify-center gap-2 rounded-xl bg-primary px-2 text-xs font-semibold text-primary-foreground hover:bg-primary/90 disabled:opacity-40"
              >
                <Copy aria-hidden="true" className="h-4 w-4" />
                Aplicar a {days.length} {days.length === 1 ? "dia" : "dias"}
              </button>
            </footer>
          </form>
        </DialogContent>
      </Dialog>
      <AlertDialog open={discard} onOpenChange={setDiscard}>
        <AlertDialogContent className="admin-menu-dialog max-h-[90dvh] w-[calc(100%-2rem)] overflow-y-auto rounded-2xl bg-card p-5 sm:p-6">
          <AlertDialogTitle>Descartar seleção?</AlertDialogTitle>
          <AlertDialogDescription>
            O horário e os dias escolhidos ainda não foram aplicados à semana.
          </AlertDialogDescription>
          <div className="grid grid-cols-2 gap-3">
            <AlertDialogCancel className="m-0 min-h-11 rounded-xl border-border bg-transparent text-xs">
              Continuar editando
            </AlertDialogCancel>
            <button
              onClick={() => {
                setDiscard(false)
                onClose()
              }}
              className="min-h-11 rounded-xl bg-destructive px-2 text-xs font-semibold text-destructive-foreground"
            >
              Descartar seleção
            </button>
          </div>
        </AlertDialogContent>
      </AlertDialog>
    </>
  )
}
