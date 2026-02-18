import Link from "next/link"

export default function NotFound() {
  return (
    <div className="min-h-screen bg-background text-foreground flex flex-col items-center justify-center p-6">
      <h1 className="text-6xl font-bold text-primary">404</h1>
      <p className="mt-2 text-muted-foreground">Página não encontrada.</p>
      <Link
        href="/"
        className="mt-6 rounded-xl bg-primary px-6 py-3 text-sm font-semibold text-primary-foreground hover:bg-primary/90 transition-colors"
      >
        Voltar ao início
      </Link>
    </div>
  )
}
