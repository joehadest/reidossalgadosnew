import { prisma } from "@/lib/db"
import { menuHandlers } from "@/lib/menu-handlers"

export const dynamic = "force-dynamic"
const handlers = menuHandlers(prisma)
export const PATCH = handlers.PATCH
export const DELETE = handlers.DELETE
