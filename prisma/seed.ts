import { PrismaClient } from "@prisma/client";
import { PrismaNeon } from "@prisma/adapter-neon";
import { neonConfig } from "@neondatabase/serverless";
import ws from "ws";

// Simple ID generator for ProductVariant
function generateId(): string {
  return `pv_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
}

// WebSocket configuration for Neon
neonConfig.webSocketConstructor = ws;

const connectionString = process.env.DATABASE_URL;

if (!connectionString) {
  throw new Error("DATABASE_URL is not defined");
}

const adapter = new PrismaNeon({ connectionString });

const prisma = new PrismaClient({ adapter });

async function main() {
  console.log("🌱 Starting seed...");

  // 1. Admin (upsert to avoid duplicates)
  await prisma.admin.upsert({
    where: { email: "admin@loscalo.it" },
    update: {},
    create: {
      email: "admin@loscalo.it",
      name: "Admin",
      receiveNotifications: true,
      canManageAdmins: true,
    },
  });
  console.log("✅ Admin ready");

  // 2. Gift Card Templates (only if empty)
  const giftCardCount = await prisma.giftCardTemplate.count();
  if (giftCardCount === 0) {
    await prisma.giftCardTemplate.createMany({
      data: [
        { value: 50, price: 50, isActive: true },
        { value: 100, price: 100, isActive: true },
        { value: 200, price: 200, isActive: true },
      ],
    });
    console.log("✅ GiftCardTemplates created");
  } else {
    console.log("✅ GiftCardTemplates already exist, skipping");
  }

  // 3. Menu Categories (only if empty)
  const categoryCount = await prisma.category.count();
  if (categoryCount === 0) {
    const summerCategory = await prisma.category.create({
      data: {
        nameIt: "Summer 2024",
        nameEn: "Summer 2024",
        macroCategoryIt: "Cocktail",
        macroCategoryEn: "Cocktails",
        showAlcoholLevel: true,
        order: 1,
        isActive: true,
      },
    });

    const classicsCategory = await prisma.category.create({
      data: {
        nameIt: "I Classici",
        nameEn: "Classics",
        macroCategoryIt: "Cocktail",
        macroCategoryEn: "Cocktails",
        showAlcoholLevel: true,
        order: 2,
        isActive: true,
      },
    });

    const noAlcoholCategory = await prisma.category.create({
      data: {
        nameIt: "Analcolici",
        nameEn: "Non-Alcoholic",
        macroCategoryIt: "Bevande",
        macroCategoryEn: "Drinks",
        showAlcoholLevel: false,
        order: 3,
        isActive: true,
      },
    });

    const beerCategory = await prisma.category.create({
      data: {
        nameIt: "Birre",
        nameEn: "Beers",
        macroCategoryIt: "Birre",
        macroCategoryEn: "Beers",
        showAlcoholLevel: true,
        order: 4,
        isActive: true,
      },
    });

    // 4. Cocktails
    await prisma.cocktail.createMany({
      data: [
        {
          nameIt: "Negroni Affinato",
          nameEn: "Aged Negroni",
          ingredientsIt:
            "Invecchiato in botti di rovere ex Nebbiolo da settembre 2023 ad aprile 2024. Gin, Vermouth dolce, Amari, Brandy e Barolo Chinato.",
          ingredientsEn:
            "Aged in ex-Nebbiolo oak barrels from September 2023 to April 2024. Gin, Sweet Vermouth, Bitters, Brandy and Barolo Chinato.",
          price: 10.5,
          alcoholLevel: 4,
          order: 1,
          isActive: true,
          categoryId: summerCategory.id,
        },
        {
          nameIt: "Barbarossa",
          nameEn: "Barbarossa",
          ingredientsIt:
            "Dolci sfumature di ciliegia e barbabietola in questo highball con Tequila e Mezcal. Fresco, citrico, dolce e leggermente affumicato.",
          ingredientsEn:
            "Sweet notes of cherry and beetroot in this highball with Tequila and Mezcal. Fresh, citrusy, sweet and slightly smoky.",
          price: 10.0,
          alcoholLevel: 3,
          order: 2,
          isActive: true,
          categoryId: summerCategory.id,
        },
        {
          nameIt: "Caper Club",
          nameEn: "Caper Club",
          ingredientsIt:
            "Gin, sciroppo di capperi, lime e soda. Rinfrescante e salato.",
          ingredientsEn:
            "Gin, caper syrup, lime and soda. Refreshing and salty.",
          price: 9.5,
          alcoholLevel: 2,
          order: 3,
          isActive: true,
          categoryId: summerCategory.id,
        },
        {
          nameIt: "Margarita",
          nameEn: "Margarita",
          ingredientsIt:
            "Tequila, Triple Sec, succo di lime fresco. Il classico tex-mex.",
          ingredientsEn:
            "Tequila, Triple Sec, fresh lime juice. The classic tex-mex.",
          price: 8.5,
          alcoholLevel: 3,
          order: 1,
          isActive: true,
          categoryId: classicsCategory.id,
        },
        {
          nameIt: "Negroni",
          nameEn: "Negroni",
          ingredientsIt:
            "Gin, Campari, Vermouth rosso. L'aperitivo italiano per eccellenza.",
          ingredientsEn:
            "Gin, Campari, Red Vermouth. The Italian aperitif par excellence.",
          price: 8.0,
          alcoholLevel: 3,
          order: 2,
          isActive: true,
          categoryId: classicsCategory.id,
        },
        {
          nameIt: "Limonata Artigianale",
          nameEn: "Craft Lemonade",
          ingredientsIt:
            "Limoni freschi, zucchero di canna, acqua frizzante. Senza alcol.",
          ingredientsEn:
            "Fresh lemons, cane sugar, sparkling water. Alcohol-free.",
          price: 5.0,
          alcoholLevel: 0,
          order: 1,
          isActive: true,
          categoryId: noAlcoholCategory.id,
        },
        {
          nameIt: "Tonic Premium",
          nameEn: "Premium Tonic",
          ingredientsIt:
            "Acqua tonica artigianale con aromi naturali. Senza alcol.",
          ingredientsEn:
            "Craft tonic water with natural flavors. Alcohol-free.",
          price: 4.5,
          alcoholLevel: 0,
          order: 2,
          isActive: true,
          categoryId: noAlcoholCategory.id,
        },
      ],
    });
    console.log("✅ Categories and Cocktails created");
  } else {
    console.log("✅ Categories already exist, skipping");
  }

  // 5. Shop Products (only if empty)
  const productCount = await prisma.product.count();
  if (productCount === 0) {
    await prisma.product.create({
      data: {
        name: 'Maglietta "Lo Scalo"',
        nameEn: '"Lo Scalo" T-Shirt',
        descriptionIt: "Maglietta 100% cotone organico con stampa serigrafica.",
        descriptionEn: "100% organic cotton t-shirt with screen printing.",
        price: 25.0,
        image: "/products/tshirt.png",
        hasSizes: true,
        isActive: true,
        ProductVariant: {
          create: [
            { id: generateId(), size: "S", quantity: 5, updatedAt: new Date() },
            { id: generateId(), size: "M", quantity: 8, updatedAt: new Date() },
            { id: generateId(), size: "L", quantity: 10, updatedAt: new Date() },
            { id: generateId(), size: "XL", quantity: 6, updatedAt: new Date() },
            { id: generateId(), size: "XXL", quantity: 3, updatedAt: new Date() },
          ],
        },
      },
    });

    await prisma.product.create({
      data: {
        name: "Tote Bag",
        nameEn: "Tote Bag",
        descriptionIt: "Borsa in canvas con stampa Lo Scalo.",
        descriptionEn: "Canvas bag with Lo Scalo print.",
        price: 15.0,
        image: "/products/totebag.png",
        hasSizes: false,
        isActive: true,
        ProductVariant: {
          create: [{ id: generateId(), size: "Unica", quantity: 20, updatedAt: new Date() }],
        },
      },
    });

    await prisma.product.create({
      data: {
        name: "Bicchiere Logo",
        nameEn: "Logo Glass",
        descriptionIt: "Bicchiere da cocktail con logo inciso.",
        descriptionEn: "Cocktail glass with engraved logo.",
        price: 12.0,
        image: "/products/glass.png",
        hasSizes: false,
        isActive: true,
        ProductVariant: {
          create: [{ id: generateId(), size: "Unica", quantity: 15, updatedAt: new Date() }],
        },
      },
    });
    console.log("✅ Products created");
  } else {
    console.log("✅ Products already exist, skipping");
  }

  console.log("\n🎉 Seed completed successfully!");
  console.log("\nLogin credentials:");
  console.log("  Email: admin@loscalo.it");
}

main()
  .catch((e) => {
    console.error("❌ Seed failed:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
