import { NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { centsToEuro } from "@/lib/utils/currency";

export async function GET() {
  // During build time, database might not be available
  if (!process.env.DATABASE_URL) {
    return NextResponse.json([])
  }

  try {
    const templates = await prisma.giftCardTemplate.findMany({
      where: { isActive: true },
      orderBy: { value: "asc" },
    })

    // Convert value and price from cents to euro for frontend
    const transformedTemplates = templates.map((template) => ({
      ...template,
      value: centsToEuro(template.value),
      price: centsToEuro(template.price),
    }));

    return NextResponse.json(transformedTemplates)
  } catch (error) {
    console.error("Error fetching gift card templates:", error)
    return NextResponse.json([])
  }
}
