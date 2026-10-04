import { prisma } from "@/lib/db"
import { adminPasswordHandlers } from "@/lib/admin-password-handlers"

export const { GET } = adminPasswordHandlers(prisma)
