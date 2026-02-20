import { NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"

export const revalidate = 0

export async function GET() {
  try {
    const products = await prisma.product.findMany({
      where: { isActive: true },
      include: {
        variants: {
          where: {
            quantity: { gt: 0 },
          },
        },
      },
    })

    return NextResponse.json(products, {
      headers: {
        'Cache-Control': 'no-store, max-age=0',
      },
    })
  } catch (error) {
    console.error("Error fetching products:", error)
    return NextResponse.json(
      { error: "Failed to fetch products" },
      { status: 500 }
    )
  }
}
