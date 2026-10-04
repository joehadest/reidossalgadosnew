import { prisma } from "@/lib/db"
import { adminLoginHandler } from "@/lib/admin-login-handler"

export const POST = adminLoginHandler(prisma)
