"use client"

import { useEffect, useState, useMemo, useCallback } from "react"
import Link from "next/link"
import Image from "next/image"
import { 
  ArrowLeft, 
  Calendar, 
  ChevronLeft, 
  ChevronRight, 
  Gift,
  FileSpreadsheet,
  Printer,
  Receipt,
  User,
  Search,
  X,
  Camera,
  Download,
  History,
  MinusCircle,
  CreditCard,
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
    now.setMonth(now.getMonth() - 1)
    return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`
  })
  const [searchQuery, setSearchQuery] = useState("")
  const [fullscreenImage, setFullscreenImage] = useState<{url: string, receiptNumber: string | null} | null>(null)

  const fetchTransactions = useCallback(async () => {
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
  }, [selectedDate])

  useEffect(() => {
    fetchTransactions()
  }, [fetchTransactions])

  const filteredTransactions = useMemo(() => {
    if (!searchQuery.trim()) return transactions
    
    const query = searchQuery.toLowerCase()
    return transactions.filter(t => 
      t.giftCard.code.toLowerCase().includes(query) ||
      t.giftCard.order?.email?.toLowerCase().includes(query) ||
      t.receiptNumber?.toLowerCase().includes(query) ||
      t.note?.toLowerCase().includes(query)
    )
  }, [transactions, searchQuery])

  const totals = useMemo(() => {
    const totalUsed = filteredTransactions.reduce((sum, t) => sum + t.amount, 0)
    const uniqueGiftCards = new Set(filteredTransactions.map(t => t.giftCard.id)).size
    const uniqueCustomers = new Set(filteredTransactions.map(t => t.giftCard.order?.email).filter(Boolean)).size
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
    
    // Data rows
    filteredTransactions.forEach((t) => {
      rows.push({
        "Data": new Date(t.giftCard.purchasedAt).toLocaleDateString("it-IT"),
        "Ora": new Date(t.giftCard.purchasedAt).toLocaleTimeString("it-IT", { hour: "2-digit", minute: "2-digit" }),
        "Codice Gift Card": t.giftCard.code,
        "Importo Utilizzato": -t.amount,
        "Numero Scontrino": t.receiptNumber || "-",
        "Nota": t.note || "-",
        "Foto Scontrino": t.receiptImage ? "Presente" : "-",
      })
    })
    
    // Riepilogo
    rows.push({})
    rows.push({"Data": "=== RIEPILOGO ==="})
    rows.push({
      "Data": "Totale Utilizzato:",
      "Importo Utilizzato": -totals.totalUsed,
    })
    rows.push({
      "Data": "Gift Card Usate:",
      "Codice Gift Card": totals.uniqueGiftCards,
    })

    const ws = XLSX.utils.json_to_sheet(rows)
    const wb = XLSX.utils.book_new()
    XLSX.utils.book_append_sheet(wb, ws, "Transazioni Gift Card")
    
    const colWidths = [
      { wch: 12 }, { wch: 8 }, { wch: 20 }, { wch: 15 },
      { wch: 15 }, { wch: 25 }, { wch: 12 }, { wch: 12 }
    ]
    ws['!cols'] = colWidths

    const range = XLSX.utils.decode_range(ws['!ref'] || "A1");
    for (let R = range.s.r + 1; R <= range.e.r; ++R) {
      [3].forEach(colIdx => {
        const cellAddress = XLSX.utils.encode_cell({ r: R, c: colIdx });
        const cell = ws[cellAddress];

        if (cell) {
          cell.t = 'n'; // 'n' sta per number
          cell.z = '#,##0.00 €'; // Questo è il formato numerico di Excel
        }
      });
    }
    
    XLSX.writeFile(wb, `LoScalo_TransazioniGiftCard_${selectedDate}.xlsx`)
  }

  const generatePDF = async () => {
    if (filteredTransactions.length === 0) return

    const pdfDoc = await PDFDocument.create()
    const font = await pdfDoc.embedFont(StandardFonts.Helvetica)
    const fontBold = await pdfDoc.embedFont(StandardFonts.HelveticaBold)
    
    let page = pdfDoc.addPage([842, 595])
    const { width, height } = page.getSize()
    let y = height - 50
    const margin = 40
    const rowHeight = 14
    const colWidths = [120, 150, 140, 250]
    const colPositions = colWidths.reduce((acc, w, i) => {
      acc.push((acc[i - 1] || margin - 5) + w)
      return acc
    }, [] as number[])
    
    // Header
    page.drawText("Lo Scalo - Report Transazioni Gift Card", {
      x: margin,
      y,
      size: 16,
      font: fontBold,
      color: rgb(0, 0, 0),
    })
    
    y -= 22
    page.drawText(`Periodo: ${formatMonthYear(selectedDate)}`, {
      x: margin,
      y,
      size: 11,
      font,
      color: rgb(0.4, 0.4, 0.4),
    })
    
    y -= 18
    page.drawText(`Transazioni: ${filteredTransactions.length} | Totale Utilizzato: ${totals.totalUsed.toFixed(2)}€`, {
      x: margin,
      y,
      size: 9,
      font,
      color: rgb(0.4, 0.4, 0.4),
    })
    
    y -= 25
    
    const checkNewPage = (neededSpace: number) => {
      if (y < neededSpace + 60) {
        page = pdfDoc.addPage([842, 595])
        y = height - 50
        drawHeader()
        return true
      }
      return false
    }
    
    // Header row
    const drawHeader = () => {
      page.drawRectangle({
        x: margin,
        y: y - 5,
        width: width - margin * 2,
        height: 20,
        color: rgb(0.95, 0.95, 0.9),
      })
      
      const headers = ["Data", "Gift Card", "Dettaglio","", "Importo"]
      headers.forEach((h, i) => {
        page.drawText(h, {
          x: (i === 0 ? margin : colPositions[i - 1]) + 3,
          y,
          size: 8,
          font: fontBold,
          color: rgb(0.2, 0.2, 0.2),
        })
      })
      y -= rowHeight + 10
    }
    
    drawHeader()
    
    // Track transactions with images for later
    const transactionsWithImages: { index: number; t: Transaction }[] = []
    
    // Data rows
    filteredTransactions.forEach((t, index) => {
      checkNewPage(40)
      
      const date = new Date(t.createdAt)
      const dateStr = date.toLocaleDateString("it-IT")
      
      // Data
      page.drawText(dateStr, {
        x: margin,
        y,
        size: 8,
        font,
        color: rgb(0, 0, 0),
      })
      
      // Gift Card Code
      page.drawText(t.giftCard.code, {
        x: colPositions[0],
        y,
        size: 8,
        font: fontBold,
        color: rgb(0, 0, 0),
      })
      
      // Dettaglio (Scontrino/Nota)
      const details = []
      if (t.receiptNumber) details.push(`Scontrino: ${t.receiptNumber}`)
      if (t.note) details.push(t.note)
      if (t.receiptImage) details.push("[Foto]")
      
      const detailText = details.join(" | ")
      page.drawText(detailText, {
        x: colPositions[1],
        y,
        size: 7,
        font,
        color: rgb(0.2, 0.4, 0.8),
      })
      
      const marginExtra = 115;
      const pageWidth = page.getWidth();
      const rightAlignX = pageWidth - marginExtra; 
      const textWidth = fontBold.widthOfTextAtSize(`-${t.amount.toFixed(2)}€`, 9);
        

      // Importo
      page.drawText(`-${t.amount.toFixed(2)}€`, {
        x: rightAlignX - textWidth,
        y,
        size: 9,
        font: fontBold,
        color: rgb(0.8, 0.2, 0.2),
      })
      
      
      // Track if has image
      if (t.receiptImage) {
        transactionsWithImages.push({ index: index + 1, t })
      }
      
      page.drawLine({
        start: { x: 40, y: y+10 },
        end: { x: 802, y: y+10 },
        thickness: 0.5,
        color: rgb(0.75, 0.75, 0.75),
        opacity: 0.8,
      })
      
      y -= rowHeight + 10
    })
    
    // Totals
    checkNewPage(100)
    
    y -= 10
    page.drawLine({
      start: { x: margin, y },
      end: { x: width - margin, y },
      thickness: 1,
      color: rgb(0.7, 0.7, 0.7),
    })
    
    y -= 20
    page.drawText("RIEPILOGO", {
      x: margin,
      y,
      size: 11,
      font: fontBold,
      color: rgb(0, 0, 0),
    })
    
    y -= 18
    page.drawText(`Totale Utilizzato:`, {
      x: margin,
      y,
      size: 10,
      font,
      color: rgb(0.8, 0.2, 0.2),
    })
    page.drawText(`-${totals.totalUsed.toFixed(2)}€`, {
      x: margin + 170,
      y,
      size: 10,
      font: fontBold,
      color: rgb(0.8, 0.2, 0.2),
    })
    
    y -= 16
    page.drawText(`Gift Card Usate:`, {
      x: margin,
      y,
      size: 10,
      font,
      color: rgb(0.6, 0.2, 0.6),
    })
    page.drawText(`${totals.uniqueGiftCards}`, {
      x: margin + 199,
      y,
      size: 10,
      font: fontBold,
      color: rgb(0.6, 0.2, 0.6),
    })
    
    // Add Receipt Images section if any
    if (transactionsWithImages.length > 0) {
      page = pdfDoc.addPage([842, 595])
      y = height - 50
      
      page.drawText("Foto Scontrini", {
        x: margin,
        y,
        size: 18,
        font: fontBold,
        color: rgb(0, 0, 0),
      })
      
      y -= 30


      let currentColumn = 0; // 0 per sinistra, 1 per destra
      const columnWidth = (pdfDoc.getPage(0).getWidth() - (margin * 3)) / 2; // Spazio disponibile per colonna
      let rowMaxHeight = 0; // Per gestire immagini di altezze diverse nella stessa riga

      for (const { index, t } of transactionsWithImages) {
        if (!t.receiptImage) continue;

        try {
          const base64Data = t.receiptImage.split(',')[1];
          if (base64Data) {
            const imageBytes = Uint8Array.from(atob(base64Data), c => c.charCodeAt(0));
            const image = await pdfDoc.embedJpg(imageBytes).catch(() => pdfDoc.embedPng(imageBytes));

            // Calcolo dimensioni per la colonna
            const imgWidth = image.width > columnWidth ? columnWidth - 50 : image.width - 50;
            const imgHeight = (image.height / image.width) * imgWidth;
            
            // Calcolo posizione X in base alla colonna
            const xPos = margin + (currentColumn * (columnWidth + margin));

            // Controllo cambio pagina: se l'altezza dell'immagine + testi supera lo spazio rimanente
            // Nota: +60 è un buffer per i testi sopra l'immagine
            if (y - imgHeight - 60 < margin) {
              page = pdfDoc.addPage([842, 595]);
              y = height - 50;
              currentColumn = 0;
              rowMaxHeight = 0;
            }

            // Testo Intestazione
            page.drawText(`Riga ${index} | GiftCard ${t.giftCard.code}`, {
              x: xPos,
              y: y,
              size: 10,
              font: fontBold,
              color: rgb(0.2, 0.4, 0.8),
            });

            // Testo Scontrino (opzionale)
            if (t.receiptNumber) {
              page.drawText(`Scontrino: ${t.receiptNumber}`, {
                x: xPos,
                y: y - 15,
                size: 9,
                font,
                color: rgb(0.4, 0.4, 0.4),
              });
            }



            // Disegno Immagine
            page.drawImage(image, {
              x: xPos,
              y: y - 15 - (t.receiptNumber ? 15 : 0) - imgHeight,
              width: imgWidth,
              height: imgHeight,
            });

            // Calcolo l'altezza massima della riga corrente per il salto successivo
            const totalItemHeight = imgHeight + 40; 
            if (totalItemHeight > rowMaxHeight) rowMaxHeight = totalItemHeight;

            // Logica di switch colonna
            if (currentColumn === 0) {
              currentColumn = 1; // Vai a destra
            } else {
              currentColumn = 0; // Torna a sinistra
              y -= rowMaxHeight + 20; // Vai alla riga successiva
              rowMaxHeight = 0; // Reset altezza riga
            }
          }
        } catch (e) {
          console.error("Error embedding image:", e);
        }      
     
      }
    }
    
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
          <Link href="/admin/reports" className="p-2 -ml-2 relative z-10">
            <ArrowLeft className="w-6 h-6 text-brand-dark" />
          </Link>
          <h1 className="text-title-md sm:text-headline-sm font-bold text-brand-dark absolute left-1/2 -translate-x-1/2 text-center w-full px-12">
            Report Transazioni Gift Card
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
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
          <div className="bg-white rounded-2xl shadow-card p-4">
            <div className="flex items-center gap-3 mb-3 pb-2 border-b border-brand-light-gray/50">
              <div className="w-10 h-10 bg-red-500/10 rounded-xl flex items-center justify-center">
                <MinusCircle className="w-5 h-5 text-red-500" />
              </div>
              <span className="text-title-sm font-bold text-red-700">TOTALE UTILIZZATO</span>
            </div>
            <p className="text-headline-lg font-bold text-red-600">
              -{totals.totalUsed.toFixed(2)}€
            </p>
          </div>

          <div className="bg-white rounded-2xl shadow-card p-4">
            <div className="flex items-center gap-3 mb-3 pb-2 border-b border-brand-light-gray/50">
              <div className="w-10 h-10 bg-purple-500/10 rounded-xl flex items-center justify-center">
                <CreditCard className="w-5 h-5 text-purple-500" />
              </div>
              <span className="text-title-sm font-bold text-purple-700">GIFT CARD USATE</span>
            </div>
            <p className="text-headline-lg font-bold text-purple-600">
              {totals.uniqueGiftCards}
            </p>
          </div>
        </div>

        {/* Search Bar */}
        <div className="bg-white rounded-2xl shadow-card p-4 mb-4">
          <div className="relative">
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
        </div>

        {/* Info & Export */}
        <div className="mb-4 space-y-3">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
            <div>
              <h2 className="text-title-md font-bold text-brand-dark">
                {filteredTransactions.length} {filteredTransactions.length === 1 ? "transazione" : "transazioni"}
              </h2>
              <p className="text-body-sm text-brand-gray">
                Transazioni gift card nel periodo selezionato
              </p>
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={exportToExcel}
                disabled={filteredTransactions.length === 0}
                className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-full text-body-sm font-medium hover:bg-green-700 transition-colors disabled:opacity-50"
              >
                <FileSpreadsheet className="w-4 h-4" />
                Export Excel
              </button>
              <button
                onClick={generatePDF}
                disabled={filteredTransactions.length === 0}
                className="flex items-center gap-2 px-4 py-2 bg-brand-primary text-white rounded-full text-body-sm font-medium hover:bg-brand-dark transition-colors disabled:opacity-50"
              >
                <Printer className="w-4 h-4" />
                Stampa PDF
              </button>
            </div>
          </div>
        </div>

        {/* Transactions Table */}
        {filteredTransactions.length > 0 ? (
          <div className="bg-white rounded-2xl shadow-card overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-brand-cream border-b border-brand-light-gray">
                  <tr>
                    <th className="text-left py-3 px-4 text-label-md font-bold text-brand-gray">Data</th>
                    <th className="text-left py-3 px-4 text-label-md font-bold text-brand-gray">Gift Card</th>
                    <th className="text-left py-3 px-4 text-label-md font-bold text-brand-gray">Cliente</th>
                    <th className="text-left py-3 px-4 text-label-md font-bold text-brand-gray">Dettaglio</th>
                    <th className="text-right py-3 px-4 text-label-md font-bold text-brand-gray">Importo</th>
                    <th className="text-right py-3 px-4 text-label-md font-bold text-brand-gray">Residuo</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredTransactions.map((t) => {
                    const date = new Date(t.createdAt)
                    return (
                      <tr key={t.id} className="border-b border-brand-light-gray/50 last:border-b-0 hover:bg-red-50/30">
                        <td className="py-3 px-4">
                          <div className="text-body-sm text-brand-dark">
                            {date.toLocaleDateString("it-IT")}
                          </div>
                          <div className="text-label-sm text-brand-gray">
                            {date.toLocaleTimeString("it-IT", { hour: "2-digit", minute: "2-digit" })}
                          </div>
                        </td>
                        <td className="py-3 px-4">
                          <div className="font-mono text-body-sm font-bold text-brand-dark">
                            {t.giftCard.code}
                          </div>
                          <div className="text-label-sm text-brand-gray">
                            Iniziale: {t.giftCard.initialValue.toFixed(2)}€
                          </div>
                        </td>
                        <td className="py-3 px-4">
                          <div className="text-body-sm text-brand-dark">{t.giftCard.order?.email || "N/A"}</div>
                          {t.giftCard.order?.phone && (
                            <div className="text-label-sm text-brand-gray">{t.giftCard.order?.phone}</div>
                          )}
                        </td>
                        <td className="py-3 px-4">
                          <div className="space-y-1">
                            {t.receiptNumber && (
                              <div className="flex items-center gap-1 text-body-sm text-blue-600">
                                <Receipt className="w-3 h-3" />
                                {t.receiptNumber}
                              </div>
                            )}
                            {t.note && (
                              <div className="text-label-sm text-brand-gray truncate max-w-[200px]">
                                {t.note}
                              </div>
                            )}
                            {t.receiptImage && (
                              <div className="flex items-center gap-1 text-label-sm text-green-600">
                                <Camera className="w-3 h-3" />
                                <button
                                  onClick={() => setFullscreenImage({ 
                                    url: t.receiptImage!, 
                                    receiptNumber: t.receiptNumber 
                                  })}
                                  className="hover:underline"
                                >
                                  Foto scontrino
                                </button>
                              </div>
                            )}
                          </div>
                        </td>
                        <td className="py-3 px-4 text-right">
                          <span className="text-headline-sm font-bold text-red-500">
                            -{t.amount.toFixed(2)}€
                          </span>
                        </td>
                        <td className="py-3 px-4 text-right">
                          <span className="text-body-sm text-brand-gray">
                            {t.giftCard.remainingValue.toFixed(2)}€
                          </span>
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
                <tfoot className="bg-brand-cream border-t-2 border-brand-light-gray">
                  <tr>
                    <td colSpan={4} className="py-4 px-4">
                      <div className="space-y-2">
                        <div className="text-label-sm font-bold text-red-700 uppercase tracking-wide">
                          RIEPILOGO
                        </div>
                        <div className="flex justify-between text-body-sm pl-2">
                          <span className="text-brand-gray">Totale Utilizzato:</span>
                          <span className="font-bold text-red-600">{totals.totalUsed.toFixed(2)}€</span>
                        </div>
                        <div className="flex justify-between text-body-sm pl-2">
                          <span className="text-brand-gray">Gift Card Usate:</span>
                          <span className="font-bold text-purple-600">{totals.uniqueGiftCards}</span>
                        </div>
                      </div>
                    </td>
                    <td colSpan={2} className="py-4 px-4 text-right">
                      <span className="text-title-md font-bold text-brand-dark">TOTALE:</span>
                      <div className="text-headline-md font-bold text-red-600">
                        -{totals.totalUsed.toFixed(2)}€
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
            <Image
              src={fullscreenImage.url}
              alt="Scontrino"
              width={800}
              height={600}
              unoptimized
              className="max-w-full max-h-[90vh] object-contain rounded-lg"
              onClick={(e) => e.stopPropagation()}
            />
          </div>
        </div>
      )}
    </main>
  )
}
