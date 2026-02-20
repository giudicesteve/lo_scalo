import { NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"

// GET - Lista tutti i prodotti
export async function GET() {
  try {
    const products = await prisma.product.findMany({
      orderBy: { createdAt: "desc" },
      include: { variants: true },
    })
    return NextResponse.json(products)
  } catch {
    return NextResponse.json({ error: "Failed to fetch products" }, { status: 500 })
  }
}

// POST - Crea nuovo prodotto
export async function POST(req: Request) {
  try {
    const body = await req.json()
    
    // Se il prodotto non ha taglie, aggiungi una variante "Unica" di default
    const variants = body.hasSizes 
      ? (body.variants || [])
      : [{ size: "Unica", quantity: body.stock || 0 }]
    
    const product = await prisma.product.create({
      data: {
        name: body.name,
        descriptionIt: body.descriptionIt,
        descriptionEn: body.descriptionEn,
        price: body.price,
        image: body.image || "/resources/Maglietta lo scalo.jpg",
        hasSizes: body.hasSizes ?? true,
        variants: {
          create: variants,
        },
      },
      include: { variants: true },
    })
    return NextResponse.json(product)
  } catch {
    return NextResponse.json({ error: "Failed to create product" }, { status: 500 })
  }
}

// PUT - Aggiorna prodotto
export async function PUT(req: Request) {
  try {
    const body = await req.json()
    
    // Aggiorna il prodotto base
    const data: Record<string, unknown> = {
      name: body.name,
      descriptionIt: body.descriptionIt,
      descriptionEn: body.descriptionEn,
      price: body.price,
      image: body.image,
      isActive: body.isActive,
    }
    
    // Aggiungi hasSizes solo se esplicitamente fornito
    if (body.hasSizes !== undefined) {
      data.hasSizes = body.hasSizes
    }
    
    const product = await prisma.product.update({
      where: { id: body.id },
      data,
    })

    // Gestione cambio tipo prodotto (con taglie <-> senza taglie)
    if (body.hasSizesChanged === true) {
      if (body.hasSizes === false) {
        // Da "con taglie" a "senza taglie"
        // 1. Elimina tutte le varianti esistenti
        await prisma.productVariant.deleteMany({
          where: { productId: body.id },
        })
        // 2. Crea variante "Unica" con la quantità specificata
        await prisma.productVariant.create({
          data: {
            productId: body.id,
            size: "Unica",
            quantity: body.stock || 0,
          },
        })
      } else {
        // Da "senza taglie" a "con taglie"
        // 1. Elimina la variante "Unica"
        await prisma.productVariant.deleteMany({
          where: { productId: body.id, size: "Unica" },
        })
        // 2. Crea le nuove varianti con taglie
        if (body.variants && body.variants.length > 0) {
          for (const variant of body.variants) {
            await prisma.productVariant.create({
              data: {
                productId: body.id,
                size: variant.size,
                quantity: variant.quantity,
              },
            })
          }
        }
      }
    } else {
      // Nessun cambio di tipo - aggiorna normalmente
      
      // Aggiorna le varianti (per prodotti con taglie)
      if (body.variants) {
        for (const variant of body.variants) {
          await prisma.productVariant.upsert({
            where: { id: variant.id || "new" },
            update: { quantity: variant.quantity },
            create: {
              productId: body.id,
              size: variant.size,
              quantity: variant.quantity,
            },
          })
        }
      }

      // Aggiorna stock per prodotti SENZA taglie
      if (body.hasSizes === false && body.stock !== undefined) {
        // Trova la variante "Unica" del prodotto
        const existingVariant = await prisma.productVariant.findFirst({
          where: { productId: body.id, size: "Unica" },
        })

        if (existingVariant) {
          // Aggiorna la quantità della variante esistente
          await prisma.productVariant.update({
            where: { id: existingVariant.id },
            data: { quantity: body.stock },
          })
        } else {
          // Crea una nuova variante "Unica"
          await prisma.productVariant.create({
            data: {
              productId: body.id,
              size: "Unica",
              quantity: body.stock,
            },
          })
        }
      }
    }

    return NextResponse.json(product)
  } catch (error) {
    console.error("Error updating product:", error)
    return NextResponse.json({ error: "Failed to update product" }, { status: 500 })
  }
}

// DELETE - Elimina prodotto
export async function DELETE(req: Request) {
  try {
    const { searchParams } = new URL(req.url)
    const id = searchParams.get("id")
    if (!id) {
      return NextResponse.json({ error: "ID required" }, { status: 400 })
    }

    await prisma.product.delete({ where: { id } })
    return NextResponse.json({ success: true })
  } catch {
    return NextResponse.json({ error: "Failed to delete product" }, { status: 500 })
  }
}
