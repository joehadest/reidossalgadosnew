import { prisma } from "@/lib/db"
import { paymentHandlers } from "@/lib/payment-handlers"

export const { POST, PATCH, DELETE } = paymentHandlers(prisma)
