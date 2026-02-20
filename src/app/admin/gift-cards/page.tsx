"use client"

import { useEffect, useState } from "react"
import Link from "next/link"
import { Logo } from "@/components/Logo"
import { QRScanner } from "@/components/QRScanner"
import {
  ArrowLeft,
  Search,
  X,
  Trash2,
  History,
  RotateCcw,
  QrCode,
} from "lucide-react"

interface Transaction {
  id: string
  amount: number
  type: string
  note: string | null
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
  const [selectedGiftCard, setSelectedGiftCard] = useState<GiftCard | null>(
    null
  )
  const [useAmount, setUseAmount] = useState<Record<string, string>>({})
  const [showScanner, setShowScanner] = useState(false)

  useEffect(() => {
    fetchGiftCards()
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

  const handleUseGiftCard = async (id: string, amount: number) => {
    if (!amount || amount <= 0) return

    const res = await fetch("/api/admin/gift-cards/use", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id, amount }),
    })

    if (res.ok) {
      setUseAmount((prev) => ({ ...prev, [id]: "" }))
      fetchGiftCards()
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

  const activeCount = giftCards.filter((gc) => !gc.isArchived).length
  const archivedCount = giftCards.filter((gc) => gc.isArchived).length

  const filteredGiftCards = giftCards
    .filter((gc) =>
      activeTab === "active" ? !gc.isArchived : gc.isArchived
    )
    .filter(
      (gc) =>
        gc.code.toLowerCase().includes(searchQuery.toLowerCase()) ||
        gc.order.email.toLowerCase().includes(searchQuery.toLowerCase()) ||
        gc.order.orderNumber
          .toLowerCase()
          .includes(searchQuery.toLowerCase()) ||
        (gc.order.phone &&
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
          <Logo variant="solo" className="h-3 w-auto ml-auto" />
        </div>
      </header>

      <div className="p-4">
        {/* Search + QR */}
        <div className="relative mb-4">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-brand-gray" />
          <input
            type="text"
            placeholder="Cerca per codice, email, telefono o numero ordine..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="input-field pl-12 pr-12"
          />
          <button
            onClick={() => setShowScanner(true)}
            className="absolute right-3 top-1/2 -translate-y-1/2 p-2 text-brand-primary hover:bg-brand-primary/10 rounded-full transition-colors"
            title="Scansiona QR Code"
          >
            <QrCode className="w-5 h-5" />
          </button>
        </div>

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
          {filteredGiftCards.map((gc) => (
            <div
              key={gc.id}
              className="bg-white rounded-2xl shadow-card p-4"
            >
              {/* Header: Codice */}
              <div className="flex items-center justify-between mb-3">
                <h3 className="font-mono text-title-md font-bold text-brand-dark break-all">
                  {gc.code}
                </h3>
                {gc.transactions.length > 0 && (
                  <button
                    onClick={() => setSelectedGiftCard(gc)}
                    className="flex items-center gap-1 text-brand-primary text-label-md hover:underline"
                  >
                    <History className="w-4 h-4" />
                    {gc.transactions.length} trans.
                  </button>
                )}
              </div>

              {/* Info Cliente */}
              <div className="space-y-1 mb-3">
                <p className="text-body-sm text-brand-dark">
                  <span className="text-brand-gray">Cliente:</span>{" "}
                  {gc.order.email}
                </p>
                {gc.order.phone && (
                  <p className="text-body-sm text-brand-dark">
                    <span className="text-brand-gray">Tel:</span>{" "}
                    {gc.order.phone}
                  </p>
                )}
                <p className="text-body-sm text-brand-dark">
                  <span className="text-brand-gray">Ordine:</span> #
                  {gc.order.orderNumber} •{" "}
                  {new Date(gc.purchasedAt).toLocaleDateString("it-IT")}
                </p>
              </div>

              {/* Valori */}
              <div className="flex items-center justify-between bg-brand-cream rounded-xl p-3 mb-3">
                <div>
                  <span className="text-label-sm text-brand-gray">Residuo</span>
                  <p
                    className={`text-headline-sm font-bold ${
                      gc.remainingValue > 0
                        ? "text-brand-primary"
                        : "text-brand-gray"
                    }`}
                  >
                    {gc.remainingValue.toFixed(2)}€
                  </p>
                </div>
                <div className="text-right">
                  <span className="text-label-sm text-brand-gray">
                    Valore iniziale
                  </span>
                  <p className="text-body-md text-brand-dark">
                    {gc.initialValue.toFixed(2)}€
                  </p>
                </div>
              </div>

              {/* Use Form - Solo per attive */}
              {activeTab === "active" && gc.remainingValue > 0 && (
                <div className="flex items-center gap-2">
                  <input
                    type="number"
                    min="0.01"
                    max={gc.remainingValue}
                    step="0.01"
                    placeholder="Importo"
                    value={useAmount[gc.id] || ""}
                    onChange={(e) =>
                      setUseAmount((prev) => ({
                        ...prev,
                        [gc.id]: e.target.value,
                      }))
                    }
                    className="input-field py-2 w-28"
                  />
                  <button
                    onClick={() =>
                      handleUseGiftCard(gc.id, parseFloat(useAmount[gc.id]))
                    }
                    disabled={
                      !useAmount[gc.id] || parseFloat(useAmount[gc.id]) <= 0
                    }
                    className="btn-primary py-2 text-label-md disabled:opacity-50"
                  >
                    Usa
                  </button>
                </div>
              )}

              {/* Badge Archiviata */}
              {gc.isArchived && (
                <div className="flex items-center gap-2 mt-2 text-brand-gray">
                  <RotateCcw className="w-4 h-4" />
                  <span className="text-label-sm">
                    Esaurita • Clicca su &quot;{gc.transactions.length} trans.&quot; per
                    ripristinare
                  </span>
                </div>
              )}
            </div>
          ))}

          {filteredGiftCards.length === 0 && (
            <p className="text-center text-brand-gray py-12">
              Nessuna gift card {activeTab === "active" ? "attiva" : "archiviata"} trovata
            </p>
          )}
        </div>
      </div>

      {/* Modal Transazioni */}
      {selectedGiftCard && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50">
          <div className="bg-white rounded-3xl p-6 w-full max-w-md max-h-[90vh] overflow-y-auto">
            {/* Header Modal */}
            <div className="flex items-center justify-between mb-4">
              <div>
                <h2 className="text-headline-sm font-bold text-brand-dark">
                  Transazioni
                </h2>
                <p className="font-mono text-label-md text-brand-gray">
                  {selectedGiftCard.code}
                </p>
              </div>
              <button
                onClick={() => setSelectedGiftCard(null)}
                className="p-2"
              >
                <X className="w-6 h-6 text-brand-gray" />
              </button>
            </div>

            {/* Residuo attuale */}
            <div className="bg-brand-cream rounded-xl p-4 mb-6">
              <div className="flex items-center justify-between">
                <div>
                  <span className="text-label-sm text-brand-gray">Residuo</span>
                  <p
                    className={`text-headline-sm font-bold ${
                      selectedGiftCard.remainingValue > 0
                        ? "text-brand-primary"
                        : "text-brand-gray"
                    }`}
                  >
                    {selectedGiftCard.remainingValue.toFixed(2)}€
                  </p>
                </div>
                {selectedGiftCard.isArchived && (
                  <span className="px-3 py-1 bg-gray-100 text-gray-600 text-label-sm rounded-full">
                    Archiviata
                  </span>
                )}
              </div>
            </div>

            {/* Lista Transazioni */}
            <div className="space-y-3">
              {selectedGiftCard.transactions.length === 0 ? (
                <p className="text-center text-brand-gray py-4">
                  Nessuna transazione
                </p>
              ) : (
                selectedGiftCard.transactions.map((transaction) => (
                  <div
                    key={transaction.id}
                    className="flex items-center justify-between p-3 bg-brand-light-gray/50 rounded-xl"
                  >
                    <div>
                      <p className="text-body-sm font-medium text-brand-dark">
                        -{transaction.amount.toFixed(2)}€
                      </p>
                      <p className="text-label-sm text-brand-gray">
                        {new Date(transaction.createdAt).toLocaleString("it-IT", {
                          day: "2-digit",
                          month: "2-digit",
                          year: "numeric",
                          hour: "2-digit",
                          minute: "2-digit",
                        })}
                      </p>
                      {transaction.note && (
                        <p className="text-label-sm text-brand-gray italic">
                          {transaction.note}
                        </p>
                      )}
                    </div>
                    <button
                      onClick={() =>
                        handleDeleteTransaction(
                          transaction.id,
                          selectedGiftCard.id
                        )
                      }
                      className="p-2 text-red-500 hover:bg-red-50 rounded-full transition-colors"
                      title="Elimina transazione e ripristina credito"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                ))
              )}
            </div>

            {/* Info ripristino */}
            {selectedGiftCard.transactions.length > 0 && (
              <p className="text-label-sm text-brand-gray mt-4 text-center">
                Elimina una transazione per ripristinare il credito
              </p>
            )}
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
