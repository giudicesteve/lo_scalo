import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function migrate() {
  try {
    console.log('Migrazione ordini in corso...');

    // Aggiorna tutti gli ordini COMPLETED, CONFIRMED, READY a DELIVERED
    const updatedToDelivered = await prisma.order.updateMany({
      where: {
        status: {
          in: ['COMPLETED', 'CONFIRMED', 'READY']
        }
      },
      data: {
        status: 'DELIVERED'
      }
    });
    console.log(`✓ Aggiornati ${updatedToDelivered.count} ordini a "DELIVERED"`);

    // CANCELLATI li lasciamo come sono o li archiviamo?
    // Per ora li archiviamo automaticamente
    const cancelledOrders = await prisma.order.updateMany({
      where: {
        status: 'CANCELLED'
      },
      data: {
        isArchived: true
      }
    });
    console.log(`✓ Archiviati ${cancelledOrders.count} ordini cancellati`);

    console.log('\n✅ Migrazione completata!');
  } catch (error) {
    console.error('❌ Errore:', error);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

migrate();
