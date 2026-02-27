import { PrismaClient } from "@prisma/client";
import { PrismaNeon } from "@prisma/adapter-neon";
import { neonConfig } from "@neondatabase/serverless";
import ws from "ws";
import "dotenv/config";

// WebSocket configuration for Neon
neonConfig.webSocketConstructor = ws;

const connectionString = process.env.DATABASE_URL;

if (!connectionString) {
  throw new Error("DATABASE_URL is not defined");
}

const adapter = new PrismaNeon({ connectionString });

const prisma = new PrismaClient({ adapter });

async function migrate() {
  try {
    console.log("Migrazione ordini in corso...");

    // Aggiorna tutti gli ordini COMPLETED, CONFIRMED, READY a DELIVERED
    const updatedToDelivered = await prisma.order.updateMany({
      where: {
        status: {
          in: ["COMPLETED", "DELIVERED"],
        },
      },
      data: {
        status: "DELIVERED",
      },
    });
    console.log(`✓ Aggiornati ${updatedToDelivered.count} ordini a "DELIVERED"`);

    // Archivia ordini cancellati
    const cancelledOrders = await prisma.order.updateMany({
      where: {
        status: "CANCELLED",
      },
      data: {
        isArchived: true,
      },
    });
    console.log(`✓ Archiviati ${cancelledOrders.count} ordini cancellati`);

    console.log("\n✅ Migrazione completata!");
  } catch (error) {
    console.error("❌ Errore:", error);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

migrate();
