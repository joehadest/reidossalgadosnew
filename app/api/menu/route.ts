import { prisma } from "@/lib/db"
import { menuHandlers } from "@/lib/menu-handlers"

export const POST = menuHandlers(prisma).POST
