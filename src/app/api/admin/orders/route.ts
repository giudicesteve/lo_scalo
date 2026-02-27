import { NextResponse } from "next/server"


import { prisma } from "@/lib/prisma"

// GET - Lista ordini (se archived non specificato, restituisce tutti)
export async function GET(req: Request) {
  
  try {
    const { searchParams } = new URL(req.url)
    const archivedParam = searchParams.get("archived")
    const status = searchParams.get("status")

    const where: { 
      isArchived?: boolean
      status?: string 
    } = {}
    
    // Se archived è specificato, filtra, altrimenti restituisci tutti
    if (archivedParam !== null) {
      where.isArchived = archivedParam === "true"
    }
    
    if (status) where.status = status

    const orders = await prisma.order.findMany({
      where,
      orderBy: { createdAt: "desc" },
      include: {
        items: {
          include: {
            product: true,
          },
        },
        giftCards: true,
      },
    })

    return NextResponse.json(orders)
  } catch {
    return NextResponse.json({ error: "Failed to fetch orders" }, { status: 500 })
  }
}

// PUT - Aggiorna ordine (status, archivia)
export async function PUT(req: Request) {
  
  try {
    const body = await req.json()
    const data: { status?: string; isArchived?: boolean } = {}
    
    if (body.status !== undefined) data.status = body.status
    if (body.isArchived !== undefined) data.isArchived = body.isArchived
    
    const order = await prisma.order.update({
      where: { id: body.id },
      data,
    })
    return NextResponse.json(order)
  } catch {
    return NextResponse.json({ error: "Failed to update order" }, { status: 500 })
  }
}

