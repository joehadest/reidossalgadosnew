import type { Category, MenuItem } from "./store-data"

export type MenuStatus = "all" | "active" | "paused"
export type MenuSort = "name" | "name-desc" | "price" | "price-desc"
export const menuMoney = (value: number) =>
  new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(value)
export const normalizeMenuText = (value: string) =>
  value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLocaleLowerCase("pt-BR")
    .trim()

export function menuPrice(item: MenuItem) {
  const available = item.variants?.filter((variant) => variant.available) ?? []
  return available.length ? Math.min(...available.map((variant) => variant.price)) : item.price
}
export function filterMenu(
  items: MenuItem[],
  categories: Category[],
  search: string,
  category: string,
  status: MenuStatus,
  sort: MenuSort,
) {
  const terms = normalizeMenuText(search).split(/\s+/).filter(Boolean)
  const byCategory = new Map(categories.map((entry) => [entry.id, entry.name]))
  return items
    .filter((item) => {
      if (category && category !== item.category) return false
      if (status === "active" && item.available === false) return false
      if (status === "paused" && item.available !== false) return false
      const searchable = normalizeMenuText(
        [
          item.name,
          item.description,
          byCategory.get(item.category) ?? "",
          ...(item.variants?.map((variant) => variant.name) ?? []),
        ].join(" "),
      )
      return terms.every((term) => searchable.includes(term))
    })
    .sort((a, b) => {
      const name = a.name.localeCompare(b.name, "pt-BR") || a.id.localeCompare(b.id)
      if (sort === "price" || sort === "price-desc")
        return (menuPrice(a) - menuPrice(b)) * (sort === "price" ? 1 : -1) || name
      return sort === "name-desc" ? -name : name
    })
}
export function parseMenuPrice(value: string): number | null {
  const normalized = value.trim().replace(",", ".")
  if (!/^\d+(?:\.\d{1,2})?$/.test(normalized)) return null
  const result = Number(normalized)
  return Number.isFinite(result) && result <= Number.MAX_SAFE_INTEGER / 100 ? result : null
}
export function validMenuImage(value: string): boolean {
  if (!value) return true
  if (value.startsWith("/") && !value.startsWith("//")) return true
  try {
    return ["https:", "http:"].includes(new URL(value).protocol)
  } catch {
    return false
  }
}
