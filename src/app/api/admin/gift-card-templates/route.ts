import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { euroToCents, centsToEuro } from "@/lib/utils/currency";

// GET - Lista tutti i template
export async function GET() {
  try {
    const templates = await prisma.giftCardTemplate.findMany({
      orderBy: { value: "asc" },
    });
    
    // Convert value and price from cents to euro for frontend
    const transformedTemplates = templates.map((template) => ({
      ...template,
      value: centsToEuro(template.value),
      price: centsToEuro(template.price),
    }));
    
    return NextResponse.json(transformedTemplates);
  } catch {
    return NextResponse.json(
      { error: "Failed to fetch templates" },
      { status: 500 }
    );
  }
}

// POST - Crea nuovo template
export async function POST(req: Request) {
  try {
    const body = await req.json();
    const template = await prisma.giftCardTemplate.create({
      data: {
        value: euroToCents(body.value), // Convert euro to cents for database
        price: euroToCents(body.price || body.value), // Convert euro to cents for database
        isActive: body.isActive ?? true,
      },
    });
    
    // Convert value and price back to euro for response
    return NextResponse.json({
      ...template,
      value: centsToEuro(template.value),
      price: centsToEuro(template.price),
    });
  } catch {
    return NextResponse.json(
      { error: "Failed to create template" },
      { status: 500 }
    );
  }
}

// PUT - Aggiorna template
export async function PUT(req: Request) {
  try {
    const body = await req.json();
    const data: { value?: number; price?: number; isActive?: boolean } = {};

    if (body.value !== undefined) data.value = euroToCents(body.value); // Convert euro to cents for database
    if (body.price !== undefined) data.price = euroToCents(body.price); // Convert euro to cents for database
    if (body.isActive !== undefined) data.isActive = body.isActive;

    const template = await prisma.giftCardTemplate.update({
      where: { id: body.id },
      data,
    });
    
    // Convert value and price back to euro for response
    return NextResponse.json({
      ...template,
      value: centsToEuro(template.value),
      price: centsToEuro(template.price),
    });
  } catch {
    return NextResponse.json(
      { error: "Failed to update template" },
      { status: 500 }
    );
  }
}

// DELETE - Elimina template
export async function DELETE(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const id = searchParams.get("id");
    if (!id) {
      return NextResponse.json({ error: "ID required" }, { status: 400 });
    }

    await prisma.giftCardTemplate.delete({ where: { id } });
    return NextResponse.json({ success: true });
  } catch {
    return NextResponse.json(
      { error: "Failed to delete template" },
      { status: 500 }
    );
  }
}
