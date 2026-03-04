import { NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { centsToEuro } from "@/lib/utils/currency"
import { cacheConfig, generateCacheHeaders } from "@/lib/cache-config"

// Cache controllata via headers (più flessibile di export const revalidate)
// Il valore è configurabile tramite CACHE_CATEGORIES_TTL env var

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
      headers: generateCacheHeaders(
        cacheConfig.categories.ttl,
        cacheConfig.categories.staleWhileRevalidate
      ),
    })
  } catch (error) {
    console.error("Error fetching categories:", error)
    // Return empty array instead of error object to prevent client-side errors
    return NextResponse.json([], {
      status: 200,
      headers: {
        'Cache-Control': 'no-store',
      },
    })
  }
}
