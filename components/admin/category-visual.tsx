import { Flame, Cookie, CupSoda, Package, UtensilsCrossed } from "lucide-react"

export const categoryIconOptions = [
  {
    value: "flame",
    label: "Salgados",
    Icon: Flame,
    tone: "bg-amber-400/10 text-amber-300",
    bar: "bg-amber-400",
  },
  {
    value: "cookie",
    label: "Doces",
    Icon: Cookie,
    tone: "bg-violet-400/10 text-violet-300",
    bar: "bg-violet-400",
  },
  {
    value: "sandwich",
    label: "Lanches",
    Icon: UtensilsCrossed,
    tone: "bg-orange-400/10 text-orange-300",
    bar: "bg-orange-400",
  },
  {
    value: "cup-soda",
    label: "Bebidas",
    Icon: CupSoda,
    tone: "bg-sky-400/10 text-sky-300",
    bar: "bg-sky-400",
  },
  {
    value: "package",
    label: "Combos",
    Icon: Package,
    tone: "bg-emerald-400/10 text-emerald-300",
    bar: "bg-emerald-400",
  },
] as const

export function categoryVisual(icon: string) {
  return categoryIconOptions.find((option) => option.value === icon) ?? categoryIconOptions[4]
}

export function CategoryIcon({ icon, className = "h-5 w-5" }: { icon: string; className?: string }) {
  const { Icon } = categoryVisual(icon)
  return <Icon aria-hidden="true" className={className} />
}
