import { NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"

// GET - Lista tutte le categorie
export async function GET() {
  try {
    const categories = await prisma.category.findMany({
      orderBy: { order: "asc" },
      include: {
        cocktails: {
          orderBy: { order: "asc" },
        },
      },
    })
    return NextResponse.json(categories)
  } catch {
    return NextResponse.json({ error: "Failed to fetch categories" }, { status: 500 })
  }
}

// POST - Crea nuova categoria
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
    
    const category = await prisma.category.create({
      data: {
        nameIt: body.nameIt.trim(),
        nameEn: body.nameEn.trim(),
        macroCategoryIt: body.macroCategoryIt?.trim() || null,
        macroCategoryEn: body.macroCategoryEn?.trim() || null,
        showAlcoholLevel: body.showAlcoholLevel ?? true,
        order: body.order || 0,
      },
    })
    return NextResponse.json(category)
  } catch {
    return NextResponse.json({ error: "Failed to create category" }, { status: 500 })
  }
}

// PUT - Aggiorna categoria
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
    
    // Costruisci l'oggetto data solo con i campi forniti
    const data: Record<string, string | number | boolean | null | undefined> = {}
    if (body.nameIt !== undefined) data.nameIt = body.nameIt.trim()
    if (body.nameEn !== undefined) data.nameEn = body.nameEn.trim()
    if (body.macroCategoryIt !== undefined) data.macroCategoryIt = body.macroCategoryIt?.trim() || null
    if (body.macroCategoryEn !== undefined) data.macroCategoryEn = body.macroCategoryEn?.trim() || null
    if (body.showAlcoholLevel !== undefined) data.showAlcoholLevel = body.showAlcoholLevel
    if (body.order !== undefined) data.order = body.order
    if (body.isActive !== undefined) data.isActive = body.isActive
    
    const category = await prisma.category.update({
      where: { id: body.id },
      data,
    })
    return NextResponse.json(category)
  } catch {
    return NextResponse.json({ error: "Failed to update category" }, { status: 500 })
  }
}

// DELETE - Elimina categoria
export async function DELETE(req: Request) {
  try {
    const { searchParams } = new URL(req.url)
    const id = searchParams.get("id")
    if (!id) {
      return NextResponse.json({ error: "ID required" }, { status: 400 })
    }

    await prisma.category.delete({ where: { id } })
    return NextResponse.json({ success: true })
  } catch {
    return NextResponse.json({ error: "Failed to delete category" }, { status: 500 })
  }
}
