import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

// Helper to generate a unique ID for ProductVariant
function generateVariantId(): string {
  return `pv_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
}

// GET - Lista tutti i prodotti (esclusi quelli eliminati)
export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url, process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000");
    const includeDeleted = searchParams.get("includeDeleted") === "true";
    
    const products = await prisma.product.findMany({
      where: includeDeleted ? {} : { isDeleted: false },
      orderBy: { createdAt: "desc" },
      include: { ProductVariant: true },
    });

    // Transform to match expected frontend format
    const transformedProducts = products.map((product) => ({
      ...product,
      variants: product.ProductVariant,
    }));

    return NextResponse.json(transformedProducts);
  } catch (error) {
    console.error("Error fetching products:", error);
    return NextResponse.json(
      { error: "Failed to fetch products" },
      { status: 500 }
    );
  }
}

// POST - Crea nuovo prodotto
export async function POST(req: Request) {
  try {
    const body = await req.json();

    // Se il prodotto non ha taglie, aggiungi una size "Unica" di default
    const variants = body.hasSizes
      ? body.sizes || []
      : [{ size: "Unica", quantity: body.stock || 0 }];

    const product = await prisma.product.create({
      data: {
        name: body.name,
        descriptionIt: body.descriptionIt || "",
        descriptionEn: body.descriptionEn || "",
        price: body.price,
        image: body.image || "/resources/Maglietta lo scalo.jpg",
        hasSizes: body.hasSizes ?? true,
        ProductVariant: {
          create: variants.map(
            (v: { size: string; quantity?: number; stock?: number }) => ({
              id: generateVariantId(),
              size: v.size,
              quantity: v.quantity || v.stock || 0,
              updatedAt: new Date(),
            })
          ),
        },
      },
      include: { ProductVariant: true },
    });

    // Transform to match expected frontend format
    const transformedProduct = {
      ...product,
      sizes: product.ProductVariant,
    };

    return NextResponse.json(transformedProduct);
  } catch (error) {
    console.error("Error creating product:", error);
    return NextResponse.json(
      { error: "Failed to create product" },
      { status: 500 }
    );
  }
}

// PUT - Aggiorna prodotto
export async function PUT(req: Request) {
  try {
    const body = await req.json();

    // Aggiorna il prodotto base
    const data: Record<string, unknown> = {
      name: body.name,
      descriptionIt: body.descriptionIt || "",
      descriptionEn: body.descriptionEn || "",
      price: body.price,
      image: body.image,
      isActive: body.isActive,
    };

    // Aggiungi hasSizes solo se esplicitamente fornito
    if (body.hasSizes !== undefined) {
      data.hasSizes = body.hasSizes;
    }

    const product = await prisma.product.update({
      where: { id: body.id },
      data,
    });

    // Gestione cambio tipo prodotto (con taglie <-> senza taglie)
    if (body.hasSizesChanged === true) {
      if (body.hasSizes === false) {
        // Da "con taglie" a "senza taglie"
        // 1. Elimina tutte le taglie esistenti
        await prisma.productVariant.deleteMany({
          where: { productId: body.id },
        });
        // 2. Crea taglia "Unica" con la quantità specificata
        await prisma.productVariant.create({
          data: {
            id: generateVariantId(),
            productId: body.id,
            size: "Unica",
            quantity: body.stock || 0,
            updatedAt: new Date(),
          },
        });
      } else {
        // Da "senza taglie" a "con taglie"
        // 1. Elimina la taglia "Unica"
        await prisma.productVariant.deleteMany({
          where: { productId: body.id, size: "Unica" },
        });
        // 2. Crea le nuove taglie
        if (body.sizes && body.sizes.length > 0) {
          for (const size of body.sizes) {
            await prisma.productVariant.create({
              data: {
                id: generateVariantId(),
                productId: body.id,
                size: size.size,
                quantity: size.stock || 0,
                updatedAt: new Date(),
              },
            });
          }
        }
      }
    } else {
      // Nessun cambio di tipo - aggiorna normalmente

      // Aggiorna le taglie (per prodotti con taglie)
      if (body.sizes) {
        for (const size of body.sizes) {
          await prisma.productVariant.upsert({
            where: { id: size.id || "new" },
            update: { quantity: size.stock || 0 },
            create: {
              id: generateVariantId(),
              productId: body.id,
              size: size.size,
              quantity: size.stock || 0,
              updatedAt: new Date(),
            },
          });
        }
      }

      // Aggiorna stock per prodotti SENZA taglie
      if (body.hasSizes === false && body.stock !== undefined) {
        // Trova la taglia "Unica" del prodotto
        const existingVariant = await prisma.productVariant.findFirst({
          where: { productId: body.id, size: "Unica" },
        });

        if (existingVariant) {
          // Aggiorna la quantità della taglia esistente
          await prisma.productVariant.update({
            where: { id: existingVariant.id },
            data: { quantity: body.stock },
          });
        } else {
          // Crea una nuova taglia "Unica"
          await prisma.productVariant.create({
            data: {
              id: generateVariantId(),
              productId: body.id,
              size: "Unica",
              quantity: body.stock,
              updatedAt: new Date(),
            },
          });
        }
      }
    }

    return NextResponse.json(product);
  } catch (error) {
    console.error("Error updating product:", error);
    return NextResponse.json(
      { error: "Failed to update product" },
      { status: 500 }
    );
  }
}

// DELETE - Soft delete prodotto
export async function DELETE(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const id = searchParams.get("id");
    if (!id) {
      return NextResponse.json({ error: "ID required" }, { status: 400 });
    }

    // Soft delete: marca come eliminato invece di rimuovere
    await prisma.product.update({
      where: { id },
      data: {
        isDeleted: true,
        deletedAt: new Date(),
        isActive: false, // Disattiva anche il prodotto
      },
    });
    return NextResponse.json({ success: true });
  } catch {
    return NextResponse.json(
      { error: "Failed to delete product" },
      { status: 500 }
    );
  }
}
