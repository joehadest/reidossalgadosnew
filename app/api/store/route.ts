import { prisma } from "@/lib/db"
import { storeHandlers } from "@/lib/store-handlers"

export const { PATCH } = storeHandlers(prisma)
