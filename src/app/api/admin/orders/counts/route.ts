import { NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"

export async function GET() {
  try {
    // Esegui tutte le count in parallelo
    const [active, archived, cancelled] = await Promise.all([
      // Attivi: non archiviati e non CANCELLED
      prisma.order.count({
        where: {
          isArchived: false,
          status: { not: "CANCELLED" },
        },
      }),
      // Archiviati
      prisma.order.count({
        where: { isArchived: true },
      }),
      // Annullati
      prisma.order.count({
        where: { status: "CANCELLED" },
      }),
    ])

    return NextResponse.json({
      active,
      archived,
      cancelled,
    })
  } catch (error) {
    console.error("Error fetching order counts:", error)
    return NextResponse.json(
      { error: "Failed to fetch counts" },
      { status: 500 }
    )
  }
}
