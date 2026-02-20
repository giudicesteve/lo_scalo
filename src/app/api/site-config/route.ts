import { NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"

export const dynamic = 'force-dynamic'

// GET - Leggi configurazione
export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url)
    const key = searchParams.get("key")

    // Se viene passata una chiave specifica, restituisci solo quella
    if (key) {
      const config = await prisma.siteConfig.findUnique({
        where: { key },
      })
      
      if (!config) {
        // Restituisci valori di default se non trovati
        if (key === "MENU_ENABLED") {
          return NextResponse.json({ key, value: "true" })
        }
        return NextResponse.json({ key, value: "" })
      }
      
      return NextResponse.json({ key: config.key, value: config.value })
    }

    // Altrimenti restituisci tutta la configurazione
    const configs = await prisma.siteConfig.findMany()
    
    const configMap = configs.reduce((acc, item) => {
      acc[item.key] = item.value
      return acc
    }, {} as Record<string, string>)

    return NextResponse.json({
      isClosed: configMap.bar_closed === "true",
      closedMessage: configMap.bar_closed_message || "",
      menuEnabled: configMap.MENU_ENABLED !== "false", // default true
      menuClosedMessageIt: configMap.MENU_CLOSED_MESSAGE_IT || "Il locale è chiuso per la stagione. Seguici sui social per scoprire quando riapriremo!",
      menuClosedMessageEn: configMap.MENU_CLOSED_MESSAGE_EN || "We are closed for the season. Follow us on social media to find out when we will reopen!",
    })
  } catch (error) {
    console.error("Error fetching site config:", error)
    return NextResponse.json(
      { error: "Failed to fetch site config" },
      { status: 500 }
    )
  }
}

// PUT - Aggiorna configurazione
export async function PUT(req: Request) {
  try {
    const body = await req.json()
    const { key, value } = body

    if (!key) {
      return NextResponse.json(
        { error: "Key is required" },
        { status: 400 }
      )
    }

    // Upsert: crea se non esiste, aggiorna se esiste
    const config = await prisma.siteConfig.upsert({
      where: { key },
      update: { value },
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
