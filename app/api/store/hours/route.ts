import { prisma } from "@/lib/db"
import { storeHoursHandlers } from "@/lib/store-hours-handlers"

export const { PATCH } = storeHoursHandlers(prisma)
