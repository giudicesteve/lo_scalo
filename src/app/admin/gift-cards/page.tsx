"use client"

import { useCallback, useEffect, useRef, useState } from "react"
import Link from "next/link"
import NextImage from "next/image"
import { QRScanner } from "@/components/QRScanner"
import { Pagination } from "@/components/pagination/Pagination"
import {
  ArrowLeft,
  Search,
  X,
  Trash2,
  History,
  RotateCcw,
  QrCode,
  CreditCard,
  AlertCircle,
  Camera,
  Receipt,
  FileSpreadsheet,
  Printer,
  Download,
} from "lucide-react"
import * as XLSX from "xlsx"
import { PDFDocument, rgb, StandardFonts } from "pdf-lib"

const ITEMS_PER_PAGE = 25
const MIN_SEARCH_LENGTH = 4
const SEARCH_DEBOUNCE_MS = 300

// Skeleton component for gift card cards
function GiftCardSkeleton() {
  return (
    <div className="w-full bg-white rounded-2xl shadow-card p-4 animate-pulse">
      {/* Header */}
      <div className="flex items-center justify-between mb-3">
        <div className="h-6 w-28 bg-brand-light-gray rounded" />
        <div className="h-5 w-16 bg-brand-light-gray rounded-full" />
      </div>
      
      {/* Customer Info */}
      <div className="space-y-2 mb-3">
        <div className="h-4 w-full bg-brand-light-gray rounded" />
        <div className="h-4 w-32 bg-brand-light-gray rounded" />
        <div className="h-4 w-40 bg-brand-light-gray rounded" />
      </div>
      
      {/* Progress Section */}
      <div className="bg-brand-cream rounded-xl p-3 space-y-2">
        <div className="flex justify-between">
          <div className="h-8 w-16 bg-brand-light-gray rounded" />
          <div className="h-5 w-12 bg-brand-light-gray rounded" />
        </div>
        <div className="h-2 w-full bg-brand-light-gray rounded-full" />
      </div>
    </div>
  )
}

// Helper to parse number with both comma and dot as decimal separator
const parseNumber = (value: string): number => {
  if (!value) return 0
  // Replace comma with dot for European decimal format, then parse
  const normalized = value.replace(',', '.')
  return parseFloat(normalized) || 0
}

interface Transaction {
  id: string
  amount: number
  type: string
  note: string | null
  receiptNumber: string | null
  receiptImage: string | null
  createdAt: string
}

interface GiftCard {
  id: string
  code: string
  initialValue: number
  remainingValue: number
  isActive: boolean
  isArchived: boolean
  isExpired: boolean
  isSoftDeleted?: boolean
  deletedAt?: string | null
  purchasedAt: string
  expiresAt: string | null
  order: {
    email: string
    orderNumber: string
    phone: string | null
  }
  transactions: Transaction[]
}

export default function AdminGiftCardsPage() {
  const [giftCards, setGiftCards] = useState<GiftCard[]>([])
  const [loading, setLoading] = useState(true)
  const [searchQuery, setSearchQuery] = useState("")
  const [debouncedSearchQuery, setDebouncedSearchQuery] = useState("")
  const [activeTab, setActiveTab] = useState<"active" | "exhausted" | "unavailable">("active")
  
  // Pagination state per tab
  const [pagination, setPagination] = useState({
    active: { page: 1, total: 0 },
    exhausted: { page: 1, total: 0 },
    unavailable: { page: 1, total: 0 },
  })
  
  // Cache per le pagine già caricate: chiave = "tab-page-search"
  const [giftCardsCache, setGiftCardsCache] = useState<Record<string, { giftCards: GiftCard[]; total: number; timestamp: number }>>({})
  const CACHE_TTL_MS = 5 * 60 * 1000 // 5 minuti di validità cache

  // Debounce per la ricerca: attende 1 secondo dopo l'ultimo carattere digitato
  useEffect(() => {
    // Se la query è vuota o ha meno di 4 caratteri, resetta subito
    if (searchQuery.length > 0 && searchQuery.length < MIN_SEARCH_LENGTH) {
      setDebouncedSearchQuery("")
      return
    }
    
    // Se ha almeno 4 caratteri, attendi 1 secondo
    if (searchQuery.length >= MIN_SEARCH_LENGTH) {
      const timer = setTimeout(() => {
        setDebouncedSearchQuery(searchQuery)
      }, SEARCH_DEBOUNCE_MS)
      
      return () => clearTimeout(timer)
    } else {
      setDebouncedSearchQuery("")
    }
  }, [searchQuery])
  
  const [selectedGiftCard, setSelectedGiftCard] = useState<GiftCard | null>(null)
  const [useAmount, setUseAmount] = useState("")
  const [useNote, setUseNote] = useState("")
  const [receiptNumber, setReceiptNumber] = useState("")
  const [receiptImage, setReceiptImage] = useState<string | null>(null)
  const [useError, setUseError] = useState<string | null>(null)
  const [useSuccess, setUseSuccess] = useState<string | null>(null)
  const [isUsing, setIsUsing] = useState(false)
  const [showScanner, setShowScanner] = useState(false)
  const [fullscreenImage, setFullscreenImage] = useState<{url: string, receiptNumber: string | null} | null>(null)
  const [deleteConfirm, setDeleteConfirm] = useState<{transactionId: string, giftCardId: string} | null>(null)

  // Fetch gift cards con paginazione server-side e caching
  // Usa ref per evitare dipendenze circolari
  const paginationRef = useRef(pagination)
  paginationRef.current = pagination
  const giftCardsCacheRef = useRef(giftCardsCache)
  giftCardsCacheRef.current = giftCardsCache
  
  const fetchGiftCards = useCallback(async (
    targetTab?: "active" | "exhausted" | "unavailable", 
    targetPage?: number,
    forceRefresh = false
  ) => {
    const tab = targetTab || activeTab
    const page = targetPage || paginationRef.current[tab].page
    const search = debouncedSearchQuery.trim()
    
    // Genera chiave cache
    const cacheKey = `${tab}-${page}-${search}`
    const cached = giftCardsCacheRef.current[cacheKey]
    const now = Date.now()
    
    // Se in cache e non scaduto e non forzato, usa cache
    if (!forceRefresh && cached && (now - cached.timestamp) < CACHE_TTL_MS) {
      setGiftCards(cached.giftCards)
      setPagination(prev => ({
        ...prev,
        [tab]: { page, total: cached.total }
      }))
      setLoading(false)
      return
    }
    
    try {
      const params = new URLSearchParams()
      params.set("tab", tab)
      params.set("page", page.toString())
      params.set("limit", ITEMS_PER_PAGE.toString())
      
      // Ricerca
      if (search) {
        params.set("search", search)
      }
      
      const res = await fetch(`/api/admin/gift-cards?${params.toString()}`)
      const data = await res.json()
      
      if (data.giftCards) {
        setGiftCards(data.giftCards)
        if (data.pagination) {
          setPagination(prev => ({
            ...prev,
            [tab]: {
              page: data.pagination.page,
              total: data.pagination.totalCount,
            }
          }))
          
          // Salva in cache
          setGiftCardsCache(prev => ({
            ...prev,
            [cacheKey]: {
              giftCards: data.giftCards,
              total: data.pagination.totalCount,
              timestamp: Date.now(),
            }
          }))
        }
      }
    } catch (error) {
      console.error("Error fetching gift cards:", error)
      setGiftCards([])
    } finally {
      setLoading(false)
    }
  }, [activeTab, debouncedSearchQuery])
  
  // Invalida cache quando si fanno azioni che modificano i dati
  const clearGiftCardsCache = useCallback((targetTab?: "active" | "exhausted" | "unavailable") => {
    if (targetTab) {
      setGiftCardsCache(prev => {
        const newCache = { ...prev }
        Object.keys(newCache).forEach(key => {
          if (key.startsWith(`${targetTab}-`)) delete newCache[key]
        })
        return newCache
      })
    } else {
      setGiftCardsCache({})
    }
  }, [])

  // Funzione per comprimere immagine e convertire in base64
  const compressImage = (file: File, maxWidth = 800, maxHeight = 800, quality = 0.7): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader()
      reader.readAsDataURL(file)
      reader.onload = (event) => {
        const img = new Image()
        img.src = event.target?.result as string
        img.onload = () => {
          const canvas = document.createElement('canvas')
          let width = img.width
          let height = img.height

          // Calcola dimensioni mantenendo aspect ratio
          if (width > height) {
            if (width > maxWidth) {
              height *= maxWidth / width
              width = maxWidth
            }
          } else {
            if (height > maxHeight) {
              width *= maxHeight / height
              height = maxHeight
            }
          }

          canvas.width = width
          canvas.height = height
          const ctx = canvas.getContext('2d')
          ctx?.drawImage(img, 0, 0, width, height)

          // Converti in base64 con compressione
          const dataUrl = canvas.toDataURL('image/jpeg', quality)
          resolve(dataUrl)
        }
        img.onerror = reject
      }
      reader.onerror = reject
    })
  }

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    // Controlla dimensione file originale (max 5MB)
    if (file.size > 5 * 1024 * 1024) {
      setUseError("Immagine troppo grande (max 5MB)")
      return
    }

    try {
      const compressed = await compressImage(file)
      setReceiptImage(compressed)
      setUseError(null)
    } catch {
      setUseError("Errore durante il caricamento dell'immagine")
    }
  }

  // Carica gift cards quando cambia tab o ricerca (debounced) - la pagina è gestita separatamente
  useEffect(() => {
    fetchGiftCards()
  }, [activeTab, debouncedSearchQuery, fetchGiftCards])

  // Ricarica quando la pagina prende focus (utente torna sulla tab) - usa cache
  useEffect(() => {
    const handleFocus = () => {
      fetchGiftCards()
    }
    window.addEventListener('focus', handleFocus)
    return () => window.removeEventListener('focus', handleFocus)
  }, [fetchGiftCards])

  const handleUseGiftCard = async () => {
    if (!selectedGiftCard || !useAmount || parseNumber(useAmount) <= 0) {
      setUseError("Inserisci un importo valido")
      return
    }

    if (!receiptNumber.trim()) {
      setUseError("Numero scontrino obbligatorio")
      return
    }
    
    // Validate Italian fiscal receipt format: 2874-3984 or 2874-10001
    const receiptRegex = /^\d{1,4}-\d{1,5}$/
    if (!receiptRegex.test(receiptNumber.trim())) {
      setUseError("Formato non valido. Usa: REGISTRO-PROGRESSIVO (es: 2874-3984 o 2874-10001)")
      return
    }

    const amount = parseNumber(useAmount)
    
    if (amount > selectedGiftCard.remainingValue) {
      setUseError(`Importo superiore al residuo (${selectedGiftCard.remainingValue.toFixed(2)}€)`)
      return
    }

    setIsUsing(true)
    setUseError(null)
    setUseSuccess(null)

    try {
      const res = await fetch("/api/admin/gift-cards/use", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          id: selectedGiftCard.id,
          amount,
          note: useNote.trim() || undefined,
          receiptNumber: receiptNumber.trim(),
          receiptImage: receiptImage,
        }),
      })

      const data = await res.json()

      if (res.ok) {
        setUseAmount("")
        setUseNote("")
        setReceiptNumber("")
        setReceiptImage(null)
        setUseSuccess(`Utilizzo registrato! Nuovo residuo: ${data.remainingValue.toFixed(2)}€`)
        // Aggiorna la gift card selezionata localmente
        setSelectedGiftCard(prev => prev ? {
          ...prev,
          remainingValue: data.remainingValue,
          transactions: [{
            id: data.transactionId || 'temp',
            amount: amount,
            type: 'USAGE',
            note: useNote.trim() || null,
            receiptNumber: receiptNumber.trim(),
            receiptImage: receiptImage,
            createdAt: new Date().toISOString()
          }, ...prev.transactions]
        } : null)
        clearGiftCardsCache() // Invalida cache dopo utilizzo
        fetchGiftCards(undefined, undefined, true)
      } else {
        setUseError(data.error || "Errore durante l'utilizzo")
      }
    } catch {
      setUseError("Errore di connessione")
    } finally {
      setIsUsing(false)
    }
  }



  const handleDeleteTransaction = (transactionId: string, giftCardId: string) => {
    setDeleteConfirm({ transactionId, giftCardId })
  }

  const confirmDelete = async () => {
    if (!deleteConfirm) return
    
    const { transactionId, giftCardId } = deleteConfirm
    
    try {
      const res = await fetch(
        `/api/admin/gift-cards/transactions/${transactionId}`,
        {
          method: "DELETE",
        }
      )

      if (res.ok) {
        // Chiudi la gift card selezionata per forzare il refresh dei dati alla riapertura
        if (selectedGiftCard?.id === giftCardId) {
          setSelectedGiftCard(null)
        }
        clearGiftCardsCache() // Invalida cache dopo eliminazione
        fetchGiftCards(undefined, undefined, true)
      } else {
        alert("Errore durante l'eliminazione")
      }
    } catch {
      alert("Errore durante l'eliminazione")
    } finally {
      setDeleteConfirm(null)
    }
  }

  // Export Excel della gift card (senza foto)
  const exportGiftCardToExcel = () => {
    if (!selectedGiftCard) return

    const rows: Record<string, string | number>[] = []
    
    // Header con dati gift card
    rows.push({
      "Tipo": "DATI GIFT CARD",
      "Codice": selectedGiftCard.code,
      "Valore Iniziale": selectedGiftCard.initialValue,
      "Residuo": selectedGiftCard.remainingValue,
      "Stato": selectedGiftCard.isArchived ? "Archiviata" : "Attiva",
      "Data Acquisto": new Date(selectedGiftCard.purchasedAt).toLocaleDateString("it-IT"),
      "Cliente": selectedGiftCard.order?.email || "",
      "Telefono": selectedGiftCard.order?.phone || "",
      "Ordine": selectedGiftCard.order?.orderNumber || "",
    })
    
    // Riga vuota
    rows.push({
      "Tipo": "",
      "Codice": "",
      "Valore Iniziale": "",
      "Residuo": "",
      "Stato": "",
      "Data Acquisto": "",
      "Cliente": "",
      "Telefono": "",
      "Ordine": "",
    })
    
    // Header transazioni
    rows.push({
      "Tipo": "TRANSAZIONE",
      "Codice": "Data",
      "Valore Iniziale": "Importo",
      "Residuo": "Numero Scontrino",
      "Stato": "Nota",
      "Data Acquisto": "",
      "Cliente": "",
      "Telefono": "",
      "Ordine": "",
    })
    
    // Transazioni
    selectedGiftCard.transactions.forEach((t) => {
      rows.push({
        "Tipo": "Utilizzo",
        "Codice": new Date(t.createdAt).toLocaleString("it-IT"),
        "Valore Iniziale": -t.amount,
        "Residuo": t.receiptNumber || "",
        "Stato": t.note || "",
        "Data Acquisto": "",
        "Cliente": "",
        "Telefono": "",
        "Ordine": "",
      })
    })
    
    // Riga totali
    const totalUsed = selectedGiftCard.transactions.reduce((sum, t) => sum + t.amount, 0)
    rows.push({
      "Tipo": "TOTALE",
      "Codice": "",
      "Valore Iniziale": "",
      "Residuo": "",
      "Stato": "",
      "Data Acquisto": "",
      "Cliente": "",
      "Telefono": "",
      "Ordine": "",
    })
    rows.push({
      "Tipo": "Totale Utilizzato",
      "Codice": totalUsed,
      "Valore Iniziale": "",
      "Residuo": "",
      "Stato": "",
      "Data Acquisto": "",
      "Cliente": "",
      "Telefono": "",
      "Ordine": "",
    })
    rows.push({
      "Tipo": "Residuo Attuale",
      "Codice": selectedGiftCard.remainingValue,
      "Valore Iniziale": "",
      "Residuo": "",
      "Stato": "",
      "Data Acquisto": "",
      "Cliente": "",
      "Telefono": "",
      "Ordine": "",
    })

    const ws = XLSX.utils.json_to_sheet(rows)
    const wb = XLSX.utils.book_new()
    XLSX.utils.book_append_sheet(wb, ws, "Gift Card")
    
    XLSX.writeFile(wb, `GiftCard_${selectedGiftCard.code}_${new Date().toISOString().split("T")[0]}.xlsx`)
  }

  // Export PDF della gift card (con foto scontrino)
  const exportGiftCardToPDF = async () => {
    if (!selectedGiftCard) return

    const pdfDoc = await PDFDocument.create()
    const font = await pdfDoc.embedFont(StandardFonts.Helvetica)
    const fontBold = await pdfDoc.embedFont(StandardFonts.HelveticaBold)
    
    let page = pdfDoc.addPage([595, 842]) // A4 Portrait
    const { width, height } = page.getSize()
    let y = height - 50
    const margin = 40
    const rowHeight = 18
    
    // Header
    page.drawText("Lo Scalo - Gift Card", {
      x: margin,
      y,
      size: 20,
      font: fontBold,
      color: rgb(0.2, 0.2, 0.2),
    })
    y -= 30
    
    // Dati Gift Card
    page.drawText(`Codice: ${selectedGiftCard.code}`, {
      x: margin,
      y,
      size: 14,
      font: fontBold,
    })
    y -= 25
    
    page.drawText(`Cliente: ${selectedGiftCard.order?.email || "N/A"}`, {
      x: margin,
      y,
      size: 11,
      font,
    })
    y -= rowHeight
    
    page.drawText(`Telefono: ${selectedGiftCard.order?.phone || "N/A"}`, {
      x: margin,
      y,
      size: 11,
      font,
    })
    y -= rowHeight
    
    page.drawText(`Ordine: #${selectedGiftCard.order?.orderNumber || "N/A"}`, {
      x: margin,
      y,
      size: 11,
      font,
    })
    y -= rowHeight
    
    page.drawText(`Data Acquisto: ${new Date(selectedGiftCard.purchasedAt).toLocaleDateString("it-IT")}`, {
      x: margin,
      y,
      size: 11,
      font,
    })
    y -= rowHeight
    
    page.drawText(`Stato: ${selectedGiftCard.isArchived ? "Archiviata" : "Attiva"}`, {
      x: margin,
      y,
      size: 11,
      font,
    })
    y -= 30
    
    // Valori
    page.drawText(`Valore Iniziale: ${selectedGiftCard.initialValue.toFixed(2)}€`, {
      x: margin,
      y,
      size: 12,
      font: fontBold,
      color: rgb(0.2, 0.4, 0.8),
    })
    y -= rowHeight
    
    page.drawText(`Residuo Attuale: ${selectedGiftCard.remainingValue.toFixed(2)}€`, {
      x: margin,
      y,
      size: 12,
      font: fontBold,
      color: selectedGiftCard.remainingValue > 0 ? rgb(0.2, 0.6, 0.2) : rgb(0.5, 0.5, 0.5),
    })
    y -= 40
    
    // Separator
    page.drawLine({
      start: { x: margin, y },
      end: { x: width - margin, y },
      thickness: 1,
      color: rgb(0.8, 0.8, 0.8),
    })
    y -= 30
    
    // Transazioni
    page.drawText("Transazioni", {
      x: margin,
      y,
      size: 14,
      font: fontBold,
    })
    y -= 25
    
    // Per ogni transazione, aggiungi una pagina se necessario
    for (const transaction of selectedGiftCard.transactions) {
      if (y < 150) {
        page = pdfDoc.addPage([595, 842])
        y = height - 50
      }
      
      page.drawText(`${new Date(transaction.createdAt).toLocaleString("it-IT")}`, {
        x: margin,
        y,
        size: 10,
        font,
        color: rgb(0.4, 0.4, 0.4),
      })
      y -= rowHeight
      
      page.drawText(`Importo: -${transaction.amount.toFixed(2)}€`, {
        x: margin,
        y,
        size: 11,
        font: fontBold,
        color: rgb(0.8, 0.2, 0.2),
      })
      y -= rowHeight
      
      if (transaction.receiptNumber) {
        page.drawText(`Scontrino: ${transaction.receiptNumber}`, {
          x: margin,
          y,
          size: 10,
          font,
        })
        y -= rowHeight
      }
      
      if (transaction.note) {
        page.drawText(`Nota: ${transaction.note}`, {
          x: margin,
          y,
          size: 10,
          font,
          color: rgb(0.4, 0.4, 0.4),
        })
        y -= rowHeight
      }
      
      // Aggiungi immagine scontrino se presente
      if (transaction.receiptImage) {
        try {
          // Estrai base64
          const base64Data = transaction.receiptImage.split(',')[1]
          if (base64Data) {
            const imageBytes = Uint8Array.from(atob(base64Data), c => c.charCodeAt(0))
            const image = await pdfDoc.embedJpg(imageBytes).catch(() => 
              pdfDoc.embedPng(imageBytes)
            )
            
            const imgWidth = 200
            const imgHeight = (image.height / image.width) * imgWidth
            
            if (y - imgHeight < 50) {
              page = pdfDoc.addPage([595, 842])
              y = height - 50
            }
            
            page.drawImage(image, {
              x: margin,
              y: y - imgHeight,
              width: imgWidth,
              height: imgHeight,
            })
            y -= imgHeight + 20
          }
        } catch (e) {
          console.error("Error embedding image:", e)
        }
      }
      
      y -= 15
      
      // Separator
      page.drawLine({
        start: { x: margin, y },
        end: { x: width - margin, y },
        thickness: 0.5,
        color: rgb(0.9, 0.9, 0.9),
      })
      y -= 20
    }
    
    // Totali
    if (y < 100) {
      page = pdfDoc.addPage([595, 842])
      y = height - 50
    }
    
    const totalUsed = selectedGiftCard.transactions.reduce((sum, t) => sum + t.amount, 0)
    
    page.drawText(`Totale Utilizzato: ${totalUsed.toFixed(2)}€`, {
      x: margin,
      y,
      size: 12,
      font: fontBold,
    })
    y -= rowHeight
    
    page.drawText(`Residuo: ${selectedGiftCard.remainingValue.toFixed(2)}€`, {
      x: margin,
      y,
      size: 12,
      font: fontBold,
    })
    
    const pdfBytes = await pdfDoc.save()
    const blob = new Blob([pdfBytes as unknown as ArrayBuffer], { type: "application/pdf" })
    const url = window.URL.createObjectURL(blob)
    const link = document.createElement("a")
    link.href = url
    link.download = `GiftCard_${selectedGiftCard.code}_${new Date().toISOString().split("T")[0]}.pdf`
    link.click()
    window.URL.revokeObjectURL(url)
  }

  // Reset pagina a 1 quando cambia il tab
  useEffect(() => {
    setPagination(prev => ({
      ...prev,
      [activeTab]: { ...prev[activeTab], page: 1 }
    }))
  }, [activeTab])

  // Fetch totali per tutti i tab (per i badge) - solo al mount, una sola chiamata
  useEffect(() => {
    const fetchTotals = async () => {
      try {
        const res = await fetch("/api/admin/gift-cards/counts")
        if (res.ok) {
          const data = await res.json()
          setPagination(prev => ({
            active: { ...prev.active, total: data.active || 0 },
            exhausted: { ...prev.exhausted, total: data.exhausted || 0 },
            unavailable: { ...prev.unavailable, total: data.unavailable || 0 },
          }))
        }
      } catch (error) {
        console.error("Error fetching totals:", error)
      }
    }
    
    fetchTotals()
  }, [])

  // Conta gift card per ogni tab (dai totali)
  const activeCount = pagination.active.total
  const exhaustedCount = pagination.exhausted.total
  const unavailableCount = pagination.unavailable.total
  
  // Current page e total pages
  const currentPage = pagination[activeTab].page
  const totalPages = Math.ceil(pagination[activeTab].total / ITEMS_PER_PAGE)
  
  // Loading state specific for pagination (shows skeleton instead of spinner)
  const [isPageLoading, setIsPageLoading] = useState(false)

  const handlePageChange = async (newPage: number) => {
    setIsPageLoading(true)
    setPagination(prev => ({
      ...prev,
      [activeTab]: { ...prev[activeTab], page: newPage }
    }))
    // Chiama fetchGiftCards direttamente con la nuova pagina
    await fetchGiftCards(undefined, newPage)
    setIsPageLoading(false)
  }

  // Initial loading state (full page spinner)
  if (loading) {
    return (
      <main className="min-h-screen bg-brand-cream flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-brand-primary" />
      </main>
    )
  }
  
  // Determine what to show in the gift cards list
  const showSkeletons = isPageLoading
  const displayGiftCards = isPageLoading ? [] : giftCards

  return (
    <main className="min-h-screen bg-brand-cream">
      <header className="bg-white border-b border-brand-light-gray">
        <div className="flex items-center px-4 py-3 relative">
          <Link href="/admin" className="p-2 -ml-2">
            <ArrowLeft className="w-6 h-6 text-brand-dark" />
          </Link>
          <h1 className="text-headline-sm font-bold text-brand-dark absolute left-1/2 -translate-x-1/2">
            Gest. Gift Card
          </h1>
        </div>
      </header>

      <div className="p-4">
        {/* Search + Actions */}
        <div className="space-y-3 mb-4">
          {/* Desktop: Input + Bottoni in riga | Mobile: Input sopra, bottoni sotto */}
          <div className="flex flex-col sm:flex-row gap-2">
            <div className="relative flex-1">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-brand-gray" />
              <input
                type="text"
                placeholder="Cerca per codice, email, telefono o numero ordine..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="input-field pl-12 pr-10 w-full"
              />
              {searchQuery && (
                <button
                  onClick={() => setSearchQuery("")}
                  className="absolute right-3 top-1/2 -translate-y-1/2 p-1 text-brand-gray hover:text-brand-dark hover:bg-brand-light-gray/50 rounded-full transition-colors"
                  title="Cancella"
                >
                  <X className="w-4 h-4" />
                </button>
              )}
            </div>
            {/* Bottoni azione */}
            <div className="flex gap-2">
              <button
                onClick={() => fetchGiftCards(undefined, undefined, true)}
                className="flex-1 sm:flex-none flex items-center justify-center gap-2 px-4 py-3 bg-white border border-brand-light-gray rounded-xl text-brand-primary hover:bg-brand-primary/5 transition-colors"
                title="Aggiorna"
              >
                <RotateCcw className="w-5 h-5" />
                <span className="sm:hidden text-body-sm">Aggiorna</span>
              </button>
              <button
                onClick={() => setShowScanner(true)}
                className="flex-1 sm:flex-none flex items-center justify-center gap-2 px-4 py-3 bg-white border border-brand-light-gray rounded-xl text-brand-primary hover:bg-brand-primary/5 transition-colors"
                title="Scansiona QR Code"
              >
                <QrCode className="w-5 h-5" />
                <span className="sm:hidden text-body-sm">Scanner</span>
              </button>
            </div>
          </div>
        </div>

        {/* Separatore tra area ricerca e tabs */}
        <div className="border-b border-brand-light-gray mb-4" />

        {/* Tabs */}
        <div className="flex gap-2 mb-6">
          <button
            onClick={() => setActiveTab("active")}
            className={`flex-1 py-2 px-4 rounded-full text-title-sm font-medium transition-all ${
              activeTab === "active"
                ? "bg-brand-primary text-white"
                : "bg-white text-brand-gray border border-brand-light-gray"
            }`}
          >
            Attive ({activeCount})
          </button>
          <button
            onClick={() => setActiveTab("exhausted")}
            className={`flex-1 py-2 px-4 rounded-full text-title-sm font-medium transition-all ${
              activeTab === "exhausted"
                ? "bg-amber-500 text-white"
                : "bg-white text-brand-gray border border-brand-light-gray"
            }`}
          >
            Credito esaurito ({exhaustedCount})
          </button>
          <button
            onClick={() => setActiveTab("unavailable")}
            className={`flex-1 py-2 px-4 rounded-full text-title-sm font-medium transition-all ${
              activeTab === "unavailable"
                ? "bg-red-500 text-white"
                : "bg-white text-brand-gray border border-brand-light-gray"
            }`}
          >
            Non Disp. ({unavailableCount})
          </button>
        </div>

        {/* Pagination Top */}
        <Pagination
          currentPage={currentPage}
          totalPages={totalPages}
          onPageChange={handlePageChange}
          totalItems={pagination[activeTab].total}
          itemsPerPage={ITEMS_PER_PAGE}
          disabled={isPageLoading}
        />

        {/* Gift Cards List */}
        <div className="space-y-4">
          {/* Skeleton loading state during pagination */}
          {showSkeletons && (
            <>
              {Array.from({ length: ITEMS_PER_PAGE }).map((_, i) => (
                <GiftCardSkeleton key={`skeleton-${i}`} />
              ))}
            </>
          )}
          
          {/* Actual gift cards */}
          {!showSkeletons && displayGiftCards.map((gc) => {
            const usedValue = gc.initialValue - gc.remainingValue
            return (
              <button
                key={gc.id}
                onClick={() => {
                  setSelectedGiftCard(gc)
                  setUseAmount("")
                  setUseNote("")
                  setReceiptNumber("")
                  setReceiptImage(null)
                  setUseError(null)
                  setUseSuccess(null)
                }}
                className="w-full bg-white rounded-2xl shadow-card p-4 text-left hover:shadow-card-hover transition-shadow"
              >
                {/* Header: Codice + Badge stato */}
                <div className="flex items-center justify-between mb-3">
                  <h3 className="font-mono text-title-md font-bold text-brand-dark break-all">
                    {gc.code}
                  </h3>
                  <div className="flex items-center gap-2">
                    {gc.transactions.length > 0 && (
                      <span className="flex items-center gap-1 text-brand-gray text-label-md">
                        <History className="w-4 h-4" />
                        {gc.transactions.length}
                      </span>
                    )}
                    {gc.isArchived && (
                      <span className="px-2 py-1 bg-gray-100 text-gray-600 text-label-sm rounded-full">
                        Archiviata
                      </span>
                    )}
                    {gc.isExpired && (
                      <span className="px-2 py-1 bg-red-100 text-red-600 text-label-sm rounded-full">
                        Scaduta
                      </span>
                    )}
                    {gc.isSoftDeleted && (
                      <span className="px-2 py-1 bg-orange-100 text-orange-600 text-label-sm rounded-full">
                        Cancellata
                      </span>
                    )}
                  </div>
                </div>

                {/* Info Cliente */}
                <div className="space-y-1 mb-3">
                  <p className="text-body-sm text-brand-dark truncate">
                    <span className="text-brand-gray">Cliente:</span>{" "}
                    {gc.order?.email}
                  </p>
                  {gc.order?.phone && (
                    <p className="text-body-sm text-brand-dark">
                      <span className="text-brand-gray">Tel:</span>{" "}
                      {gc.order?.phone}
                    </p>
                  )}
                  <p className="text-body-sm text-brand-dark">
                    <span className="text-brand-gray">Ordine:</span>{" "}
                    #{gc.order?.orderNumber}
                    {gc.purchasedAt && (
                      <span className="text-brand-gray ml-1">
                        • {new Date(gc.purchasedAt).toLocaleDateString("it-IT")}
                      </span>
                    )}
                  </p>
                  {gc.expiresAt && (
                    <p className="text-body-sm text-brand-dark">
                      <span className="text-brand-gray">Scadenza:</span>{" "}
                      <span className={gc.isExpired ? "text-red-500 font-medium" : ""}>
                        {new Date(gc.expiresAt).toLocaleDateString("it-IT")}
                        {gc.isExpired && " (scaduta)"}
                      </span>
                    </p>
                  )}
                </div>

                {/* Valori - Barra progresso */}
                <div className="bg-brand-cream rounded-xl p-3">
                  <div className="flex items-center justify-between mb-2">
                    <div>
                      <span className="text-label-sm text-brand-gray">Residuo</span>
                      <p
                        className={`text-headline-sm font-bold ${
                          gc.remainingValue > 0 ? "text-brand-primary" : "text-brand-gray"
                        }`}
                      >
                        {gc.remainingValue.toFixed(2)}€
                      </p>
                    </div>
                    <div className="text-right">
                      <span className="text-label-sm text-brand-gray">Iniziale</span>
                      <p className="text-body-md text-brand-dark">{gc.initialValue.toFixed(2)}€</p>
                    </div>
                  </div>
                  {/* Progress bar */}
                  <div className="h-2 bg-brand-light-gray rounded-full overflow-hidden">
                    <div
                      className={`h-full rounded-full transition-all ${
                        gc.remainingValue > 0 ? "bg-brand-primary" : "bg-gray-400"
                      }`}
                      style={{ width: `${(gc.remainingValue / gc.initialValue) * 100}%` }}
                    />
                  </div>
                  {usedValue > 0 && (
                    <p className="text-label-sm text-brand-gray mt-1 text-right">
                      Usati: {usedValue.toFixed(2)}€
                    </p>
                  )}
                </div>
              </button>
            )
          })}

          {!showSkeletons && displayGiftCards.length === 0 && (
            <p className="text-center text-brand-gray py-12">
              Nessuna gift card {" "}
              {activeTab === "active" ? "attiva" : activeTab === "exhausted" ? "con credito esaurito" : "non disponibile"} trovata
            </p>
          )}
        </div>

        {/* Pagination Bottom */}
        <Pagination
          currentPage={currentPage}
          totalPages={totalPages}
          onPageChange={handlePageChange}
          totalItems={pagination[activeTab].total}
          itemsPerPage={ITEMS_PER_PAGE}
          disabled={isPageLoading}
        />
      </div>

      {/* Modal Completa Gift Card */}
      {selectedGiftCard && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50">
          <div className="bg-white rounded-3xl w-full max-w-lg max-h-[90vh] overflow-y-auto">
            {/* Header */}
            <div className="sticky top-0 bg-white border-b border-brand-light-gray p-4 flex items-center justify-between">
              <div>
                <h2 className="text-headline-sm font-bold text-brand-dark">Gift Card</h2>
                <p className="font-mono text-label-md text-brand-gray">{selectedGiftCard.code}</p>
              </div>
              <button
                onClick={() => setSelectedGiftCard(null)}
                className="p-2 hover:bg-brand-light-gray rounded-full transition-colors"
                title="Chiudi"
                aria-label="Chiudi"
              >
                <X className="w-6 h-6 text-brand-gray" />
              </button>
            </div>

            <div className="p-4 space-y-6">
              {/* Stato e Valori */}
              <div className="bg-brand-cream rounded-2xl p-4">
                <div className="flex items-center justify-between mb-4">
                  <div>
                    <span className="text-label-sm text-brand-gray">Residuo</span>
                    <p className={`text-headline-lg font-bold ${selectedGiftCard.remainingValue > 0 ? "text-brand-primary" : "text-brand-gray"}`}>
                      {selectedGiftCard.remainingValue.toFixed(2)}€
                    </p>
                  </div>
                  <div className="text-right">
                    {selectedGiftCard.isArchived ? (
                      <span className="px-3 py-1 bg-gray-100 text-gray-600 text-label-sm rounded-full">
                        Archiviata
                      </span>
                    ) : selectedGiftCard.isExpired ? (
                      <span className="px-3 py-1 bg-red-100 text-red-600 text-label-sm rounded-full">
                        Scaduta
                      </span>
                    ) : selectedGiftCard.isSoftDeleted ? (
                      <span className="px-3 py-1 bg-orange-100 text-orange-600 text-label-sm rounded-full">
                        Cancellata
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1 px-3 py-1 bg-green-100 text-green-700 text-label-sm rounded-full">
                        <CreditCard className="w-3 h-3" />
                        Attiva
                      </span>
                    )}
                  </div>
                </div>

                {/* Progress bar */}
                <div className="h-3 bg-brand-light-gray rounded-full overflow-hidden mb-2">
                  <div
                    className={`h-full rounded-full transition-all ${selectedGiftCard.remainingValue > 0 ? "bg-brand-primary" : "bg-gray-400"}`}
                    style={{ width: `${(selectedGiftCard.remainingValue / selectedGiftCard.initialValue) * 100}%` }}
                  />
                </div>
                <div className="flex justify-between text-label-sm text-brand-gray">
                  <span>Usati: {(selectedGiftCard.initialValue - selectedGiftCard.remainingValue).toFixed(2)}€</span>
                  <span>Iniziale: {selectedGiftCard.initialValue.toFixed(2)}€</span>
                </div>
              </div>

              {/* Warning per GC non disponibili */}
              {(selectedGiftCard.isExpired || selectedGiftCard.isSoftDeleted) && (
                <div className="p-4 bg-red-50 border border-red-200 rounded-xl">
                  <div className="flex items-start gap-3">
                    <AlertCircle className="w-5 h-5 text-red-500 flex-shrink-0 mt-0.5" />
                    <div>
                      <p className="text-body-sm font-bold text-red-700">
                        {selectedGiftCard.isExpired 
                          ? "Questa Gift Card è scaduta" 
                          : "Questa Gift Card è stata cancellata"}
                      </p>
                      <p className="text-body-sm text-red-600 mt-1">
                        {selectedGiftCard.isExpired
                          ? `Scadenza: ${selectedGiftCard.expiresAt ? new Date(selectedGiftCard.expiresAt).toLocaleDateString("it-IT") : "N/A"}. Il credito residuo di ${selectedGiftCard.remainingValue.toFixed(2)}€ rimane registrato per contabilità ma non è più utilizzabile.`
                          : "Non è possibile utilizzare una gift card cancellata."}
                      </p>
                    </div>
                  </div>
                </div>
              )}

              {/* Form Usa Gift Card */}
              {selectedGiftCard.remainingValue > 0 && !selectedGiftCard.isArchived && !selectedGiftCard.isExpired && !selectedGiftCard.isSoftDeleted && (
                <div className="space-y-3">
                  <h3 className="text-title-sm font-bold text-brand-dark">Utilizza Gift Card</h3>
                  
                  {useError && (
                    <div className="flex items-center gap-2 p-3 bg-red-50 border border-red-200 rounded-xl">
                      <AlertCircle className="w-4 h-4 text-red-500 flex-shrink-0" />
                      <p className="text-body-sm text-red-700">{useError}</p>
                    </div>
                  )}
                  
                  {useSuccess && (
                    <div className="flex items-center gap-2 p-3 bg-green-50 border border-green-200 rounded-xl">
                      <CreditCard className="w-4 h-4 text-green-500 flex-shrink-0" />
                      <p className="text-body-sm text-green-700">{useSuccess}</p>
                    </div>
                  )}

                  <div className="space-y-3">
                    <div>
                      <label className="block text-label-sm text-brand-gray mb-1">Importo (€)</label>
                      <input
                        type="number"
                        inputMode="decimal"
                        min="0.01"
                        max={selectedGiftCard.remainingValue}
                        step="0.01"
                        placeholder="0.00"
                        value={useAmount}
                        onChange={(e) => {
                          setUseAmount(e.target.value)
                          setUseError(null)
                        }}
                        className="input-field w-full"
                      />
                      <p className="text-label-sm text-brand-gray mt-1">
                        Max: {selectedGiftCard.remainingValue.toFixed(2)}€
                      </p>
                    </div>
                    
                    <div>
                      <label className="block text-label-sm text-brand-gray mb-1">Nota (opzionale)</label>
                      <input
                        type="text"
                        placeholder="Es: Cocktail x2, Birra..."
                        value={useNote}
                        onChange={(e) => setUseNote(e.target.value)}
                        className="input-field w-full"
                        maxLength={100}
                      />
                    </div>

                    {/* Numero Scontrino - Obbligatorio */}
                    <div>
                      <label className="block text-label-sm text-brand-gray mb-1">
                        <span className="flex items-center gap-1">
                          <Receipt className="w-3 h-3" />
                          Numero Scontrino <span className="text-red-500">*</span>
                        </span>
                      </label>
                      <input
                        type="text"
                        inputMode="numeric"
                        pattern="[0-9]*"
                        placeholder="2874-3984"
                        value={receiptNumber}
                        onChange={(e) => {
                          let value = e.target.value.replace(/[^0-9-]/g, '')
                          
                          // Auto-add dash after 4 digits
                          if (value.length > 4 && !value.includes('-')) {
                            value = value.slice(0, 4) + '-' + value.slice(4)
                          }
                          
                          // Limit to max 4 digits + dash + 5 digits = 10 chars
                          if (value.length > 10) {
                            value = value.slice(0, 10)
                          }
                          
                          setReceiptNumber(value)
                          setUseError(null)
                        }}
                        className="input-field w-full"
                        maxLength={10}
                      />
                      <p className="text-label-sm text-brand-gray mt-1">
                        Formato: REGISTRO-PROGRESSIVO (es: 2874-3984 o 2874-10001)
                      </p>
                    </div>

                    {/* Foto Scontrino */}
                    <div>
                      <label className="block text-label-sm text-brand-gray mb-1">
                        <span className="flex items-center gap-1">
                          <Camera className="w-3 h-3" />
                          Foto Scontrino
                        </span>
                      </label>
                      
                      {receiptImage ? (
                        <div className="relative">
                          <NextImage
                            src={receiptImage}
                            alt="Scontrino"
                            width={400}
                            height={160}
                            unoptimized
                            className="w-full h-40 object-contain bg-brand-light-gray/30 rounded-xl"
                          />
                          <button
                            onClick={() => setReceiptImage(null)}
                            className="absolute top-2 right-2 p-1 bg-red-500 text-white rounded-full hover:bg-red-600"
                            title="Rimuovi foto"
                          >
                            <X className="w-4 h-4" />
                          </button>
                        </div>
                      ) : (
                        <div className="relative">
                          <input
                            type="file"
                            accept="image/*"
                            capture="environment"
                            onChange={handleImageUpload}
                            className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                            title="Scatta foto o seleziona dalla galleria"
                            aria-label="Scatta foto o seleziona dalla galleria"
                          />
                          <div className="flex flex-col items-center justify-center gap-2 p-6 border-2 border-dashed border-brand-light-gray rounded-xl hover:bg-brand-light-gray/20 transition-colors">
                            <Camera className="w-8 h-8 text-brand-gray" />
                            <span className="text-body-sm text-brand-gray">
                              Tocca per scattare foto
                            </span>
                            <span className="text-label-sm text-brand-gray/60">
                              o seleziona dalla galleria
                            </span>
                          </div>
                        </div>
                      )}
                    </div>

                    <button
                      onClick={handleUseGiftCard}
                      disabled={!useAmount || parseNumber(useAmount) <= 0 || !receiptNumber.trim() || isUsing}
                      className="w-full btn-primary py-3 flex items-center justify-center gap-2 disabled:opacity-50"
                    >
                      {isUsing ? (
                        <>
                          <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                          Registrazione...
                        </>
                      ) : (
                        <>
                          <CreditCard className="w-4 h-4" />
                          Registra Utilizzo
                        </>
                      )}
                    </button>
                  </div>
                </div>
              )}

              {/* Transazioni */}
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <h3 className="text-title-sm font-bold text-brand-dark flex items-center gap-2">
                    <History className="w-4 h-4" />
                    Storico Transazioni
                    <span className="text-label-sm text-brand-gray font-normal">
                      ({selectedGiftCard.transactions.length})
                    </span>
                  </h3>
                  {selectedGiftCard.transactions.length > 0 && (
                    <div className="flex items-center gap-1">
                      <button
                        onClick={exportGiftCardToExcel}
                        className="p-2 text-green-600 hover:bg-green-50 rounded-lg transition-colors"
                        title="Export Excel"
                      >
                        <FileSpreadsheet className="w-4 h-4" />
                      </button>
                      <button
                        onClick={exportGiftCardToPDF}
                        className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                        title="Export PDF con foto"
                      >
                        <Printer className="w-4 h-4" />
                      </button>
                    </div>
                  )}
                </div>

                {selectedGiftCard.transactions.length === 0 ? (
                  <p className="text-center text-brand-gray py-4 bg-brand-light-gray/30 rounded-xl">
                    Nessuna transazione registrata
                  </p>
                ) : (
                  <div className="space-y-2 max-h-64 overflow-y-auto">
                    {selectedGiftCard.transactions.map((transaction) => (
                      <div
                        key={transaction.id}
                        className="p-3 bg-brand-light-gray/30 rounded-xl"
                      >
                        <div className="flex items-center justify-between">
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 flex-wrap">
                              <span className="text-body-sm font-bold text-brand-dark">
                                -{transaction.amount.toFixed(2)}€
                              </span>
                              <span className="text-label-sm text-brand-gray">
                                {new Date(transaction.createdAt).toLocaleString("it-IT", {
                                  day: "2-digit",
                                  month: "2-digit",
                                  hour: "2-digit",
                                  minute: "2-digit",
                                })}
                              </span>
                              {transaction.receiptNumber && (
                                <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-blue-100 text-blue-700 text-label-sm rounded">
                                  <Receipt className="w-3 h-3" />
                                  {transaction.receiptNumber}
                                </span>
                              )}
                            </div>
                            {transaction.note && (
                              <p className="text-label-sm text-brand-gray truncate mt-1">
                                {transaction.note}
                              </p>
                            )}
                          </div>
                          {!selectedGiftCard.isExpired && !selectedGiftCard.isSoftDeleted && (
                            <button
                              onClick={() => handleDeleteTransaction(transaction.id, selectedGiftCard.id)}
                              className="p-2 text-red-500 hover:bg-red-50 rounded-full transition-colors flex-shrink-0 ml-2"
                              title="Elimina transazione e ripristina credito"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          )}
                        </div>
                        
                        {/* Foto Scontrino */}
                        {transaction.receiptImage && (
                          <div className="mt-2">
                            <NextImage
                              src={transaction.receiptImage}
                              alt={`Scontrino ${transaction.receiptNumber || ''}`}
                              width={96}
                              height={96}
                              unoptimized
                              className="h-24 w-auto object-contain rounded-lg border border-brand-light-gray cursor-pointer hover:opacity-80"
                              onClick={() => setFullscreenImage({ 
                                url: transaction.receiptImage!, 
                                receiptNumber: transaction.receiptNumber 
                              })}
                            />
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Info Automatica */}
              <div className="pt-4 border-t border-brand-light-gray">
                <p className="text-label-sm text-brand-gray text-center">
                  {selectedGiftCard.isExpired 
                    ? "Gift card scaduta. Le transazioni non possono essere modificate."
                    : selectedGiftCard.isSoftDeleted
                    ? "Gift card cancellata. Le transazioni non possono essere modificate."
                    : selectedGiftCard.remainingValue === 0
                    ? "Credito esaurito. Elimina una transazione per ripristinare il credito."
                    : "Il credito rimanente verrà visualizzato qui."
                  }
                </p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Modal Immagine Scontrino Fullscreen */}
      {fullscreenImage && (
        <div 
          className="fixed inset-0 z-[60] bg-black/90 flex items-center justify-center p-4"
          onClick={() => setFullscreenImage(null)}
        >
          <div className="relative max-w-full max-h-full">
            {/* Header con info e bottone chiudi */}
            <div className="absolute top-0 left-0 right-0 flex items-center justify-between p-4 bg-gradient-to-b from-black/80 to-transparent">
              <div>
                <p className="text-white text-sm font-medium">
                  {fullscreenImage.receiptNumber ? `Scontrino: ${fullscreenImage.receiptNumber}` : 'Foto Scontrino'}
                </p>
              </div>
              <div className="flex items-center gap-2">
                <a
                  href={fullscreenImage.url}
                  download={`scontrino_${fullscreenImage.receiptNumber || 'giftcard'}_${new Date().toISOString().split("T")[0]}.jpg`}
                  className="flex items-center gap-1 px-3 py-1.5 bg-white/20 text-white rounded-lg hover:bg-white/30 transition-colors"
                  onClick={(e) => e.stopPropagation()}
                >
                  <Download className="w-4 h-4" />
                  <span className="text-sm">Scarica</span>
                </a>
                <button
                  onClick={() => setFullscreenImage(null)}
                  className="p-2 bg-white/20 text-white rounded-lg hover:bg-white/30 transition-colors"
                  title="Chiudi"
                  aria-label="Chiudi"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>
            
            {/* Immagine */}
            <NextImage
              src={fullscreenImage.url}
              alt="Scontrino"
              width={1200}
              height={800}
              unoptimized
              className="max-w-full max-h-[90vh] object-contain rounded-lg"
              onClick={(e) => e.stopPropagation()}
            />
          </div>
        </div>
      )}

      {/* QR Scanner */}
      {showScanner && (
        <QRScanner
          onScan={(code) => {
            setSearchQuery(code)
            setShowScanner(false)
          }}
          onClose={() => setShowScanner(false)}
        />
      )}

      {/* Delete Confirmation Modal */}
      {deleteConfirm && (
        <div className="fixed inset-0 z-[70] flex items-center justify-center p-4 bg-black/50">
          <div className="bg-white rounded-3xl w-full max-w-sm p-6 shadow-2xl">
            <div className="text-center mb-6">
              <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <Trash2 className="w-8 h-8 text-red-500" />
              </div>
              <h3 className="text-headline-sm font-bold text-brand-dark mb-2">
                Elimina Transazione
              </h3>
              <p className="text-body-md text-brand-gray">
                Sei sicuro di voler eliminare questa transazione? Il credito verrà ripristinato.
              </p>
            </div>
            <div className="flex gap-3">
              <button
                onClick={() => setDeleteConfirm(null)}
                className="flex-1 py-3 px-4 bg-brand-light-gray/50 text-brand-dark rounded-full font-medium hover:bg-brand-light-gray transition-colors"
              >
                Annulla
              </button>
              <button
                onClick={confirmDelete}
                className="flex-1 py-3 px-4 bg-red-500 text-white rounded-full font-medium hover:bg-red-600 transition-colors"
              >
                Elimina
              </button>
            </div>
          </div>
        </div>
      )}
    </main>
  )
}
