"use client"

import { useEffect, useState, useMemo } from "react"
import Link from "next/link"
import { 
  ArrowLeft, 
  Calendar, 
  ChevronLeft, 
  ChevronRight, 
  Gift,
  CreditCard,
  FileSpreadsheet,
  Printer,
  Receipt,
  User,
  Search,
  X,
  Camera,
  Download,
  History,
} from "lucide-react"
import * as XLSX from "xlsx"
import { PDFDocument, rgb, StandardFonts } from "pdf-lib"

interface GiftCardOrder {
  email: string
  orderNumber: string
  phone: string | null
}

interface GiftCard {
  id: string
  code: string
  initialValue: number
  remainingValue: number
  isActive: boolean
  isArchived: boolean
  purchasedAt: string
  order: GiftCardOrder
}

interface Transaction {
  id: string
  amount: number
  type: string
  note: string | null
  receiptNumber: string | null
  receiptImage: string | null
  createdAt: string
  giftCard: GiftCard
}

export default function GiftCardsMonthlyReportPage() {
  const [transactions, setTransactions] = useState<Transaction[]>([])
  const [loading, setLoading] = useState(true)
  const [selectedDate, setSelectedDate] = useState(() => {
    const now = new Date()
    return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`
  })
  const [searchQuery, setSearchQuery] = useState("")
  const [fullscreenImage, setFullscreenImage] = useState<{url: string, receiptNumber: string | null} | null>(null)

  useEffect(() => {
    fetchTransactions()
  }, [selectedDate])

  const fetchTransactions = async () => {
    setLoading(true)
    try {
      const [year, month] = selectedDate.split('-').map(Number)
      const res = await fetch(`/api/admin/gift-cards/transactions/monthly?year=${year}&month=${month}`)
      const data = await res.json()
      if (res.ok) {
        setTransactions(data)
      } else {
        console.error("Error fetching transactions:", data.error)
      }
    } catch (error) {
      console.error("Error fetching transactions:", error)
    } finally {
      setLoading(false)
    }
  }

  const filteredTransactions = useMemo(() => {
    if (!searchQuery.trim()) return transactions
    
    const query = searchQuery.toLowerCase()
    return transactions.filter(t => 
      t.giftCard.code.toLowerCase().includes(query) ||
      t.giftCard.order.email.toLowerCase().includes(query) ||
      t.receiptNumber?.toLowerCase().includes(query) ||
      t.note?.toLowerCase().includes(query)
    )
  }, [transactions, searchQuery])

  const totals = useMemo(() => {
    const totalUsed = filteredTransactions.reduce((sum, t) => sum + t.amount, 0)
    const uniqueGiftCards = new Set(filteredTransactions.map(t => t.giftCard.id)).size
    const uniqueCustomers = new Set(filteredTransactions.map(t => t.giftCard.order.email)).size
    return { totalUsed, uniqueGiftCards, uniqueCustomers }
  }, [filteredTransactions])

  const handleMonthChange = (direction: 'prev' | 'next') => {
    const [year, month] = selectedDate.split('-').map(Number)
    const current = new Date(year, month - 1, 1)
    if (direction === 'prev') {
      current.setMonth(current.getMonth() - 1)
    } else {
      current.setMonth(current.getMonth() + 1)
    }
    setSelectedDate(`${current.getFullYear()}-${String(current.getMonth() + 1).padStart(2, '0')}`)
  }

  const formatMonthYear = (dateStr: string) => {
    const [y, m] = dateStr.split('-').map(Number)
    return new Date(y, m - 1, 1).toLocaleDateString("it-IT", {
      month: "long",
      year: "numeric",
    })
  }

  const isCurrentMonth = selectedDate === new Date().toISOString().slice(0, 7)

  const exportToExcel = () => {
    if (filteredTransactions.length === 0) return

    const rows: Record<string, string | number>[] = []
    
    filteredTransactions.forEach((t) => {
      rows.push({
        "Data": new Date(t.createdAt).toLocaleDateString("it-IT"),
        "Ora": new Date(t.createdAt).toLocaleTimeString("it-IT", { hour: "2-digit", minute: "2-digit" }),
        "Codice Gift Card": t.giftCard.code,
        "Valore Iniziale": t.giftCard.initialValue,
        "Residuo Pre-Utilizzo": t.giftCard.remainingValue + t.amount,
        "Importo Utilizzato": t.amount,
        "Residuo Post-Utilizzo": t.giftCard.remainingValue,
        "Numero Scontrino": t.receiptNumber || "-",
        "Nota": t.note || "-",
        "Cliente": t.giftCard.order.email,
        "Telefono": t.giftCard.order.phone || "-",
        "Ordine Acquisto": t.giftCard.order.orderNumber,
        "Data Acquisto": new Date(t.giftCard.purchasedAt).toLocaleDateString("it-IT"),
        "Foto Scontrino": t.receiptImage ? "Presente" : "-",
      })
    })
    
    rows.push({})
    rows.push({
      "Data": "TOTALI",
      "Importo Utilizzato": totals.totalUsed,
      "Codice Gift Card": `${totals.uniqueGiftCards} card diverse`,
      "Cliente": `${totals.uniqueCustomers} clienti`,
    })

    const ws = XLSX.utils.json_to_sheet(rows)
    const wb = XLSX.utils.book_new()
    XLSX.utils.book_append_sheet(wb, ws, "Transazioni Gift Card")
    
    const colWidths = [
      { wch: 12 }, { wch: 8 }, { wch: 20 }, { wch: 12 }, { wch: 15 },
      { wch: 15 }, { wch: 15 }, { wch: 15 }, { wch: 25 }, { wch: 25 },
      { wch: 15 }, { wch: 15 }, { wch: 12 }, { wch: 12 }
    ]
    ws['!cols'] = colWidths
    
    XLSX.writeFile(wb, `LoScalo_TransazioniGiftCard_${selectedDate}.xlsx`)
  }

  const generatePDF = async () => {
    if (filteredTransactions.length === 0) return

    const pdfDoc = await PDFDocument.create()
    const font = await pdfDoc.embedFont(StandardFonts.Helvetica)
    const fontBold = await pdfDoc.embedFont(StandardFonts.HelveticaBold)
    
    let page = pdfDoc.addPage([595, 842]) // A4 Portrait
    const { width, height } = page.getSize()
    let y = height - 50
    const margin = 40
    const rowHeight = 14
    
    // Header
    page.drawText("Lo Scalo - Report Transazioni Gift Card", {
      x: margin,
      y,
      size: 18,
      font: fontBold,
      color: rgb(0, 0, 0),
    })
    
    y -= 25
    page.drawText(`Periodo: ${formatMonthYear(selectedDate)}`, {
      x: margin,
      y,
      size: 12,
      font,
      color: rgb(0.4, 0.4, 0.4),
    })
    
    y -= 20
    page.drawText(`Transazioni: ${filteredTransactions.length} | Totale Utilizzato: ${totals.totalUsed.toFixed(2)}€`, {
      x: margin,
      y,
      size: 10,
      font,
      color: rgb(0.4, 0.4, 0.4),
    })
    
    y -= 30
    
    const checkNewPage = (neededSpace: number) => {
      if (y < neededSpace + 60) {
        page = pdfDoc.addPage([595, 842])
        y = height - 50
        return true
      }
      return false
    }
    
    // Per ogni transazione
    for (const t of filteredTransactions) {
      const needsSpace = t.receiptImage ? 200 : 80
      checkNewPage(needsSpace)
      
      // Box transazione
      page.drawRectangle({
        x: margin,
        y: y - 5,
        width: width - margin * 2,
        height: t.receiptImage ? 70 : 55,
        color: rgb(0.97, 0.97, 0.97),
      })
      
      // Data e ora
      const date = new Date(t.createdAt)
      page.drawText(`${date.toLocaleDateString("it-IT")} ${date.toLocaleTimeString("it-IT", { hour: "2-digit", minute: "2-digit" })}`, {
        x: margin + 10,
        y,
        size: 9,
        font,
        color: rgb(0.4, 0.4, 0.4),
      })
      
      // Codice gift card
      page.drawText(t.giftCard.code, {
        x: margin + 10,
        y: y - rowHeight,
        size: 11,
        font: fontBold,
      })
      
      // Importo
      page.drawText(`-${t.amount.toFixed(2)}€`, {
        x: width - margin - 80,
        y: y - 5,
        size: 14,
        font: fontBold,
        color: rgb(0.8, 0.2, 0.2),
      })
      
      y -= rowHeight * 2
      
      // Scontrino
      if (t.receiptNumber) {
        page.drawText(`Scontrino: ${t.receiptNumber}`, {
          x: margin + 10,
          y,
          size: 9,
          font,
          color: rgb(0.2, 0.4, 0.8),
        })
        y -= rowHeight
      }
      
      // Nota
      if (t.note) {
        page.drawText(`Nota: ${t.note.substring(0, 50)}${t.note.length > 50 ? '...' : ''}`, {
          x: margin + 10,
          y,
          size: 8,
          font,
          color: rgb(0.4, 0.4, 0.4),
        })
        y -= rowHeight
      }
      
      // Cliente
      page.drawText(`Cliente: ${t.giftCard.order.email}`, {
        x: margin + 10,
        y,
        size: 8,
        font,
        color: rgb(0.4, 0.4, 0.4),
      })
      y -= rowHeight + 5
      
      // Immagine scontrino se presente
      if (t.receiptImage) {
        try {
          const base64Data = t.receiptImage.split(',')[1]
          if (base64Data) {
            const imageBytes = Uint8Array.from(atob(base64Data), c => c.charCodeAt(0))
            const image = await pdfDoc.embedJpg(imageBytes).catch(() => 
              pdfDoc.embedPng(imageBytes)
            )
            
            const imgWidth = 150
            const imgHeight = (image.height / image.width) * imgWidth
            
            checkNewPage(imgHeight + 20)
            
            page.drawImage(image, {
              x: margin + 10,
              y: y - imgHeight,
              width: imgWidth,
              height: imgHeight,
            })
            y -= imgHeight + 15
          }
        } catch (e) {
          console.error("Error embedding image:", e)
        }
      }
      
      y -= 10
    }
    
    // Totali
    checkNewPage(80)
    
    y -= 10
    page.drawLine({
      start: { x: margin, y },
      end: { x: width - margin, y },
      thickness: 2,
      color: rgb(0, 0, 0),
    })
    
    y -= 25
    page.drawText("TOTALI MESE", {
      x: margin,
      y,
      size: 14,
      font: fontBold,
    })
    
    y -= 20
    page.drawText(`Totale Utilizzato: ${totals.totalUsed.toFixed(2)}€`, {
      x: margin + 20,
      y,
      size: 12,
      font: fontBold,
      color: rgb(0.8, 0.2, 0.2),
    })
    
    y -= 18
    page.drawText(`Gift Card utilizzate: ${totals.uniqueGiftCards}`, {
      x: margin + 20,
      y,
      size: 11,
      font,
    })
    
    y -= 18
    page.drawText(`Clienti diversi: ${totals.uniqueCustomers}`, {
      x: margin + 20,
      y,
      size: 11,
      font,
    })
    
    const pdfBytes = await pdfDoc.save()
    const blob = new Blob([pdfBytes as unknown as ArrayBuffer], { type: "application/pdf" })
    const link = document.createElement("a")
    link.href = URL.createObjectURL(blob)
    link.download = `LoScalo_TransazioniGiftCard_${selectedDate}.pdf`
    link.click()
  }

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
          <Link href="/admin/reports" className="p-2 -ml-2">
            <ArrowLeft className="w-6 h-6 text-brand-dark" />
          </Link>
          <h1 className="text-headline-sm font-bold text-brand-dark absolute left-1/2 -translate-x-1/2">
            Report Gift Card
          </h1>
        </div>
      </header>

      <div className="p-4 max-w-7xl mx-auto">
        {/* Month Navigation */}
        <div className="bg-white rounded-2xl shadow-card p-4 mb-4">
          <div className="flex items-center justify-between">
            <button
              onClick={() => handleMonthChange('prev')}
              className="p-2 rounded-xl hover:bg-brand-light-gray/50 transition-colors"
            >
              <ChevronLeft className="w-6 h-6 text-brand-dark" />
            </button>
            
            <div className="flex items-center gap-2">
              <Calendar className="w-5 h-5 text-brand-primary" />
              <input
                type="month"
                value={selectedDate}
                onChange={(e) => setSelectedDate(e.target.value)}
                className="text-title-md font-bold text-brand-dark bg-transparent border-none focus:outline-none cursor-pointer"
              />
              {isCurrentMonth && (
                <span className="px-2 py-1 bg-brand-primary/10 text-brand-primary text-label-sm rounded-full">
                  Corrente
                </span>
              )}
            </div>

            <button
              onClick={() => handleMonthChange('next')}
              className="p-2 rounded-xl hover:bg-brand-light-gray/50 transition-colors"
            >
              <ChevronRight className="w-6 h-6 text-brand-dark" />
            </button>
          </div>
        </div>

        {/* Summary Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
          <div className="bg-white rounded-2xl shadow-card p-4">
            <div className="flex items-center gap-3 mb-2">
              <div className="w-10 h-10 bg-red-500/10 rounded-xl flex items-center justify-center">
                <History className="w-5 h-5 text-red-500" />
              </div>
              <span className="text-label-md text-brand-gray">Totale Utilizzato</span>
            </div>
            <p className="text-headline-lg font-bold text-brand-dark">
              {totals.totalUsed.toFixed(2)}€
            </p>
          </div>

          <div className="bg-white rounded-2xl shadow-card p-4">
            <div className="flex items-center gap-3 mb-2">
              <div className="w-10 h-10 bg-green-500/10 rounded-xl flex items-center justify-center">
                <Gift className="w-5 h-5 text-green-500" />
              </div>
              <span className="text-label-md text-brand-gray">Gift Card Usate</span>
            </div>
            <p className="text-headline-lg font-bold text-brand-dark">
              {totals.uniqueGiftCards}
            </p>
          </div>

          <div className="bg-white rounded-2xl shadow-card p-4">
            <div className="flex items-center gap-3 mb-2">
              <div className="w-10 h-10 bg-blue-500/10 rounded-xl flex items-center justify-center">
                <User className="w-5 h-5 text-blue-500" />
              </div>
              <span className="text-label-md text-brand-gray">Clienti</span>
            </div>
            <p className="text-headline-lg font-bold text-brand-dark">
              {totals.uniqueCustomers}
            </p>
          </div>
        </div>

        {/* Search & Export */}
        <div className="bg-white rounded-2xl shadow-card p-4 mb-6">
          <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-4">
            {/* Search */}
            <div className="relative w-full lg:w-96">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-brand-gray" />
              <input
                type="text"
                placeholder="Cerca per codice, email, scontrino..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="input-field pl-12 pr-10 w-full"
              />
              {searchQuery && (
                <button
                  onClick={() => setSearchQuery("")}
                  className="absolute right-3 top-1/2 -translate-y-1/2 p-1 text-brand-gray hover:text-brand-dark hover:bg-brand-light-gray/50 rounded-full transition-colors"
                >
                  <X className="w-4 h-4" />
                </button>
              )}
            </div>
            
            {/* Export Buttons */}
            <div className="flex items-center gap-2 w-full lg:w-auto">
              <button
                onClick={exportToExcel}
                disabled={filteredTransactions.length === 0}
                className="flex-1 lg:flex-none flex items-center justify-center gap-2 px-4 py-2 bg-green-600 text-white rounded-full text-body-sm font-medium hover:bg-green-700 transition-colors disabled:opacity-50"
              >
                <FileSpreadsheet className="w-4 h-4" />
                Excel
              </button>
              <button
                onClick={generatePDF}
                disabled={filteredTransactions.length === 0}
                className="flex-1 lg:flex-none flex items-center justify-center gap-2 px-4 py-2 bg-brand-primary text-white rounded-full text-body-sm font-medium hover:bg-brand-dark transition-colors disabled:opacity-50"
              >
                <Printer className="w-4 h-4" />
                PDF
              </button>
            </div>
          </div>
        </div>

        {/* Transactions List */}
        {filteredTransactions.length > 0 ? (
          <div className="space-y-4">
            <h2 className="text-title-md font-bold text-brand-dark">
              {filteredTransactions.length} {filteredTransactions.length === 1 ? "transazione" : "transazioni"}
            </h2>
            
            {filteredTransactions.map((t) => (
              <div key={t.id} className="bg-white rounded-2xl shadow-card p-4">
                {/* Header: Data e Importo */}
                <div className="flex items-start justify-between mb-4">
                  <div>
                    <div className="flex items-center gap-2 mb-1">
                      <span className="text-label-sm text-brand-gray">
                        {new Date(t.createdAt).toLocaleDateString("it-IT")}
                      </span>
                      <span className="text-label-sm text-brand-gray">
                        {new Date(t.createdAt).toLocaleTimeString("it-IT", { hour: "2-digit", minute: "2-digit" })}
                      </span>
                    </div>
                    <div className="flex items-center gap-2">
                      <CreditCard className="w-4 h-4 text-brand-primary" />
                      <span className="font-mono text-title-sm font-bold text-brand-dark">
                        {t.giftCard.code}
                      </span>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="text-headline-md font-bold text-red-500">
                      -{t.amount.toFixed(2)}€
                    </p>
                    <p className="text-label-sm text-brand-gray">
                      Residuo: {t.giftCard.remainingValue.toFixed(2)}€
                    </p>
                  </div>
                </div>
                
                {/* Dettagli */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 bg-brand-cream rounded-xl p-4">
                  {/* Info Gift Card */}
                  <div className="space-y-2">
                    <h4 className="text-label-sm font-bold text-brand-gray uppercase">
                      Dati Gift Card
                    </h4>
                    <div className="space-y-1">
                      <p className="text-body-sm">
                        <span className="text-brand-gray">Valore iniziale:</span>{" "}
                        <span className="font-medium">{t.giftCard.initialValue.toFixed(2)}€</span>
                      </p>
                      <p className="text-body-sm">
                        <span className="text-brand-gray">Acquistata il:</span>{" "}
                        <span className="font-medium">
                          {new Date(t.giftCard.purchasedAt).toLocaleDateString("it-IT")}
                        </span>
                      </p>
                      <p className="text-body-sm">
                        <span className="text-brand-gray">Ordine:</span>{" "}
                        <span className="font-medium">#{t.giftCard.order.orderNumber}</span>
                      </p>
                    </div>
                  </div>
                  
                  {/* Info Cliente */}
                  <div className="space-y-2">
                    <h4 className="text-label-sm font-bold text-brand-gray uppercase">
                      Cliente
                    </h4>
                    <div className="space-y-1">
                      <p className="text-body-sm">
                        <span className="text-brand-gray">Email:</span>{" "}
                        <span className="font-medium">{t.giftCard.order.email}</span>
                      </p>
                      {t.giftCard.order.phone && (
                        <p className="text-body-sm">
                          <span className="text-brand-gray">Tel:</span>{" "}
                          <span className="font-medium">{t.giftCard.order.phone}</span>
                        </p>
                      )}
                    </div>
                  </div>
                </div>
                
                {/* Scontrino e Nota */}
                {(t.receiptNumber || t.note || t.receiptImage) && (
                  <div className="mt-4 space-y-3">
                    {t.receiptNumber && (
                      <div className="flex items-center gap-2 text-body-sm">
                        <Receipt className="w-4 h-4 text-blue-500" />
                        <span className="text-brand-gray">Scontrino:</span>
                        <span className="font-medium text-blue-600">{t.receiptNumber}</span>
                      </div>
                    )}
                    
                    {t.note && (
                      <div className="flex items-start gap-2 text-body-sm">
                        <span className="text-brand-gray">Nota:</span>
                        <span className="font-medium">{t.note}</span>
                      </div>
                    )}
                    
                    {t.receiptImage && (
                      <div className="flex items-center gap-2">
                        <Camera className="w-4 h-4 text-green-500" />
                        <span className="text-label-sm text-brand-gray">Foto scontrino:</span>
                        <img
                          src={t.receiptImage}
                          alt="Scontrino"
                          className="h-20 w-auto object-contain rounded-lg border border-brand-light-gray cursor-pointer hover:opacity-80"
                          onClick={() => setFullscreenImage({ 
                            url: t.receiptImage!, 
                            receiptNumber: t.receiptNumber 
                          })}
                        />
                      </div>
                    )}
                  </div>
                )}
              </div>
            ))}
          </div>
        ) : (
          <div className="bg-white rounded-2xl shadow-card p-12 text-center">
            <Gift className="w-12 h-12 text-brand-gray mx-auto mb-4" />
            <p className="text-body-lg text-brand-gray">
              Nessuna transazione gift card per {formatMonthYear(selectedDate)}
            </p>
            {searchQuery && (
              <p className="text-body-sm text-brand-gray/60 mt-2">
                Prova a modificare la ricerca
              </p>
            )}
          </div>
        )}
      </div>

      {/* Fullscreen Image Modal */}
      {fullscreenImage && (
        <div 
          className="fixed inset-0 z-[60] bg-black/90 flex items-center justify-center p-4"
          onClick={() => setFullscreenImage(null)}
        >
          <div className="relative max-w-full max-h-full">
            {/* Header */}
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
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>
            
            {/* Image */}
            <img
              src={fullscreenImage.url}
              alt="Scontrino"
              className="max-w-full max-h-[90vh] object-contain rounded-lg"
              onClick={(e) => e.stopPropagation()}
            />
          </div>
        </div>
      )}
    </main>
  )
}
