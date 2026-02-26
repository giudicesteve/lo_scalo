// Script per aggiornare i numeri ordine esistenti al nuovo formato sicuro
// Formato vecchio: 2026-0066
// Formato nuovo: 2026-0066-XXXX (dove XXXX sono 4 caratteri random)
//
// Eseguire con: npx ts-node scripts/update-order-numbers.ts

import { PrismaClient } from "@prisma/client"

const prisma = new PrismaClient()

// Caratteri validi per il codice random (esclusi 0,1,I,O per evitare confusione)
const RANDOM_CHARS = "23456789ABCDEFGHJKLMNPQRSTUVWXYZ"

function generateRandomSuffix(): string {
  let result = ""
  for (let i = 0; i < 4; i++) {
    result += RANDOM_CHARS.charAt(Math.floor(Math.random() * RANDOM_CHARS.length))
  }
  return result
}

async function main() {
  console.log("🔧 Aggiornamento numeri ordine...")
  
  // Trova tutti gli ordini con il formato vecchio (senza suffisso random)
  // Formato vecchio: YYYY-NNNN (2 parti)
  // Formato nuovo: YYYY-NNNN-XXXX (3 parti)
  const orders = await prisma.order.findMany({
    select: { id: true, orderNumber: true },
  })
  
  const ordersToUpdate = orders.filter(order => {
    const parts = order.orderNumber.split("-")
    // Se ha solo 2 parti, è nel formato vecchio
    return parts.length === 2
  })
  
  console.log(`📦 Trovati ${ordersToUpdate.length} ordini da aggiornare`)
  
  let updated = 0
  let errors = 0
  
  for (const order of ordersToUpdate) {
    try {
      const newOrderNumber = `${order.orderNumber}-${generateRandomSuffix()}`
      
      await prisma.order.update({
        where: { id: order.id },
        data: { orderNumber: newOrderNumber },
      })
      
      console.log(`✅ ${order.orderNumber} → ${newOrderNumber}`)
      updated++
    } catch (error) {
      console.error(`❌ Errore aggiornando ordine ${order.id}:`, error)
      errors++
    }
  }
  
  console.log("\n📊 Riepilogo:")
  console.log(`   Aggiornati: ${updated}`)
  console.log(`   Errori: ${errors}`)
  console.log(`   Totale: ${ordersToUpdate.length}`)
}

main()
  .catch((e) => {
    console.error(e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
