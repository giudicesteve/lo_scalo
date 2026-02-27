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

async function seed() {
  // Crea admin
  await prisma.admin.create({
    data: {
      email: "admin@loscalo.it",
      name: "Admin",
    },
  });
  console.log("Admin creato: admin@loscalo.it");

  // Crea template gift card
  await prisma.giftCardTemplate.createMany({
    data: [
      { value: 50, price: 50 },
      { value: 100, price: 100 },
      { value: 200, price: 200 },
    ],
  });
  console.log("Gift Card Templates create");
}

seed()
  .then(() => process.exit(0))
  .catch((e) => {
    console.error(e);
    process.exit(1);
  });
