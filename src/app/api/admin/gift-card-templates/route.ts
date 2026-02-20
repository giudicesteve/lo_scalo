import { NextResponse } from "next/server"


import { prisma } from "@/lib/prisma"

// GET - Lista tutti i template
export async function GET() {
  
  try {
    const templates = await prisma.giftCardTemplate.findMany({
      orderBy: { value: "asc" },
    })
    return NextResponse.json(templates)
  } catch {
    return NextResponse.json({ error: "Failed to fetch templates" }, { status: 500 })
  }
}

// POST - Crea nuovo template
export async function POST(req: Request) {
  
  try {
    const body = await req.json()
    const template = await prisma.giftCardTemplate.create({
      data: {
        value: body.value,
        price: body.price,
      },
    })
    return NextResponse.json(template)
  } catch {
    return NextResponse.json({ error: "Failed to create template" }, { status: 500 })
  }
}

// PUT - Aggiorna template
export async function PUT(req: Request) {
  
  try {
    const body = await req.json()
    const template = await prisma.giftCardTemplate.update({
      where: { id: body.id },
      data: {
        value: body.value,
        price: body.price,
        isActive: body.isActive,
      },
    })
    return NextResponse.json(template)
  } catch {
    return NextResponse.json({ error: "Failed to update template" }, { status: 500 })
  }
}

// DELETE - Elimina template
export async function DELETE(req: Request) {
  
  try {
    const { searchParams } = new URL(req.url)
    const id = searchParams.get("id")
    if (!id) {
      return NextResponse.json({ error: "ID required" }, { status: 400 })
    }

    await prisma.giftCardTemplate.delete({ where: { id } })
    return NextResponse.json({ success: true })
  } catch {
    return NextResponse.json({ error: "Failed to delete template" }, { status: 500 })
  }
}

