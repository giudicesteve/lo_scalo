import { PrismaClient } from "@prisma/client";
import { PrismaNeon } from "@prisma/adapter-neon";
import { neonConfig } from "@neondatabase/serverless";
import ws from "ws";

// WebSocket configuration for Neon in Node.js environment
neonConfig.webSocketConstructor = ws;

const connectionString = process.env.DATABASE_URL;

if (!connectionString) {
  throw new Error("DATABASE_URL is not defined in environment variables");
}

const adapter = new PrismaNeon({ connectionString });
const prisma = new PrismaClient({ adapter });

const defaultFlags = [
  {
    key: "FRONTEND_ENABLED",
    name: "Sito Pubblico",
    description: "Se disabilitato, mostra solo logo e footer",
    enabled: true,
  },
  {
    key: "SHOP_ENABLED",
    name: "Negozio",
    description: "Abilita sezione shop frontend e admin",
    enabled: true,
  },
  {
    key: "GIFT_CARDS_ENABLED",
    name: "Gift Cards",
    description: "Abilita acquisto gift cards online",
    enabled: true,
  },
  {
    key: "GIFT_CARDS_POS_ENABLED",
    name: "Gift Cards POS",
    description: "Abilita creazione gift cards in negozio (POS)",
    enabled: true,
  },
  {
    key: "MENU_ENABLED",
    name: "Menu",
    description: "Abilita sezione menu cocktail",
    enabled: true,
  },
  {
    key: "STORY_ENABLED",
    name: "Storia",
    description: "Abilita pagina storia del locale",
    enabled: true,
  },
  {
    key: "PLAYLIST_ENABLED",
    name: "Playlist",
    description: "Abilita pagina playlist",
    enabled: true,
  },
  {
    key: "LOCATION_ENABLED",
    name: "Dove Siamo",
    description: "Abilita sezione/link dove siamo",
    enabled: true,
  },
  {
    key: "PRINTED_GIFT_CARDS",
    name: "Gift Card Cartacee",
    description: "Abilita generazione e gestione gift card da stampare",
    enabled: false, // Default disabilitato
  },
];

async function seedFeatureFlags() {
  console.log("🌱 Seeding feature flags...");

  for (const flag of defaultFlags) {
    await prisma.featureFlag.upsert({
      where: { key: flag.key },
      update: {
        // Non sovrascrivere se il flag esiste già
        // Mantieni lo stato attuale dell'utente
      },
      create: {
        key: flag.key,
        name: flag.name,
        description: flag.description,
        enabled: flag.enabled,
      },
    });
    console.log(`  ✓ Flag '${flag.key}' ensured`);
  }

  console.log("✅ Feature flags seeding completed!");
}

seedFeatureFlags()
  .catch((e) => {
    console.error("❌ Error seeding feature flags:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
