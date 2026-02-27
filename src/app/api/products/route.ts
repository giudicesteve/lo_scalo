import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export const revalidate = 0;

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

    // Transform to match expected frontend format
    const transformedProducts = products.map((product) => ({
      ...product,
      variants: product.ProductVariant,
    }));

    return NextResponse.json(transformedProducts, {
      headers: {
        "Cache-Control": "no-store, max-age=0",
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
