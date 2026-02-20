import { PrismaClient } from "@prisma/client"

const prisma = new PrismaClient()

async function seed() {
  // Crea admin
  await prisma.admin.create({
    data: {
      email: "admin@loscalo.it",
      name: "Admin",
    },
  })
  console.log("Admin creato: admin@loscalo.it")

  // Crea template gift card
  await prisma.giftCardTemplate.createMany({
    data: [
      { value: 50, price: 50 },
      { value: 100, price: 100 },
      { value: 200, price: 200 },
    ],
  })
  console.log("Gift Card Templates create")
}

seed()
  .then(() => process.exit(0))
  .catch((e) => {
    console.error(e)
    process.exit(1)
  })
