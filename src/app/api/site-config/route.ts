import { NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { auth } from "@/auth"

export const dynamic = 'force-dynamic'

// GET /api/site-config - Legge tutte le configurazioni (pubblico)
export async function GET() {
  try {
    const configs = await prisma.siteConfig.findMany()
    
    const configMap = configs.reduce((acc, config) => {
      acc[config.key] = config.value
      return acc
    }, {} as Record<string, string>)
    
    return NextResponse.json(configMap)
  } catch (error) {
    console.error("Error fetching site config:", error)
    return NextResponse.json(
      { error: "Failed to fetch site config" },
      { status: 500 }
    )
  }
}

// PUT /api/site-config - Aggiorna configurazioni (solo admin)
export async function PUT(req: Request) {
  try {
    const session = await auth()
    if (!session?.user?.email) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const admin = await prisma.admin.findUnique({
      where: { email: session.user.email },
    })

    if (!admin || !admin.canManageAdmins) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 })
    }

    const body = await req.json()
    const { key, value } = body

    if (!key || typeof value !== "string") {
      return NextResponse.json(
        { error: "Invalid input" },
        { status: 400 }
      )
    }

    // Upsert: crea se non esiste, aggiorna se esiste
    const config = await prisma.siteConfig.upsert({
      where: { key },
      update: { value, updatedAt: new Date() },
      create: { key, value },
    })

    return NextResponse.json(config)
  } catch (error) {
    console.error("Error updating site config:", error)
    return NextResponse.json(
      { error: "Failed to update site config" },
      { status: 500 }
    )
  }
}
