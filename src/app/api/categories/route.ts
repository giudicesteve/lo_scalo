import { NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { centsToEuro } from "@/lib/utils/currency"

// Cache per 5 minuti con stale-while-revalidate
// Il menu cambia raramente, ma vogliamo aggiornamenti senza redeploy
export const revalidate = 300

export async function GET() {
  // Check if DATABASE_URL is available
  const databaseUrl = process.env.DATABASE_URL?.replace(/^["']|["']$/g, '')
  
  if (!databaseUrl) {
    console.error('[API Categories] DATABASE_URL not set')
    return NextResponse.json([])
  }

  try {
    const categories = await prisma.category.findMany({
      where: { isActive: true },
      orderBy: { order: "asc" },
      include: {
        cocktails: {
          where: { isActive: true },
          orderBy: { order: "asc" },
        },
      },
    })

    // Convert cents to euro for cocktail prices
    const categoriesWithEuroPrices = categories.map((category) => ({
      ...category,
      cocktails: category.cocktails.map((cocktail) => ({
        ...cocktail,
        price: centsToEuro(cocktail.price),
      })),
    }))

    return NextResponse.json(categoriesWithEuroPrices, {
      headers: {
        // Cache 5 minuti, stale-while-revalidate 1 ora
        // Risposta immediata, aggiornamento in background
        'Cache-Control': 'public, s-maxage=300, stale-while-revalidate=3600',
      },
    })
  } catch (error) {
    console.error("Error fetching categories:", error)
    // Return empty array instead of error object to prevent client-side errors
    return NextResponse.json([], {
      status: 200,
      headers: {
        'Cache-Control': 'no-store, max-age=0',
      },
    })
  }
}
