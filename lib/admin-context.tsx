"use client"

import {
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback,
  type ReactNode,
} from "react"
import type { MenuItem, Category } from "./store-data"

export interface StoreHours {
  day: string
  open: string
  close: string
  closed?: boolean
}

export interface DeliveryFee {
  neighborhood: string
  fee: number
}

export interface StoreInfo {
  name: string
  address: string
  city: string
  state: string
  phone: string
  whatsapp: string
  instagram: string
  about: string
  pixKey: string
  paymentMethods: string[]
  hours: StoreHours[]
  deliveryFees: DeliveryFee[]
}

interface AdminContextType {
  store: StoreInfo
  categories: Category[]
  menuItems: MenuItem[]
  loading: boolean
  error: string | null
  refresh: () => Promise<void>
  updateStore: (data: Partial<StoreInfo>) => Promise<void>
  addMenuItem: (item: MenuItem) => Promise<void>
  updateMenuItem: (id: string, data: Partial<MenuItem>) => Promise<void>
  deleteMenuItem: (id: string) => Promise<void>
  addCategory: (cat: Category) => Promise<void>
  updateCategory: (id: string, data: Partial<Category>) => Promise<void>
  deleteCategory: (id: string) => Promise<void>
  reorderCategories: (ids: string[]) => Promise<void>
  addDeliveryFee: (fee: DeliveryFee) => Promise<void>
  updateDeliveryFee: (neighborhood: string, data: DeliveryFee) => Promise<void>
  deleteDeliveryFee: (neighborhood: string) => Promise<void>
  addPaymentMethod: (method: string) => Promise<void>
  deletePaymentMethod: (method: string) => Promise<void>
  updateHours: (hours: StoreHours[]) => Promise<void>
}

const AdminContext = createContext<AdminContextType | null>(null)

const emptyStore: StoreInfo = {
  name: "",
  address: "",
  city: "",
  state: "",
  phone: "",
  whatsapp: "",
  instagram: "",
  about: "",
  pixKey: "",
  paymentMethods: [],
  hours: [],
  deliveryFees: [],
}

async function fetchApi<T>(url: string, options?: RequestInit): Promise<T> {
  const res = await fetch(url, {
    ...options,
    headers: { "Content-Type": "application/json", ...options?.headers },
  })
  if (!res.ok) {
    const err = await res.json().catch(() => ({}))
    throw new Error(err.error || `HTTP ${res.status}`)
  }
  return res.json()
}

export function AdminProvider({ children }: { children: ReactNode }) {
  const [store, setStore] = useState<StoreInfo>(emptyStore)
  const [cats, setCats] = useState<Category[]>([])
  const [items, setItems] = useState<MenuItem[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const refresh = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const data = await fetchApi<{
        store: StoreInfo
        categories: Category[]
        menuItems: MenuItem[]
      }>("/api/data")
      setStore(data.store)
      setCats(data.categories)
      setItems(data.menuItems)
    } catch (e) {
      setError(e instanceof Error ? e.message : "Erro ao carregar dados")
      setStore(emptyStore)
      setCats([])
      setItems([])
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    refresh()
  }, [refresh])

  const updateStore = useCallback(async (data: Partial<StoreInfo>) => {
    await fetchApi("/api/store", {
      method: "PATCH",
      body: JSON.stringify(data),
    })
    setStore((prev) => ({ ...prev, ...data }))
  }, [])

  const addMenuItem = useCallback(async (item: MenuItem) => {
    const created = await fetchApi<MenuItem>("/api/menu", {
      method: "POST",
      body: JSON.stringify(item),
    })
    setItems((prev) => [...prev, created])
  }, [])

  const updateMenuItem = useCallback(async (id: string, data: Partial<MenuItem>) => {
    const res = await fetch(`/api/menu/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
    })
    const json = await res.json().catch(() => ({}))
    if (!res.ok) throw new Error(json.error || `HTTP ${res.status}`)
    setItems((prev) =>
      prev.map((i) => (i.id === id ? { ...i, ...data } : i))
    )
  }, [])

  const deleteMenuItem = useCallback(async (id: string) => {
    await fetchApi(`/api/menu/${id}`, { method: "DELETE" })
    setItems((prev) => prev.filter((i) => i.id !== id))
  }, [])

  const addCategory = useCallback(async (cat: Category) => {
    const created = await fetchApi<Category>("/api/categories", {
      method: "POST",
      body: JSON.stringify(cat),
    })
    setCats((prev) => [...prev, created])
  }, [])

  const updateCategory = useCallback(async (id: string, data: Partial<Category>) => {
    await fetchApi(`/api/categories/${id}`, {
      method: "PATCH",
      body: JSON.stringify(data),
    })
    setCats((prev) =>
      prev.map((c) => (c.id === id ? { ...c, ...data } : c))
    )
  }, [])

  const deleteCategory = useCallback(async (id: string) => {
    await fetchApi(`/api/categories/${id}`, { method: "DELETE" })
    setCats((prev) => prev.filter((c) => c.id !== id))
  }, [])

  const reorderCategories = useCallback(async (ids: string[]) => {
    await fetchApi("/api/categories/reorder", {
      method: "PATCH",
      body: JSON.stringify({ ids }),
    })
    setCats((prev) => {
      const byId = new Map(prev.map((c) => [c.id, c]))
      return ids.map((id) => byId.get(id)).filter(Boolean) as Category[]
    })
  }, [])

  const addDeliveryFee = useCallback(async (fee: DeliveryFee) => {
    await updateStore({
      deliveryFees: [...store.deliveryFees, fee],
    })
  }, [store.deliveryFees, updateStore])

  const updateDeliveryFee = useCallback(
    async (neighborhood: string, data: DeliveryFee) => {
      await updateStore({
        deliveryFees: store.deliveryFees.map((f) =>
          f.neighborhood === neighborhood ? data : f
        ),
      })
    },
    [store.deliveryFees, updateStore]
  )

  const deleteDeliveryFee = useCallback(
    async (neighborhood: string) => {
      await updateStore({
        deliveryFees: store.deliveryFees.filter(
          (f) => f.neighborhood !== neighborhood
        ),
      })
    },
    [store.deliveryFees, updateStore]
  )

  const addPaymentMethod = useCallback(
    async (method: string) => {
      await updateStore({
        paymentMethods: [...store.paymentMethods, method],
      })
    },
    [store.paymentMethods, updateStore]
  )

  const deletePaymentMethod = useCallback(
    async (method: string) => {
      await updateStore({
        paymentMethods: store.paymentMethods.filter((m) => m !== method),
      })
    },
    [store.paymentMethods, updateStore]
  )

  const updateHours = useCallback((hours: StoreHours[]) => {
    return updateStore({ hours })
  }, [updateStore])

  return (
    <AdminContext.Provider
      value={{
        store,
        categories: cats,
        menuItems: items,
        loading,
        error,
        refresh,
        updateStore,
        addMenuItem,
        updateMenuItem,
        deleteMenuItem,
        addCategory,
        updateCategory,
        deleteCategory,
        reorderCategories,
        addDeliveryFee,
        updateDeliveryFee,
        deleteDeliveryFee,
        addPaymentMethod,
        deletePaymentMethod,
        updateHours,
      }}
    >
      {children}
    </AdminContext.Provider>
  )
}

export function useAdmin() {
  const ctx = useContext(AdminContext)
  if (!ctx) throw new Error("useAdmin must be used within AdminProvider")
  return ctx
}
