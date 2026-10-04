import { prisma } from "@/lib/db"
import { deliveryFeeHandlers } from "@/lib/delivery-fee-handlers"

export const { POST, PATCH, DELETE } = deliveryFeeHandlers(prisma)
