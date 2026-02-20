import { NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"

export async function GET() {
  try {
    const templates = await prisma.giftCardTemplate.findMany({
      where: { isActive: true },
      orderBy: { value: "asc" },
    })

    return NextResponse.json(templates)
  } catch (error) {
    console.error("Error fetching gift card templates:", error)
    return NextResponse.json(
      { error: "Failed to fetch gift card templates" },
      { status: 500 }
    )
  }
}
