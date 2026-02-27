import { NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"

export const revalidate = 0

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

    return NextResponse.json(categories, {
      headers: {
        'Cache-Control': 'no-store, max-age=0',
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
