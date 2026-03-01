/**
 * Script di migrazione: converte tutti i campi monetari da euro (float) a cents (integer)
 * 
 * Esegue:
 * 1. Cocktail.price
 * 2. GiftCardTemplate.value, price
 * 3. GiftCard.initialValue, remainingValue
 * 4. GiftCardTransaction.amount
 * 5. Order.total
 * 6. OrderItem.unitPrice, totalPrice
 * 7. Product.price
 * 8. Refund.totalRefunded
 * 
 * ATTENZIONE: Eseguire solo dopo aver applicato le modifiche allo schema Prisma!
 */

// Import the prisma client from the lib (which has the correct configuration)
import { prisma } from '../src/lib/prisma'

async function migrate() {
  console.log('🚀 Inizio migrazione euro -> cents...\n')

  try {
    // 1. Cocktail
    console.log('🍸 Migrating Cocktails...')
    const cocktails = await prisma.cocktail.findMany()
    for (const cocktail of cocktails) {
      const priceCents = Math.round(cocktail.price * 100)
      await prisma.cocktail.update({
        where: { id: cocktail.id },
        data: { price: priceCents },
      })
    }
    console.log(`   ✅ ${cocktails.length} cocktails aggiornati`)

    // 2. GiftCardTemplate
    console.log('🎁 Migrating Gift Card Templates...')
    const templates = await prisma.giftCardTemplate.findMany()
    for (const template of templates) {
      await prisma.giftCardTemplate.update({
        where: { id: template.id },
        data: {
          value: Math.round(template.value * 100),
          price: Math.round(template.price * 100),
        },
      })
    }
    console.log(`   ✅ ${templates.length} templates aggiornati`)

    // 3. GiftCard
    console.log('💳 Migrating Gift Cards...')
    const giftCards = await prisma.giftCard.findMany()
    for (const card of giftCards) {
      await prisma.giftCard.update({
        where: { id: card.id },
        data: {
          initialValue: Math.round(card.initialValue * 100),
          remainingValue: Math.round(card.remainingValue * 100),
        },
      })
    }
    console.log(`   ✅ ${giftCards.length} gift cards aggiornate`)

    // 4. GiftCardTransaction
    console.log('💰 Migrating Gift Card Transactions...')
    const transactions = await prisma.giftCardTransaction.findMany()
    for (const tx of transactions) {
      await prisma.giftCardTransaction.update({
        where: { id: tx.id },
        data: { amount: Math.round(tx.amount * 100) },
      })
    }
    console.log(`   ✅ ${transactions.length} transazioni aggiornate`)

    // 5. Order
    console.log('📦 Migrating Orders...')
    const orders = await prisma.order.findMany()
    for (const order of orders) {
      await prisma.order.update({
        where: { id: order.id },
        data: { total: Math.round(order.total * 100) },
      })
    }
    console.log(`   ✅ ${orders.length} ordini aggiornati`)

    // 6. OrderItem
    console.log('📋 Migrating Order Items...')
    const orderItems = await prisma.orderItem.findMany()
    for (const item of orderItems) {
      await prisma.orderItem.update({
        where: { id: item.id },
        data: {
          unitPrice: Math.round(item.unitPrice * 100),
          totalPrice: Math.round(item.totalPrice * 100),
        },
      })
    }
    console.log(`   ✅ ${orderItems.length} order items aggiornati`)

    // 7. Product
    console.log('👕 Migrating Products...')
    const products = await prisma.product.findMany()
    for (const product of products) {
      await prisma.product.update({
        where: { id: product.id },
        data: { price: Math.round(product.price * 100) },
      })
    }
    console.log(`   ✅ ${products.length} prodotti aggiornati`)

    // 8. Refund
    console.log('💸 Migrating Refunds...')
    const refunds = await prisma.refund.findMany()
    for (const refund of refunds) {
      await prisma.refund.update({
        where: { id: refund.id },
        data: { totalRefunded: Math.round(refund.totalRefunded * 100) },
      })
    }
    console.log(`   ✅ ${refunds.length} rimborsi aggiornati`)

    console.log('\n✨ Migrazione completata con successo!')
    console.log('\n📊 Riassunto:')
    console.log(`   - ${cocktails.length} cocktails`)
    console.log(`   - ${templates.length} gift card templates`)
    console.log(`   - ${giftCards.length} gift cards`)
    console.log(`   - ${transactions.length} transazioni`)
    console.log(`   - ${orders.length} ordini`)
    console.log(`   - ${orderItems.length} order items`)
    console.log(`   - ${products.length} prodotti`)
    console.log(`   - ${refunds.length} rimborsi`)

  } catch (error) {
    console.error('\n❌ Errore durante la migrazione:', error)
    throw error
  } finally {
    await prisma.$disconnect()
  }
}

// Esegui se chiamato direttamente
if (require.main === module) {
  migrate()
    .then(() => process.exit(0))
    .catch(() => process.exit(1))
}

export { migrate }
