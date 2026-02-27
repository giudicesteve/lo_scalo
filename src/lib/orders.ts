import { prisma } from "./prisma"

const RANDOM_CHARS = "23456789ABCDEFGHJKLMNPQRSTUVWXYZ" // Esclusi 0, 1, I, O per evitare confusione

function generateRandomSuffix(): string {
  let result = ""
  for (let i = 0; i < 4; i++) {
    result += RANDOM_CHARS.charAt(Math.floor(Math.random() * RANDOM_CHARS.length))
  }
  return result
}

export async function generateOrderNumber(): Promise<string> {
  const currentYear = new Date().getFullYear()
  
  // Trova l'ultimo ordine dell'anno corrente
  const lastOrder = await prisma.order.findFirst({
    where: {
      orderNumber: {
        startsWith: currentYear.toString(),
      },
    },
    orderBy: { createdAt: "desc" },
    select: { orderNumber: true },
  })

  let nextNumber = 1
  if (lastOrder) {
    // Estrai il numero progressivo (secondo elemento)
    // Formato: YYYY-NNNN-XXXX o YYYY-NNNNN-XXXX
    const parts = lastOrder.orderNumber.split("-")
    if (parts.length >= 2) {
      const lastNumber = parseInt(parts[1], 10)
      if (!isNaN(lastNumber)) {
        nextNumber = lastNumber + 1
      }
    }
  }

  // Formato: YYYY-NNNN-XXXX (dove NNNN può crescere oltre 4 cifre)
  const progressive = nextNumber.toString().padStart(4, "0")
  const randomSuffix = generateRandomSuffix()
  
  return `${currentYear}-${progressive}-${randomSuffix}`
}
