import { prisma } from "@/lib/db"
import { counterHandlers } from "@/lib/counter-handlers"

export const { POST } = counterHandlers(prisma)
