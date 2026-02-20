import { NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"

export const revalidate = 0

export async function GET() {
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
    return NextResponse.json(
      { error: "Failed to fetch categories" },
      { status: 500 }
    )
  }
}
