"use client"

import { useEffect, useState, useMemo, useCallback } from "react"
import Link from "next/link"
import { 
  ArrowLeft, 
  Calendar, 
  ChevronLeft, 
  ChevronRight, 
  Gift,
  FileSpreadsheet,
  Printer,
  User,
  Search,
  X,
  Clock,
  AlertCircle,
} from "lucide-react"
import * as XLSX from "xlsx"
import { PDFDocument, rgb, StandardFonts } from "pdf-lib"

interface GiftCardOrder {
  email: string
  orderNumber: string
  phone: string | null
  paidAt: string | null
}

interface GiftCardTransaction {
  id: string
  amount: number
  type: string
  note: string | null
  receiptNumber: string | null
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
  purchasedAt: string
  expiresAt: string | null
  order: GiftCardOrder
  transactions: GiftCardTransaction[]
}

export default function ExpiredGiftCardsReportPage() {
  const [giftCards, setGiftCards] = useState<GiftCard[]>([])
  const [loading, setLoading] = useState(true)
  const [selectedDate, setSelectedDate] = useState(() => {
    const now = new Date()
    return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`
  })
  const [searchQuery, setSearchQuery] = useState("")

  const fetchExpiredGiftCards = useCallback(async () => {
    setLoading(true)
    try {
      const [year, month] = selectedDate.split('-').map(Number)
      const res = await fetch(`/api/admin/gift-cards/expired/monthly?year=${year}&month=${month}`)
      const data = await res.json()
      if (res.ok) {
        setGiftCards(data)
      } else {
        console.error("Error fetching expired gift cards:", data.error)
      }
    } catch (error) {
      console.error("Error fetching expired gift cards:", error)
    } finally {
      setLoading(false)
    }
  }, [selectedDate])

  useEffect(() => {
    fetchExpiredGiftCards()
  }, [fetchExpiredGiftCards])

  const filteredGiftCards = useMemo(() => {
    if (!searchQuery.trim()) return giftCards
    
    const query = searchQuery.toLowerCase()
    return giftCards.filter(g => 
      g.code.toLowerCase().includes(query) ||
      g.order.email.toLowerCase().includes(query) ||
      g.order.orderNumber.toLowerCase().includes(query)
    )
  }, [giftCards, searchQuery])

  const totals = useMemo(() => {
    const totalInitialValue = filteredGiftCards.reduce((sum, g) => sum + g.initialValue, 0)
    const totalUnusedBalance = filteredGiftCards.reduce((sum, g) => sum + g.remainingValue, 0)
    const totalUsed = filteredGiftCards.reduce((sum, g) => sum + (g.initialValue - g.remainingValue), 0)
    const uniqueCustomers = new Set(filteredGiftCards.map(g => g.order.email)).size
    return { totalInitialValue, totalUnusedBalance, totalUsed, uniqueCustomers }
  }, [filteredGiftCards])

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
    if (filteredGiftCards.length === 0) return

    const rows: Record<string, string | number>[] = []
    
    filteredGiftCards.forEach((g) => {
      const expiryDate = g.expiresAt ? new Date(g.expiresAt) : null
      const purchaseDate = new Date(g.purchasedAt)
      const usedAmount = g.initialValue - g.remainingValue
      
      rows.push({
        "Codice Gift Card": g.code,
        "Valore Iniziale": g.initialValue,
        "Importo Utilizzato": usedAmount,
        "Residuo Non Utilizzato": g.remainingValue,
        "Data Acquisto": purchaseDate.toLocaleDateString("it-IT"),
        "Data Scadenza": expiryDate ? expiryDate.toLocaleDateString("it-IT") : "-",
        "Cliente": g.order.email,
        "Telefono": g.order.phone || "-",
        "Ordine Acquisto": g.order.orderNumber,
        "Numero Transazioni": g.transactions.length,
      })
    })
    
    rows.push({})
    rows.push({
      "Codice Gift Card": "TOTALI",
      "Valore Iniziale": totals.totalInitialValue,
      "Importo Utilizzato": totals.totalUsed,
      "Residuo Non Utilizzato": totals.totalUnusedBalance,
      "Cliente": `${totals.uniqueCustomers} clienti`,
    })

    const ws = XLSX.utils.json_to_sheet(rows)
    const wb = XLSX.utils.book_new()
    XLSX.utils.book_append_sheet(wb, ws, "Gift Card Scadute")
    
    const colWidths = [
      { wch: 20 }, { wch: 15 }, { wch: 15 }, { wch: 20 }, { wch: 15 },
      { wch: 15 }, { wch: 30 }, { wch: 15 }, { wch: 15 }, { wch: 18 }
    ]
    ws['!cols'] = colWidths
    
    XLSX.writeFile(wb, `LoScalo_GiftCardScadute_${selectedDate}.xlsx`)
  }

  const generatePDF = async () => {
    if (filteredGiftCards.length === 0) return

    const pdfDoc = await PDFDocument.create()
    const font = await pdfDoc.embedFont(StandardFonts.Helvetica)
    const fontBold = await pdfDoc.embedFont(StandardFonts.HelveticaBold)
    
    let page = pdfDoc.addPage([842, 595]) // A4 Landscape
    const { width, height } = page.getSize()
    let y = height - 50
    const margin = 40
    
    // Header
    page.drawText("Lo Scalo - Report Gift Card Scadute", {
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
    page.drawText(`Gift Card Scadute: ${filteredGiftCards.length} | Residuo Totale: ${totals.totalUnusedBalance.toFixed(2)}€`, {
      x: margin,
      y,
      size: 10,
      font,
      color: rgb(0.4, 0.4, 0.4),
    })
    
    y -= 35
    
    const checkNewPage = (neededSpace: number) => {
      if (y < neededSpace + margin) {
        page = pdfDoc.addPage([842, 595])
        y = height - 50
        return true
      }
      return false
    }
    
    // Table Header
    const colWidths = [30, 140, 80, 80, 80, 80, 200, 200]
    const headers = ["#", "Codice", "Valore Iniz.", "Utilizzato", "Residuo", "Data Scad.", "Cliente", "Ordine"]
    
    page.drawRectangle({
      x: margin,
      y: y - 10,
      width: width - margin * 2,
      height: 25,
      color: rgb(0.95, 0.95, 0.95),
    })
    
    let x = margin + 10
    headers.forEach((header, i) => {
      page.drawText(header, {
        x,
        y: y - 2,
        size: 10,
        font: fontBold,
        color: rgb(0.2, 0.2, 0.2),
      })
      x += colWidths[i]
    })
    
    y -= 35
    
    // Table Rows
    filteredGiftCards.forEach((g, index) => {
      const expiryDate = g.expiresAt ? new Date(g.expiresAt) : null
      const usedAmount = g.initialValue - g.remainingValue
      
      checkNewPage(30)
      
      // Alternating background
      if (index % 2 === 0) {
        page.drawRectangle({
          x: margin,
          y: y - 5,
          width: width - margin * 2,
          height: 25,
          color: rgb(0.98, 0.98, 0.98),
        })
      }
      
      x = margin + 10
      
      // Row number
      page.drawText(`${index + 1}`, { x, y, size: 10, font })
      x += colWidths[0]
      
      // Code
      page.drawText(g.code, { x, y, size: 9, font: fontBold })
      x += colWidths[1]
      
      // Initial Value
      page.drawText(`${g.initialValue.toFixed(2)}€`, { x, y, size: 9, font })
      x += colWidths[2]
      
      // Used Amount
      page.drawText(`${usedAmount.toFixed(2)}€`, { x, y, size: 9, font, color: rgb(0.2, 0.6, 0.2) })
      x += colWidths[3]
      
      // Remaining (highlighted in red as it's expired)
      page.drawText(`${g.remainingValue.toFixed(2)}€`, { 
        x, y, size: 10, font: fontBold, color: rgb(0.8, 0.2, 0.2) 
      })
      x += colWidths[4]
      
      // Expiry Date
      page.drawText(
        expiryDate ? expiryDate.toLocaleDateString("it-IT") : "-", 
        { x, y, size: 9, font, color: rgb(0.5, 0.5, 0.5) }
      )
      x += colWidths[5]
      
      // Client Email (truncated)
      const email = g.order.email.length > 35 ? g.order.email.substring(0, 35) + "..." : g.order.email
      page.drawText(email, { x, y, size: 8, font })
      x += colWidths[6]
      
      // Order Number
      page.drawText(g.order.orderNumber, { x, y, size: 8, font, color: rgb(0.5, 0.5, 0.5) })
      
      y -= 25
    })
    
    // Totals
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
    
    y -= 22
    page.drawText(
      `Valore Iniziale: ${totals.totalInitialValue.toFixed(2)}€ | ` +
      `Utilizzato: ${totals.totalUsed.toFixed(2)}€ | ` +
      `Residuo Scaduto: ${totals.totalUnusedBalance.toFixed(2)}€ | ` +
      `Card: ${filteredGiftCards.length} | Clienti: ${totals.uniqueCustomers}`,
      {
        x: margin + 20,
        y,
        size: 11,
        font: fontBold,
        color: rgb(0.8, 0.2, 0.2),
      }
    )
    
    // Note about expired balance becoming revenue
    y -= 25
    page.drawText(
      "Nota: Il residuo non utilizzato delle gift card scadute diventa entrata del bar (come da normativa italiana).",
      {
        x: margin,
        y,
        size: 9,
        font,
        color: rgb(0.5, 0.5, 0.5),
      }
    )
    
    const pdfBytes = await pdfDoc.save()
    const blob = new Blob([pdfBytes as unknown as ArrayBuffer], { type: "application/pdf" })
    const link = document.createElement("a")
    link.href = URL.createObjectURL(blob)
    link.download = `LoScalo_GiftCardScadute_${selectedDate}.pdf`
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
            Report Gift Card Scadute
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
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
          <div className="bg-white rounded-2xl shadow-card p-4">
            <div className="flex items-center gap-3 mb-2">
              <div className="w-10 h-10 bg-red-500/10 rounded-xl flex items-center justify-center">
                <Gift className="w-5 h-5 text-red-500" />
              </div>
              <span className="text-label-md text-brand-gray">Card Scadute</span>
            </div>
            <p className="text-headline-lg font-bold text-brand-dark">
              {filteredGiftCards.length}
            </p>
          </div>

          <div className="bg-white rounded-2xl shadow-card p-4">
            <div className="flex items-center gap-3 mb-2">
              <div className="w-10 h-10 bg-orange-500/10 rounded-xl flex items-center justify-center">
                <Clock className="w-5 h-5 text-orange-500" />
              </div>
              <span className="text-label-md text-brand-gray">Valore Iniziale</span>
            </div>
            <p className="text-headline-lg font-bold text-brand-dark">
              {totals.totalInitialValue.toFixed(2)}€
            </p>
          </div>

          <div className="bg-white rounded-2xl shadow-card p-4">
            <div className="flex items-center gap-3 mb-2">
              <div className="w-10 h-10 bg-gray-100 rounded-xl flex items-center justify-center">
                <AlertCircle className="w-5 h-5 text-gray-600" />
              </div>
              <span className="text-label-md text-brand-gray">Utilizzato</span>
            </div>
            <p className="text-headline-lg font-bold text-brand-dark">
              {totals.totalUsed.toFixed(2)}€
            </p>
          </div>

          <div className="bg-white rounded-2xl shadow-card p-4">
            <div className="flex items-center gap-3 mb-2">
              <div className="w-10 h-10 bg-green-500/10 rounded-xl flex items-center justify-center">
                <AlertCircle className="w-5 h-5 text-green-600" />
              </div>
              <span className="text-label-md text-brand-gray">Residuo Scaduto</span>
            </div>
            <p className="text-headline-lg font-bold text-green-600">
              {totals.totalUnusedBalance.toFixed(2)}€
            </p>
          </div>
        </div>

        {/* Info Box */}
        <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 mb-4">
          <div className="flex items-start gap-3">
            <AlertCircle className="w-5 h-5 text-amber-600 flex-shrink-0 mt-0.5" />
            <div>
              <p className="text-body-sm text-amber-800 font-medium">
                Nota contabile
              </p>
              <p className="text-label-sm text-amber-700">
                Il saldo residuo delle gift card scadute costituisce, per normativa italiana, un ricavo per l&apos;attività. Questo report elenca le card giunte a scadenza nel mese selezionato.
              </p>
              <p className="text-label-sm text-amber-700">
                NOTA BENE: Per garantire l&apos;integrità dei dati, consultare il report solo a mese concluso (a partire dal primo giorno del mese successivo). Le gift card scadute non devono essere eliminate o modificate, poiché costituiscono prova contabile dell&apos;entrata generata.
              </p>
            </div>
          </div>
        </div>

        {/* Search Bar */}
        <div className="bg-white rounded-2xl shadow-card p-4 mb-4">
          <div className="relative">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-brand-gray" />
            <input
              type="text"
              placeholder="Cerca per codice, email, ordine..."
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
        </div>

        {/* Info & Export */}
        <div className="mb-4 space-y-3">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
            <div>
              <h2 className="text-title-md font-bold text-brand-dark">
                {filteredGiftCards.length} {filteredGiftCards.length === 1 ? "gift card scaduta" : "gift card scadute"}
              </h2>
              <p className="text-body-sm text-brand-gray">
                Gift card scadute nel periodo selezionato con residuo non utilizzato
              </p>
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={exportToExcel}
                disabled={filteredGiftCards.length === 0}
                className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-full text-body-sm font-medium hover:bg-green-700 transition-colors disabled:opacity-50"
              >
                <FileSpreadsheet className="w-4 h-4" />
                Export Excel
              </button>
              <button
                onClick={generatePDF}
                disabled={filteredGiftCards.length === 0}
                className="flex items-center gap-2 px-4 py-2 bg-brand-primary text-white rounded-full text-body-sm font-medium hover:bg-brand-dark transition-colors disabled:opacity-50"
              >
                <Printer className="w-4 h-4" />
                Stampa PDF
              </button>
            </div>
          </div>
        </div>

        {/* Gift Cards Table */}
        {filteredGiftCards.length > 0 ? (
          <div className="bg-white rounded-2xl shadow-card overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-brand-cream border-b border-brand-light-gray">
                  <tr>
                    <th className="text-left py-3 px-4 text-label-md font-bold text-brand-gray">Gift Card</th>
                    <th className="text-left py-3 px-4 text-label-md font-bold text-brand-gray">Cliente</th>
                    <th className="text-right py-3 px-4 text-label-md font-bold text-brand-gray">Valore Iniziale</th>
                    <th className="text-right py-3 px-4 text-label-md font-bold text-brand-gray">Utilizzato</th>
                    <th className="text-right py-3 px-4 text-label-md font-bold text-brand-gray">Residuo Scaduto</th>
                    <th className="text-left py-3 px-4 text-label-md font-bold text-brand-gray">Data Scadenza</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredGiftCards.map((g) => {
                    const expiryDate = g.expiresAt ? new Date(g.expiresAt) : null
                    const purchaseDate = new Date(g.purchasedAt)
                    const usedAmount = g.initialValue - g.remainingValue
                    
                    return (
                      <tr key={g.id} className="border-b border-brand-light-gray/50 last:border-b-0 hover:bg-brand-cream/50">
                        <td className="py-3 px-4">
                          <div className="font-mono text-body-sm font-bold text-brand-dark">
                            {g.code}
                          </div>
                          <div className="text-label-sm text-brand-gray">
                            Acquistata: {purchaseDate.toLocaleDateString("it-IT")}
                          </div>
                          <div className="text-label-sm text-brand-gray">
                            Ordine: {g.order.orderNumber}
                          </div>
                        </td>
                        <td className="py-3 px-4">
                          <div className="flex items-center gap-1 text-body-sm text-brand-dark">
                            <User className="w-3 h-3 text-brand-gray" />
                            {g.order.email}
                          </div>
                          {g.order.phone && (
                            <div className="text-label-sm text-brand-gray">
                              {g.order.phone}
                            </div>
                          )}
                        </td>
                        <td className="py-3 px-4 text-right">
                          <span className="text-body-sm text-brand-gray">
                            {g.initialValue.toFixed(2)}€
                          </span>
                        </td>
                        <td className="py-3 px-4 text-right">
                          <span className="text-body-sm text-brand-dark">
                            {usedAmount.toFixed(2)}€
                          </span>
                          {g.transactions.length > 0 && (
                            <div className="text-label-sm text-brand-gray">
                              {g.transactions.length} trans.
                            </div>
                          )}
                        </td>
                        <td className="py-3 px-4 text-right">
                          <span className="text-headline-sm font-bold text-green-600">
                            {g.remainingValue.toFixed(2)}€
                          </span>
                        </td>
                        <td className="py-3 px-4">
                          <div className="flex items-center gap-1 text-body-sm text-brand-gray">
                            <Clock className="w-3 h-3" />
                            {expiryDate ? expiryDate.toLocaleDateString("it-IT") : "-"}
                          </div>
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
                <tfoot className="bg-brand-cream border-t-2 border-brand-light-gray">
                  <tr>
                    <td colSpan={2} className="py-4 px-4 text-right">
                      <span className="text-title-md font-bold text-brand-dark">TOTALE:</span>
                    </td>
                    <td className="py-4 px-4 text-right">
                      <div className="text-title-md font-bold text-brand-dark">
                        {totals.totalInitialValue.toFixed(2)}€
                      </div>
                    </td>
                    <td className="py-4 px-4 text-right">
                      <div className="text-title-md font-bold text-brand-dark">
                        {totals.totalUsed.toFixed(2)}€
                      </div>
                    </td>
                    <td className="py-4 px-4 text-right">
                      <div className="text-headline-md font-bold text-green-600">
                        {totals.totalUnusedBalance.toFixed(2)}€
                      </div>
                      <div className="text-label-sm text-brand-gray">
                        Residuo scaduto
                      </div>
                    </td>
                    <td className="py-4 px-4">
                      <div className="text-label-sm text-brand-gray">
                        {filteredGiftCards.length} card • {totals.uniqueCustomers} clienti
                      </div>
                    </td>
                  </tr>
                </tfoot>
              </table>
            </div>
          </div>
        ) : (
          <div className="bg-white rounded-2xl shadow-card p-12 text-center">
            <Gift className="w-12 h-12 text-brand-gray mx-auto mb-4" />
            <p className="text-body-lg text-brand-gray">
              Nessuna gift card scaduta per {formatMonthYear(selectedDate)}
            </p>
            {searchQuery && (
              <p className="text-body-sm text-brand-gray/60 mt-2">
                Prova a modificare la ricerca
              </p>
            )}
          </div>
        )}
      </div>
    </main>
  )
}
