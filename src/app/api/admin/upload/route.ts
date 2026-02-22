import { NextResponse } from "next/server"
import sharp from "sharp"

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

    // Leggi buffer
    const bytes = await file.arrayBuffer()
    const buffer = Buffer.from(bytes)
    console.log(`Buffer size: ${buffer.length} bytes`)

    // Processa con sharp e converti in base64
    try {
      const processedBuffer = await sharp(buffer, {
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
        .toBuffer()
      
      // Converti in base64
      const base64String = processedBuffer.toString('base64')
      const dataUrl = `data:image/jpeg;base64,${base64String}`
      
      console.log(`Image processed, base64 length: ${dataUrl.length} chars`)

      return NextResponse.json({ 
        success: true, 
        path: dataUrl,
        base64: dataUrl
      })
    } catch (sharpError) {
      console.error("Sharp processing error:", sharpError)
      return NextResponse.json({ 
        error: "Errore nel processamento immagine" 
      }, { status: 500 })
    }
  } catch (error) {
    console.error("Upload error:", error)
    return NextResponse.json({ 
      error: "Upload fallito: " + (error instanceof Error ? error.message : "Unknown error") 
    }, { status: 500 })
  }
}
