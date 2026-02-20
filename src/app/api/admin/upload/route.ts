import { NextResponse } from "next/server"
import { mkdir } from "fs/promises"
import sharp from "sharp"
import path from "path"

// Formati supportati
const ALLOWED_TYPES = [
  "image/jpeg",
  "image/jpg", 
  "image/png",
  "image/webp",
  "image/gif",
  "image/avif"
]

export async function POST(req: Request) {
  try {
    console.log("Upload started...")
    
    const formData = await req.formData()
    const file = formData.get("file") as File
    
    if (!file) {
      console.error("No file provided")
      return NextResponse.json({ error: "No file uploaded" }, { status: 400 })
    }

    console.log(`File received: ${file.name}, type: ${file.type}, size: ${file.size}`)

    // Validazione tipo
    if (!ALLOWED_TYPES.includes(file.type.toLowerCase())) {
      console.error(`Invalid file type: ${file.type}`)
      return NextResponse.json({ 
        error: `Formato non supportato: ${file.type}. Usa: JPG, PNG, WEBP, GIF, AVIF` 
      }, { status: 400 })
    }

    if (file.size > 5 * 1024 * 1024) {
      return NextResponse.json({ error: "File troppo grande (max 5MB)" }, { status: 400 })
    }

    // Crea cartella
    const uploadDir = path.join(process.cwd(), "public", "uploads", "products")
    await mkdir(uploadDir, { recursive: true })
    console.log(`Upload dir: ${uploadDir}`)

    // Nome file
    const timestamp = Date.now()
    const originalName = file.name.replace(/\.[^/.]+$/, "")
    const safeName = originalName.replace(/[^a-zA-Z0-9]/g, "_").substring(0, 50)
    const filename = `${timestamp}-${safeName}.jpg`
    const filepath = path.join(uploadDir, filename)
    console.log(`Saving to: ${filepath}`)

    // Leggi buffer
    const bytes = await file.arrayBuffer()
    const buffer = Buffer.from(bytes)
    console.log(`Buffer size: ${buffer.length} bytes`)

    // Processa con sharp
    try {
      await sharp(buffer, {
        // Fallback se il formato non è riconosciuto
        failOnError: false
      })
        .resize(600, 600, { 
          fit: "cover",
          position: "center",
          withoutEnlargement: false
        })
        .jpeg({ 
          quality: 85, 
          progressive: true,
          mozjpeg: true
        })
        .toFile(filepath)
      
      console.log(`File saved successfully: ${filename}`)
    } catch (sharpError) {
      console.error("Sharp processing error:", sharpError)
      return NextResponse.json({ 
        error: "Errore nel processamento immagine" 
      }, { status: 500 })
    }

    const publicPath = `/uploads/products/${filename}`
    console.log(`Public path: ${publicPath}`)

    return NextResponse.json({ 
      success: true, 
      path: publicPath,
      filename 
    })
  } catch (error) {
    console.error("Upload error:", error)
    return NextResponse.json({ 
      error: "Upload fallito: " + (error instanceof Error ? error.message : "Unknown error") 
    }, { status: 500 })
  }
}
