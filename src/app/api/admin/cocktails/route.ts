import { NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"

// POST - Crea nuovo cocktail
export async function POST(req: Request) {
  try {
    const body = await req.json()
    
    // Validazione: nameIt e nameEn sono obbligatori
    if (!body.nameIt?.trim()) {
      return NextResponse.json({ error: "Il nome italiano è obbligatorio" }, { status: 400 })
    }
    if (!body.nameEn?.trim()) {
      return NextResponse.json({ error: "Il nome inglese è obbligatorio" }, { status: 400 })
    }
    
    // Validazione: prezzo obbligatorio
    if (body.price === undefined || body.price === null || body.price < 0) {
      return NextResponse.json({ error: "Il prezzo è obbligatorio" }, { status: 400 })
    }
    
    // Validazione: alcoholLevel obbligatorio solo se showAlcoholLevel è true
    // (questo lo gestiamo nel frontend, ma qui verifichiamo che sia un numero valido se fornito)
    if (body.alcoholLevel !== undefined && body.alcoholLevel !== null && (body.alcoholLevel < 0 || body.alcoholLevel > 5)) {
      return NextResponse.json({ error: "Il livello alcolico deve essere tra 0 e 5" }, { status: 400 })
    }
    
    const cocktail = await prisma.cocktail.create({
      data: {
        nameIt: body.nameIt.trim(),
        nameEn: body.nameEn.trim(),
        ingredientsIt: body.ingredientsIt?.trim() || null,
        ingredientsEn: body.ingredientsEn?.trim() || null,
        descriptionIt: body.descriptionIt?.trim() || null,
        descriptionEn: body.descriptionEn?.trim() || null,
        price: body.price,
        alcoholLevel: body.alcoholLevel ?? null,
        categoryId: body.categoryId,
        order: body.order || 0,
      },
    })
    return NextResponse.json(cocktail)
  } catch {
    return NextResponse.json({ error: "Failed to create cocktail" }, { status: 500 })
  }
}

// PUT - Aggiorna cocktail
export async function PUT(req: Request) {
  try {
    const body = await req.json()
    
    // Validazione per aggiornamento
    if (body.nameIt !== undefined && !body.nameIt.trim()) {
      return NextResponse.json({ error: "Il nome italiano è obbligatorio" }, { status: 400 })
    }
    if (body.nameEn !== undefined && !body.nameEn.trim()) {
      return NextResponse.json({ error: "Il nome inglese è obbligatorio" }, { status: 400 })
    }
    if (body.price !== undefined && (body.price === null || body.price < 0)) {
      return NextResponse.json({ error: "Il prezzo è obbligatorio" }, { status: 400 })
    }
    
    const cocktail = await prisma.cocktail.update({
      where: { id: body.id },
      data: {
        nameIt: body.nameIt?.trim(),
        nameEn: body.nameEn?.trim(),
        ingredientsIt: body.ingredientsIt !== undefined ? (body.ingredientsIt?.trim() || null) : undefined,
        ingredientsEn: body.ingredientsEn !== undefined ? (body.ingredientsEn?.trim() || null) : undefined,
        descriptionIt: body.descriptionIt !== undefined ? (body.descriptionIt?.trim() || null) : undefined,
        descriptionEn: body.descriptionEn !== undefined ? (body.descriptionEn?.trim() || null) : undefined,
        price: body.price,
        alcoholLevel: body.alcoholLevel !== undefined ? (body.alcoholLevel ?? null) : undefined,
        categoryId: body.categoryId,
        order: body.order,
        isActive: body.isActive,
      },
    })
    return NextResponse.json(cocktail)
  } catch {
    return NextResponse.json({ error: "Failed to update cocktail" }, { status: 500 })
  }
}

// DELETE - Elimina cocktail
export async function DELETE(req: Request) {
  try {
    const { searchParams } = new URL(req.url)
    const id = searchParams.get("id")
    if (!id) {
      return NextResponse.json({ error: "ID required" }, { status: 400 })
    }

    await prisma.cocktail.delete({ where: { id } })
    return NextResponse.json({ success: true })
  } catch {
    return NextResponse.json({ error: "Failed to delete cocktail" }, { status: 500 })
  }
}
