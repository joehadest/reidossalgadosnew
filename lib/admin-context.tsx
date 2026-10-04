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
  updateDeliveryFee: (previous: DeliveryFee, data: DeliveryFee) => Promise<void>
  deleteDeliveryFee: (previous: DeliveryFee) => Promise<void>
  addPaymentMethod: (method: string, pixKey?: string, previousPixKey?: string) => Promise<void>
  updatePaymentMethod: (previousName: string, name: string, pixKey?: string, previousPixKey?: string) => Promise<void>
  updatePixKey: (pixKey: string, previousPixKey: string) => Promise<void>
  deletePaymentMethod: (method: string) => Promise<void>
  updateHours: (hours: StoreHours[], previousHours?: StoreHours[]) => Promise<StoreHours[]>
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
    const result = await fetchApi<{ store?: Partial<StoreInfo> }>("/api/store", {
      method: "PATCH",
      body: JSON.stringify(data),
    })
    setStore((prev) => ({ ...prev, ...data, ...result.store }))
  }, [])

  const addMenuItem = useCallback(async (item: MenuItem) => {
    const created = await fetchApi<MenuItem>("/api/menu", {
      method: "POST",
      body: JSON.stringify(item),
    })
    setItems((prev) => [...prev, created])
  }, [])

  const updateMenuItem = useCallback(async (id: string, data: Partial<MenuItem>) => {
    const updated = await fetchApi<MenuItem>(`/api/menu/${id}`, {
      method: "PATCH",
      body: JSON.stringify(data),
    })
    setItems((prev) =>
      prev.map((i) => (i.id === id ? updated : i))
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
    const updated = await fetchApi<Category>(`/api/categories/${id}`, {
      method: "PATCH",
      body: JSON.stringify(data),
    })
    setCats((prev) =>
      prev.map((c) => (c.id === id ? updated : c))
    )
  }, [])

  const deleteCategory = useCallback(async (id: string) => {
    await fetchApi(`/api/categories/${id}`, { method: "DELETE" })
    setCats((prev) => prev.filter((c) => c.id !== id))
  }, [])

  const reorderCategories = useCallback(async (ids: string[]) => {
    const result = await fetchApi<{ categories: Category[] }>("/api/categories/reorder", {
      method: "PATCH",
      body: JSON.stringify({ ids, previousIds: cats.map((cat) => cat.id) }),
    })
    setCats(result.categories)
  }, [cats])

  const mutateDeliveryFee = useCallback(async (method: string, data: unknown) => {
    const result = await fetchApi<{ deliveryFees: DeliveryFee[] }>("/api/store/delivery-fees", {
      method, body: JSON.stringify(data),
    })
    setStore((prev) => ({ ...prev, deliveryFees: result.deliveryFees }))
  }, [])
  const addDeliveryFee = useCallback((fee: DeliveryFee) => mutateDeliveryFee("POST", fee), [mutateDeliveryFee])
  const updateDeliveryFee = useCallback((previous: DeliveryFee, data: DeliveryFee) =>
    mutateDeliveryFee("PATCH", { previous, data }), [mutateDeliveryFee])
  const deleteDeliveryFee = useCallback((previous: DeliveryFee) =>
    mutateDeliveryFee("DELETE", { previous }), [mutateDeliveryFee])

  const mutatePayment = useCallback(async (method: string, data: unknown) => {
    const result = await fetchApi<{ paymentMethods: string[]; pixKey: string }>("/api/store/payments", {
      method, body: JSON.stringify(data),
    })
    setStore((prev) => ({ ...prev, paymentMethods: result.paymentMethods, pixKey: result.pixKey }))
  }, [])
  const addPaymentMethod = useCallback((name: string, pixKey?: string, previousPixKey?: string) =>
    mutatePayment("POST", { name, pixKey, previousPixKey }), [mutatePayment])
  const updatePaymentMethod = useCallback((previousName: string, name: string, pixKey?: string, previousPixKey?: string) =>
    mutatePayment("PATCH", { action: "rename", previousName, name, pixKey, previousPixKey }), [mutatePayment])
  const updatePixKey = useCallback((pixKey: string, previousPixKey: string) =>
    mutatePayment("PATCH", { action: "pix", pixKey, previousPixKey }), [mutatePayment])
  const deletePaymentMethod = useCallback((name: string) => mutatePayment("DELETE", { name }), [mutatePayment])

  const updateHours = useCallback(async (hours: StoreHours[], previousHours?: StoreHours[]) => {
    const result = await fetchApi<{ hours: StoreHours[] }>("/api/store/hours", {
      method: "PATCH", body: JSON.stringify({ hours, previousHours }),
    })
    setStore((prev) => ({ ...prev, hours: result.hours }))
    return result.hours
  }, [])

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
        updatePaymentMethod,
        updatePixKey,
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
