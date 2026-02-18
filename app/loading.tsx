export default function Loading() {
  return (
    <div className="min-h-screen bg-background flex items-center justify-center">
      <div className="flex flex-col items-center gap-4">
        <div className="h-12 w-12 rounded-full bg-primary flex items-center justify-center animate-pulse">
          <span className="text-primary-foreground font-bold text-lg">RS</span>
        </div>
        <p className="text-sm text-muted-foreground">Carregando...</p>
      </div>
    </div>
  )
}
