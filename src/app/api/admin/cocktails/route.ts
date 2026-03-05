import { NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { euroToCents, centsToEuro } from "@/lib/utils/currency"
import { checkAdmin } from "@/lib/api-auth"

// Force dynamic - uses auth()
export const dynamic = 'force-dynamic'

// GET - Lista cocktail
export async function GET() {
  try {
    const authCheck = await checkAdmin();
    if ("error" in authCheck) {
      return NextResponse.json({ error: authCheck.error }, { status: authCheck.status });
    }

    const cocktails = await prisma.cocktail.findMany({
      orderBy: { order: "asc" },
    });
    
    // Convert price from cents to euro for frontend
    const transformedCocktails = cocktails.map((cocktail) => ({
      ...cocktail,
      price: centsToEuro(cocktail.price),
    }));
    
    return NextResponse.json(transformedCocktails);
  } catch {
    return NextResponse.json({ error: "Failed to fetch cocktails" }, { status: 500 })
  }
}

// POST - Crea nuovo cocktail
export async function POST(req: Request) {
  try {
    const authCheck = await checkAdmin();
    if ("error" in authCheck) {
      return NextResponse.json({ error: authCheck.error }, { status: authCheck.status });
    }

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
    // Scala 0-10 (interi), visualizzati come 5 punti con mezzi
    if (body.alcoholLevel !== undefined && body.alcoholLevel !== null) {
      const level = Math.floor(body.alcoholLevel)
      if (level < 0 || level > 10) {
        return NextResponse.json({ error: "Il livello alcolico deve essere tra 0 e 10" }, { status: 400 })
      }
    }
    
    const cocktail = await prisma.cocktail.create({
      data: {
        nameIt: body.nameIt.trim(),
        nameEn: body.nameEn.trim(),
        ingredientsIt: body.ingredientsIt?.trim() || null,
        ingredientsEn: body.ingredientsEn?.trim() || null,
        descriptionIt: body.descriptionIt?.trim() || null,
        descriptionEn: body.descriptionEn?.trim() || null,
        price: euroToCents(body.price), // Convert euro to cents for database
        alcoholLevel: body.alcoholLevel !== undefined && body.alcoholLevel !== null ? Math.floor(body.alcoholLevel) : null,
        categoryId: body.categoryId,
        order: body.order || 0,
      },
    })
    
    // Convert price back to euro for response
    return NextResponse.json({
      ...cocktail,
      price: centsToEuro(cocktail.price),
    })
  } catch {
    return NextResponse.json({ error: "Failed to create cocktail" }, { status: 500 })
  }
}

// PUT - Aggiorna cocktail
export async function PUT(req: Request) {
  try {
    const authCheck = await checkAdmin();
    if ("error" in authCheck) {
      return NextResponse.json({ error: authCheck.error }, { status: authCheck.status });
    }

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
    
    // Validazione alcoholLevel per aggiornamento (scala 0-10 interi)
    if (body.alcoholLevel !== undefined && body.alcoholLevel !== null) {
      const level = Math.floor(body.alcoholLevel)
      if (level < 0 || level > 10) {
        return NextResponse.json({ error: "Il livello alcolico deve essere tra 0 e 10" }, { status: 400 })
      }
    }
    
    const data: { 
      nameIt?: string; 
      nameEn?: string; 
      ingredientsIt?: string | null; 
      ingredientsEn?: string | null; 
      descriptionIt?: string | null; 
      descriptionEn?: string | null; 
      price?: number; 
      alcoholLevel?: number | null; 
      categoryId?: string; 
      order?: number; 
      isActive?: boolean;
    } = {};
    
    if (body.nameIt !== undefined) data.nameIt = body.nameIt.trim();
    if (body.nameEn !== undefined) data.nameEn = body.nameEn.trim();
    if (body.ingredientsIt !== undefined) data.ingredientsIt = body.ingredientsIt?.trim() || null;
    if (body.ingredientsEn !== undefined) data.ingredientsEn = body.ingredientsEn?.trim() || null;
    if (body.descriptionIt !== undefined) data.descriptionIt = body.descriptionIt?.trim() || null;
    if (body.descriptionEn !== undefined) data.descriptionEn = body.descriptionEn?.trim() || null;
    if (body.price !== undefined) data.price = euroToCents(body.price); // Convert euro to cents for database
    if (body.alcoholLevel !== undefined) data.alcoholLevel = body.alcoholLevel !== null ? Math.floor(body.alcoholLevel) : null;
    if (body.categoryId !== undefined) data.categoryId = body.categoryId;
    if (body.order !== undefined) data.order = body.order;
    if (body.isActive !== undefined) data.isActive = body.isActive;
    
    const cocktail = await prisma.cocktail.update({
      where: { id: body.id },
      data,
    })
    
    // Convert price back to euro for response
    return NextResponse.json({
      ...cocktail,
      price: centsToEuro(cocktail.price),
    })
  } catch {
    return NextResponse.json({ error: "Failed to update cocktail" }, { status: 500 })
  }
}

// DELETE - Elimina cocktail
export async function DELETE(req: Request) {
  try {
    const authCheck = await checkAdmin();
    if ("error" in authCheck) {
      return NextResponse.json({ error: authCheck.error }, { status: authCheck.status });
    }

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
