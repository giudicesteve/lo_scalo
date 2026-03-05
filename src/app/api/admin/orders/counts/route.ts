import { NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { checkAdmin } from "@/lib/api-auth"

export const dynamic = 'force-dynamic'

export async function GET() {
  const authCheck = await checkAdmin();
  if ("error" in authCheck) {
    return NextResponse.json({ error: authCheck.error }, { status: authCheck.status });
  }

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
      // Archiviati (escludi CANCELLED che hanno tab dedicata)
      prisma.order.count({
        where: { 
          isArchived: true,
          status: { not: "CANCELLED" },
        },
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
