import { NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"

// Forza dynamic rendering per evitare problemi con request.url durante la build
export const dynamic = 'force-dynamic'

// GET - Recupera configurazioni
export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url)
    const key = searchParams.get("key")

    // Se viene passato un key, ritorna solo quella configurazione
    if (key) {
      const config = await prisma.siteConfig.findUnique({
        where: { key },
      })

      // Se non esiste, ritorna default values per chiavi conosciute
      if (!config) {
        const defaults: Record<string, string> = {
          MENU_ENABLED: "true",
          SHOP_ENABLED: "true",
        }
        return NextResponse.json({ key, value: defaults[key] || "" })
      }

      return NextResponse.json({ key, value: config.value })
    }

    // Altrimenti ritorna tutte le configurazioni come oggetto
    const allConfigs = await prisma.siteConfig.findMany()
    const configObject: Record<string, string> = {}
    
    // Aggiungi defaults
    configObject["MENU_ENABLED"] = "true"
    configObject["SHOP_ENABLED"] = "true"
    
    // Sovrascrivi con valori dal DB
    allConfigs.forEach((config) => {
      configObject[config.key] = config.value
    })

    return NextResponse.json(configObject)
  } catch (error) {
    console.error('[API SiteConfig] Error:', error)
    // Return defaults on error
    return NextResponse.json({
      MENU_ENABLED: "true",
      SHOP_ENABLED: "true",
    })
  }
}

// PUT - Aggiorna o crea un valore di configurazione
export async function PUT(request: Request) {
  try {
    const body = await request.json()
    const { key, value } = body

    if (!key || value === undefined) {
      return NextResponse.json(
        { error: "Key and value required" },
        { status: 400 }
      )
    }

    const config = await prisma.siteConfig.upsert({
      where: { key },
      update: { value },
      create: { key, value },
    })

    return NextResponse.json({ key: config.key, value: config.value })
  } catch (error) {
    console.error("Error updating config:", error)
    return NextResponse.json(
      { error: "Failed to update config" },
      { status: 500 }
    )
  }
}
