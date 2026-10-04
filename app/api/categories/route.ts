import { prisma } from "@/lib/db"
import { categoryHandlers } from "@/lib/category-handlers"

export const { POST } = categoryHandlers(prisma)
