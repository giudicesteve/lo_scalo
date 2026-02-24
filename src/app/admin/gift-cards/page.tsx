"use client"

import { useEffect, useState } from "react"
import Link from "next/link"
import { QRScanner } from "@/components/QRScanner"
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
} from "lucide-react"

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
  purchasedAt: string
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
  const [activeTab, setActiveTab] = useState<"active" | "archived">("active")
  const [selectedGiftCard, setSelectedGiftCard] = useState<GiftCard | null>(null)
  const [useAmount, setUseAmount] = useState("")
  const [useNote, setUseNote] = useState("")
  const [receiptNumber, setReceiptNumber] = useState("")
  const [receiptImage, setReceiptImage] = useState<string | null>(null)
  const [useError, setUseError] = useState<string | null>(null)
  const [useSuccess, setUseSuccess] = useState<string | null>(null)
  const [isUsing, setIsUsing] = useState(false)
  const [showScanner, setShowScanner] = useState(false)

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

  useEffect(() => {
    fetchGiftCards()
  }, [])

  // Ricarica quando la pagina prende focus (utente torna sulla tab)
  useEffect(() => {
    const handleFocus = () => {
      fetchGiftCards()
    }
    window.addEventListener('focus', handleFocus)
    return () => window.removeEventListener('focus', handleFocus)
  }, [])

  const fetchGiftCards = async () => {
    try {
      const res = await fetch("/api/admin/gift-cards")
      const data = await res.json()
      setGiftCards(data)
      setLoading(false)
    } catch (error) {
      console.error("Error fetching gift cards:", error)
      setLoading(false)
    }
  }

  const handleUseGiftCard = async () => {
    if (!selectedGiftCard || !useAmount || parseFloat(useAmount) <= 0) {
      setUseError("Inserisci un importo valido")
      return
    }

    if (!receiptNumber.trim()) {
      setUseError("Numero scontrino obbligatorio")
      return
    }

    const amount = parseFloat(useAmount)
    
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
        // Aggiorna la gift card selezionata
        const updatedCard = await fetch("/api/admin/gift-cards").then((r) => r.json())
        const card = updatedCard.find((c: GiftCard) => c.id === selectedGiftCard.id)
        if (card) {
          setSelectedGiftCard(card)
        }
        fetchGiftCards()
      } else {
        setUseError(data.error || "Errore durante l'utilizzo")
      }
    } catch {
      setUseError("Errore di connessione")
    } finally {
      setIsUsing(false)
    }
  }



  const handleDeleteTransaction = async (
    transactionId: string,
    giftCardId: string
  ) => {
    if (
      !confirm(
        "Sei sicuro di voler eliminare questa transazione? Il credito verrà ripristinato."
      )
    ) {
      return
    }

    try {
      const res = await fetch(
        `/api/admin/gift-cards/transactions/${transactionId}`,
        {
          method: "DELETE",
        }
      )

      if (res.ok) {
        if (selectedGiftCard?.id === giftCardId) {
          const updatedCard = await fetch("/api/admin/gift-cards").then((r) =>
            r.json()
          )
          const card = updatedCard.find((c: GiftCard) => c.id === giftCardId)
          if (card) {
            setSelectedGiftCard(card)
          } else {
            setSelectedGiftCard(null)
          }
        }
        fetchGiftCards()
      } else {
        alert("Errore durante l'eliminazione")
      }
    } catch {
      alert("Errore durante l'eliminazione")
    }
  }

  // Conta gift card attive (isActive=true, isArchived=false) e archiviate
  const activeCount = giftCards.filter((gc) => gc.isActive && !gc.isArchived).length
  const archivedCount = giftCards.filter((gc) => gc.isArchived).length

  // Funzione per cercare gift card che matchano la query (in tutti i tab)
  const searchAllGiftCards = (query: string) => {
    const lowerQuery = query.toLowerCase().trim()
    if (!lowerQuery) return { active: [], archived: [] }
    
    const active = giftCards.filter(
      (gc) => gc.isActive && !gc.isArchived && (
        gc.code.toLowerCase().includes(lowerQuery) ||
        gc.order?.email.toLowerCase().includes(lowerQuery) ||
        gc.order?.orderNumber.toLowerCase().includes(lowerQuery) ||
        (gc.order?.phone && gc.order.phone.toLowerCase().includes(lowerQuery))
      )
    )
    
    const archived = giftCards.filter(
      (gc) => gc.isArchived && (
        gc.code.toLowerCase().includes(lowerQuery) ||
        gc.order?.email.toLowerCase().includes(lowerQuery) ||
        gc.order?.orderNumber.toLowerCase().includes(lowerQuery) ||
        (gc.order?.phone && gc.order.phone.toLowerCase().includes(lowerQuery))
      )
    )
    
    return { active, archived }
  }

  // Auto-switch tab quando la ricerca trova risultati solo nell'altro tab
  useEffect(() => {
    if (!searchQuery.trim()) return
    
    const { active, archived } = searchAllGiftCards(searchQuery)
    
    // Se non ci sono risultati nel tab attivo ma ci sono nell'altro, switcha
    if (activeTab === "active" && active.length === 0 && archived.length > 0) {
      setActiveTab("archived")
    } else if (activeTab === "archived" && archived.length === 0 && active.length > 0) {
      setActiveTab("active")
    }
  }, [searchQuery])

  // Gift card filtrate per il tab attivo
  const filteredGiftCards = giftCards
    .filter((gc) => {
      if (activeTab === "active") {
        return gc.isActive && !gc.isArchived
      } else {
        return gc.isArchived
      }
    })
    .filter(
      (gc) =>
        gc.code.toLowerCase().includes(searchQuery.toLowerCase()) ||
        gc.order?.email.toLowerCase().includes(searchQuery.toLowerCase()) ||
        gc.order?.orderNumber
          .toLowerCase()
          .includes(searchQuery.toLowerCase()) ||
        (gc.order?.phone &&
          gc.order.phone.toLowerCase().includes(searchQuery.toLowerCase()))
    )

  if (loading) {
    return (
      <main className="min-h-screen bg-brand-cream flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-brand-primary" />
      </main>
    )
  }

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
                onClick={() => fetchGiftCards()}
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
            onClick={() => setActiveTab("archived")}
            className={`flex-1 py-2 px-4 rounded-full text-title-sm font-medium transition-all ${
              activeTab === "archived"
                ? "bg-brand-primary text-white"
                : "bg-white text-brand-gray border border-brand-light-gray"
            }`}
          >
            Archiviate ({archivedCount})
          </button>
        </div>

        {/* Gift Cards List */}
        <div className="space-y-4">
          {filteredGiftCards.map((gc) => {
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
                      {gc.order.phone}
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

          {filteredGiftCards.length === 0 && (
            <p className="text-center text-brand-gray py-12">
              Nessuna gift card {activeTab === "active" ? "attiva" : "archiviata"} trovata
            </p>
          )}
        </div>
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

              {/* Form Usa Gift Card */}
              {selectedGiftCard.remainingValue > 0 && !selectedGiftCard.isArchived && (
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
                        placeholder="Es: 123/2024"
                        value={receiptNumber}
                        onChange={(e) => {
                          setReceiptNumber(e.target.value)
                          setUseError(null)
                        }}
                        className="input-field w-full"
                        maxLength={50}
                      />
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
                          <img
                            src={receiptImage}
                            alt="Scontrino"
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
                      disabled={!useAmount || parseFloat(useAmount) <= 0 || !receiptNumber.trim() || isUsing}
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
                <h3 className="text-title-sm font-bold text-brand-dark flex items-center gap-2">
                  <History className="w-4 h-4" />
                  Storico Transazioni
                  <span className="text-label-sm text-brand-gray font-normal">
                    ({selectedGiftCard.transactions.length})
                  </span>
                </h3>

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
                          <button
                            onClick={() => handleDeleteTransaction(transaction.id, selectedGiftCard.id)}
                            className="p-2 text-red-500 hover:bg-red-50 rounded-full transition-colors flex-shrink-0 ml-2"
                            title="Elimina transazione e ripristina credito"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                        
                        {/* Foto Scontrino */}
                        {transaction.receiptImage && (
                          <div className="mt-2">
                            <img
                              src={transaction.receiptImage}
                              alt={`Scontrino ${transaction.receiptNumber || ''}`}
                              className="h-24 w-auto object-contain rounded-lg border border-brand-light-gray cursor-pointer hover:opacity-80"
                              onClick={() => window.open(transaction.receiptImage!, '_blank')}
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
                  {selectedGiftCard.isArchived 
                    ? "Gift card archiviata automaticamente per credito esaurito. Elimina una transazione per ripristinare il credito."
                    : "La gift card verrà archiviata automaticamente quando il credito sarà esaurito."
                  }
                </p>
              </div>
            </div>
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
    </main>
  )
}
