import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { centsToEuro } from "@/lib/utils/currency";

// Cache 1 minuto (stock può cambiare)
export const revalidate = 60;

export async function GET() {
  // During build time, database might not be available
  if (!process.env.DATABASE_URL) {
    return NextResponse.json([]);
  }

  try {
    const products = await prisma.product.findMany({
      where: { 
        isActive: true,
        isDeleted: false, // Escludi prodotti eliminati
      },
      include: {
        ProductVariant: {
          where: {
            quantity: { gt: 0 },
          },
        },
      },
    });

    // Transform to match expected frontend format and convert price from cents to euro
    const transformedProducts = products.map((product) => ({
      ...product,
      price: centsToEuro(product.price),
      variants: product.ProductVariant,
    }));

    return NextResponse.json(transformedProducts, {
      headers: {
        // Cache 1 minuto, stale-while-revalidate 5 minuti
        "Cache-Control": "public, s-maxage=60, stale-while-revalidate=300",
      },
    });
  } catch (error) {
    // During build time, database might not be available - return empty array
    if (!process.env.DATABASE_URL) {
      return NextResponse.json([]);
    }
    console.error("Error fetching products:", error);
    return NextResponse.json([]);
  }
}
