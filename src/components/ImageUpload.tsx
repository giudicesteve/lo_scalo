"use client"

import { useState, useRef } from "react"
import Image from "next/image"
import { Upload, X, Loader2 } from "lucide-react"

interface ImageUploadProps {
  value: string
  onChange: (path: string) => void
}

export function ImageUpload({ value, onChange }: ImageUploadProps) {
  const [preview, setPreview] = useState<string | null>(value || null)
  const [uploading, setUploading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const inputRef = useRef<HTMLInputElement>(null)

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    console.log("Selected file:", file.name, file.type, file.size)

    // Validazione client-side
    const allowedTypes = ["image/jpeg", "image/jpg", "image/png", "image/webp", "image/gif", "image/avif"]
    if (!allowedTypes.includes(file.type.toLowerCase())) {
      setError(`Formato non supportato: ${file.type}. Usa: JPG, PNG, WEBP`)
      return
    }

    // Preview locale
    const reader = new FileReader()
    reader.onload = (event) => {
      setPreview(event.target?.result as string)
    }
    reader.readAsDataURL(file)

    // Upload
    setUploading(true)
    setError(null)

    try {
      const formData = new FormData()
      formData.append("file", file)

      console.log("Uploading...")
      const res = await fetch("/api/admin/upload", {
        method: "POST",
        body: formData,
      })

      const data = await res.json()
      console.log("Response:", data)

      if (!res.ok) {
        throw new Error(data.error || "Upload failed")
      }

      // Salva path pulito nel database (senza cache params)
      onChange(data.path)
      console.log("Saved path:", data.path)
    } catch (err) {
      console.error("Upload error:", err)
      setError(err instanceof Error ? err.message : "Upload failed")
      setPreview(null)
    } finally {
      setUploading(false)
    }
  }

  const handleClear = () => {
    setPreview(null)
    onChange("")
    if (inputRef.current) {
      inputRef.current.value = ""
    }
  }

  return (
    <div className="space-y-2">
      <label className="block text-label-md text-brand-gray mb-2">
        Immagine prodotto
      </label>
      
      {preview ? (
        <div className="relative w-48 h-48 rounded-2xl overflow-hidden border-2 border-brand-light-gray">
          <Image
            src={preview}
            alt="Preview"
            width={192}
            height={192}
            className="w-full h-full object-cover"
            unoptimized
          />
          <button
            onClick={handleClear}
            className="absolute top-2 right-2 p-1.5 bg-brand-dark/80 text-white rounded-full hover:bg-brand-dark transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
          {uploading && (
            <div className="absolute inset-0 bg-black/50 flex items-center justify-center">
              <Loader2 className="w-8 h-8 text-white animate-spin" />
            </div>
          )}
        </div>
      ) : (
        <button
          onClick={() => inputRef.current?.click()}
          disabled={uploading}
          className="w-48 h-48 rounded-2xl border-2 border-dashed border-brand-light-gray hover:border-brand-primary hover:bg-brand-primary/5 transition-all flex flex-col items-center justify-center gap-2 disabled:opacity-50"
        >
          {uploading ? (
            <>
              <Loader2 className="w-8 h-8 text-brand-primary animate-spin" />
              <span className="text-label-md text-brand-gray">Caricamento...</span>
            </>
          ) : (
            <>
              <Upload className="w-8 h-8 text-brand-gray" />
              <span className="text-label-md text-brand-gray">Carica immagine</span>
              <span className="text-label-sm text-brand-gray/60">Max 5MB</span>
            </>
          )}
        </button>
      )}

      {error && (
        <p className="text-label-sm text-red-500">{error}</p>
      )}

      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        onChange={handleFileSelect}
        className="hidden"
      />
    </div>
  )
}
