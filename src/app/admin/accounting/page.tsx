"use client"

import { Suspense, useEffect, useState, useMemo } from "react"
import Link from "next/link"
import { useSearchParams } from "next/navigation"
import { ArrowLeft, Calendar, ChevronLeft, ChevronRight, Package, CreditCard, Gift, AlertTriangle, FileSpreadsheet, Printer, AlertCircle } from "lucide-react"
import * as XLSX from "xlsx"
import { PDFDocument, rgb, StandardFonts } from "pdf-lib"

interface OrderItem {
  id: string
  quantity: number
  unitPrice: number
  totalPrice: number
  size?: string
  product: {
    name: string
  }
}

interface GiftCard {
  id: string
  code: string
  initialValue: number
}

interface Order {
  id: string
  orderNumber: string
  type: string
  status: string
  email: string
  phone?: string
  total: number
  createdAt: string
  paidAt?: string  // Data pagamento completato - CRITICO per contabilità
  stripePaymentIntentId?: string
  items: OrderItem[]
  giftCards: GiftCard[]
}

// Helper to calculate order breakdown
const getOrderBreakdown = (order: Order) => {
  const productTotal = order.items.reduce((sum, item) => sum + item.totalPrice, 0)
  const giftCardTotal = order.giftCards.reduce((sum, gc) => sum + gc.initialValue, 0)
  return { productTotal, giftCardTotal }
}

function DailyReportContent() {
  const searchParams = useSearchParams()
  const [orders, setOrders] = useState<Order[]>([])
  const [loading, setLoading] = useState(true)
  const [selectedDate, setSelectedDate] = useState(() => {
    const dateParam = searchParams.get("date")
    if (dateParam) return dateParam
    return new Date().toISOString().split("T")[0]
  })

  useEffect(() => {
    fetchOrders()
  }, [])

  const fetchOrders = async () => {
    try {
      const res = await fetch("/api/admin/orders")
      const data = await res.json()
      setOrders(data)
    } catch (error) {
      console.error("Error fetching orders:", error)
    } finally {
      setLoading(false)
    }
  }

  // Helper to get start/end of day in Italian timezone (Europe/Rome)
  // CRITICAL for accounting: ensures correct day boundary at midnight Italy time
  const getItalianDayBounds = (dateStr: string) => {
    // Create date objects for start and end of day in Italian timezone
    // Format: YYYY-MM-DD
    const [year, month, day] = dateStr.split('-').map(Number)
    
    // Create dates at midnight in Italian timezone (UTC+1 winter, UTC+2 summer)
    // We use toLocaleString to handle DST (Daylight Saving Time) automatically
    const startOfDayIt = new Date(Date.UTC(year, month - 1, day, 0, 0, 0))
    const endOfDayIt = new Date(Date.UTC(year, month - 1, day + 1, 0, 0, 0))
    
    // Adjust for Italian timezone offset (CET = UTC+1, CEST = UTC+2)
    // Check if date is in DST period (last Sunday of March to last Sunday of October)
    const isDST = (d: Date) => {
      const year = d.getFullYear()
      // Last Sunday of March
      const dstStart = new Date(year, 2, 31)
      dstStart.setDate(dstStart.getDate() - dstStart.getDay())
      dstStart.setHours(2, 0, 0, 0)
      // Last Sunday of October
      const dstEnd = new Date(year, 9, 31)
      dstEnd.setDate(dstEnd.getDate() - dstEnd.getDay())
      dstEnd.setHours(3, 0, 0, 0)
      return d >= dstStart && d < dstEnd
    }
    
    const offsetHours = isDST(startOfDayIt) ? 2 : 1 // CEST = +2, CET = +1
    
    // Adjust UTC dates by subtracting the Italian offset
    // Midnight Italy = (24:00 - offset) UTC previous day
    const startOfDay = new Date(startOfDayIt.getTime() - offsetHours * 60 * 60 * 1000)
    const endOfDay = new Date(endOfDayIt.getTime() - offsetHours * 60 * 60 * 1000)
    
    return { startOfDay, endOfDay }
  }

  const filteredOrders = useMemo(() => {
    // Use Italian timezone for date filtering (critical for accounting)
    // This ensures that an order placed at 23:30 Italy time on Feb 24
    // is counted for Feb 24, even though it's 22:30 UTC (or 21:30 UTC in summer)
    const { startOfDay, endOfDay } = getItalianDayBounds(selectedDate)
    
    console.log(`📅 [DailyReport] Filtro data: ${selectedDate}`)
    console.log(`   Inizio giorno (IT): ${startOfDay.toISOString()}`)
    console.log(`   Fine giorno (IT): ${endOfDay.toISOString()}`)
    console.log(`   Offset usato: ${startOfDay.getTimezoneOffset() === -60 ? 'CET (+1)' : startOfDay.getTimezoneOffset() === -120 ? 'CEST (+2)' : 'UTC'}`)

    return orders.filter(order => {
      // CRITICO per contabilità: usa SOLO paidAt (data pagamento effettivo)
      // Ordini senza paidAt (legacy) non vengono mostrati nel report
      if (!order.paidAt) return false
      const orderDate = new Date(order.paidAt)
      // Check if order falls within the Italian day
      const isOnDate = orderDate >= startOfDay && orderDate < endOfDay
      // Only show paid orders (Option A: PENDING, COMPLETED, DELIVERED)
      const isPaidOrder = ["PENDING", "COMPLETED", "DELIVERED"].includes(order.status)
      return isOnDate && isPaidOrder
    })
  }, [orders, selectedDate])

  // Calcola ordini problematici: pagati (COMPLETED/DELIVERED) ma SENZA paidAt
  // Questi sono ordini che dovrebbero avere paidAt ma non ce l'hanno (errore da correggere)
  const paidOrdersWithoutPaidAtCount = useMemo(() => {
    const { startOfDay, endOfDay } = getItalianDayBounds(selectedDate)
    return orders.filter(order => {
      // Solo ordini PAGATI (COMPLETED o DELIVERED)
      const isPaidStatus = ["COMPLETED", "DELIVERED"].includes(order.status)
      if (!isPaidStatus) return false
      // Ma SENZA paidAt (questo è un problema!)
      if (order.paidAt) return false
      // E creati nella data selezionata
      const createdAt = new Date(order.createdAt)
      const isOnDate = createdAt >= startOfDay && createdAt < endOfDay
      return isOnDate
    }).length
  }, [orders, selectedDate])

  const totals = useMemo(() => {
    const totalRevenue = filteredOrders.reduce((sum, o) => sum + o.total, 0)
    const productRevenue = filteredOrders
      .reduce((sum, o) => sum + o.items.reduce((itemSum, item) => itemSum + item.totalPrice, 0), 0)
    const giftCardRevenue = filteredOrders
      .reduce((sum, o) => sum + o.giftCards.reduce((gcSum, gc) => gcSum + gc.initialValue, 0), 0)
    
    return { totalRevenue, productRevenue, giftCardRevenue }
  }, [filteredOrders])

  const handleDateChange = (days: number) => {
    const current = new Date(selectedDate)
    current.setDate(current.getDate() + days)
    setSelectedDate(current.toISOString().split("T")[0])
  }

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr)
    return date.toLocaleDateString("it-IT", {
      weekday: "long",
      day: "numeric",
      month: "long",
      year: "numeric",
    })
  }

  const isToday = selectedDate === new Date().toISOString().split("T")[0]

  // Export to Excel
  const exportToExcel = () => {
    if (filteredOrders.length === 0) return

    const rows: Record<string, string | number>[] = []
    
    filteredOrders.forEach(order => {
      const { productTotal, giftCardTotal } = getOrderBreakdown(order)
      
      // Riga principale ordine
      rows.push({
        "Data": new Date(order.createdAt).toLocaleDateString("it-IT"),
        "Ora": new Date(order.createdAt).toLocaleTimeString("it-IT", { hour: "2-digit", minute: "2-digit" }),
        "Ordine": order.orderNumber,
        "Email": order.email,
        "Telefono": order.phone || "-",
        "Tipo": order.items.length > 0 && order.giftCards.length > 0 ? "MIXED" : order.giftCards.length > 0 ? "GIFT CARD" : "PRODOTTI",
        "Prodotto": "",
        "Taglia": "",
        "Qty": "",
        "Prezzo": "",
        "Totale Prodotti": productTotal > 0 ? productTotal : "",
        "Totale Gift Card": giftCardTotal > 0 ? giftCardTotal : "",
        "Totale Ordine": order.total,
        "Stripe ID": order.stripePaymentIntentId || "-",
      })
      
      // Righe prodotti
      order.items.forEach(item => {
        rows.push({
          "Data": "",
          "Ora": "",
          "Ordine": "",
          "Email": "",
          "Telefono": "",
          "Tipo": "",
          "Prodotto": item.product.name,
          "Taglia": item.size || "-",
          "Qty": item.quantity,
          "Prezzo": item.totalPrice,
          "Totale Prodotti": "",
          "Totale Gift Card": "",
          "Totale Ordine": "",
          "Stripe ID": "",
        })
      })
      
      // Righe gift card
      order.giftCards.forEach(gc => {
        rows.push({
          "Data": "",
          "Ora": "",
          "Ordine": "",
          "Email": "",
          "Telefono": "",
          "Tipo": "",
          "Prodotto": `Gift Card ${gc.code}`,
          "Taglia": "",
          "Qty": 1,
          "Prezzo": gc.initialValue,
          "Totale Prodotti": "",
          "Totale Gift Card": "",
          "Totale Ordine": "",
          "Stripe ID": "",
        })
      })
      
      // Riga vuota per separare ordini
      rows.push({
        "Data": "",
        "Ora": "",
        "Ordine": "",
        "Email": "",
        "Telefono": "",
        "Tipo": "",
        "Prodotto": "",
        "Taglia": "",
        "Qty": "",
        "Prezzo": "",
        "Totale Prodotti": "",
        "Totale Gift Card": "",
        "Totale Ordine": "",
        "Stripe ID": "",
      })
    })
    
    // Riga totali
    rows.push({
      "Data": "TOTALI GIORNO",
      "Ora": "",
      "Ordine": "",
      "Email": "",
      "Telefono": "",
      "Tipo": "",
      "Prodotto": "",
      "Taglia": "",
      "Qty": "",
      "Prezzo": "",
      "Totale Prodotti": totals.productRevenue,
      "Totale Gift Card": totals.giftCardRevenue,
      "Totale Ordine": totals.totalRevenue,
      "Stripe ID": "",
    })

    const ws = XLSX.utils.json_to_sheet(rows)
    const wb = XLSX.utils.book_new()
    XLSX.utils.book_append_sheet(wb, ws, "Riepilogo")
    
    // Auto-width per colonne
    const colWidths = [
      { wch: 12 }, // Data
      { wch: 8 },  // Ora
      { wch: 12 }, // Ordine
      { wch: 25 }, // Email
      { wch: 15 }, // Telefono
      { wch: 10 }, // Tipo
      { wch: 30 }, // Prodotto
      { wch: 8 },  // Taglia
      { wch: 6 },  // Qty
      { wch: 10 }, // Prezzo
      { wch: 12 }, // Totale Prodotti
      { wch: 12 }, // Totale Gift Card
      { wch: 12 }, // Totale Ordine
      { wch: 30 }, // Stripe ID
    ]
    ws['!cols'] = colWidths
    
    XLSX.writeFile(wb, `LoScalo_Riepilogo_${selectedDate}.xlsx`)
  }

  // Generate and download PDF with detail
  const generatePDF = async () => {
    if (filteredOrders.length === 0) return

    const pdfDoc = await PDFDocument.create()
    let page = pdfDoc.addPage([842, 595]) // A4 Landscape
    const { width, height } = page.getSize()
    const font = await pdfDoc.embedFont(StandardFonts.Helvetica)
    const fontBold = await pdfDoc.embedFont(StandardFonts.HelveticaBold)
    
    let y = height - 50
    const margin = 40
    const rowHeight = 12
    
    // Header
    page.drawText("Lo Scalo - Riepilogo Contabile", {
      x: margin,
      y,
      size: 18,
      font: fontBold,
      color: rgb(0, 0, 0),
    })
    
    y -= 25
    page.drawText(`Data: ${formatDate(selectedDate)}`, {
      x: margin,
      y,
      size: 12,
      font,
      color: rgb(0.4, 0.4, 0.4),
    })
    
    y -= 30
    
    // Helper function to check and add new page
    const checkNewPage = (neededSpace: number) => {
      if (y < neededSpace + 60) {
        page = pdfDoc.addPage([842, 595])
        y = height - 50
        return true
      }
      return false
    }
    
    // Process each order with detail
    filteredOrders.forEach((order) => {
      const { productTotal, giftCardTotal } = getOrderBreakdown(order)
      const time = new Date(order.createdAt).toLocaleTimeString("it-IT", { hour: "2-digit", minute: "2-digit" })
      
      checkNewPage(80) // Space for order header
      
      // Order header background
      page.drawRectangle({
        x: margin,
        y: y - 5,
        width: width - margin * 2,
        height: 20,
        color: rgb(0.95, 0.95, 0.95),
      })
      
      // Order header row
      page.drawText(`#${order.orderNumber}`, {
        x: margin,
        y,
        size: 10,
        font: fontBold,
        color: rgb(0, 0, 0),
      })
      
      page.drawText(time, {
        x: margin + 80,
        y,
        size: 9,
        font,
        color: rgb(0.4, 0.4, 0.4),
      })
      
      page.drawText(order.email.length > 35 ? order.email.substring(0, 35) + "..." : order.email, {
        x: margin + 130,
        y,
        size: 9,
        font,
        color: rgb(0, 0, 0),
      })
      
      page.drawText(`${order.total.toFixed(2)}€`, {
        x: width - margin - 60,
        y,
        size: 10,
        font: fontBold,
        color: rgb(0.8, 0.3, 0.1),
      })
      
      y -= rowHeight + 5
      
      // Products detail
      if (order.items.length > 0) {
        checkNewPage(order.items.length * rowHeight + 20)
        
        page.drawText("Prodotti:", {
          x: margin + 20,
          y,
          size: 9,
          font: fontBold,
          color: rgb(0.2, 0.4, 0.8),
        })
        y -= rowHeight
        
        order.items.forEach(item => {
          const sizeText = item.size ? ` (${item.size})` : ""
          page.drawText(`• ${item.quantity}x ${item.product.name}${sizeText}`, {
            x: margin + 30,
            y,
            size: 8,
            font,
            color: rgb(0, 0, 0),
          })
          
          page.drawText(`${item.totalPrice.toFixed(2)}€`, {
            x: width - margin - 100,
            y,
            size: 8,
            font,
            color: rgb(0.4, 0.4, 0.4),
          })
          
          y -= rowHeight
        })
        
        // Products total
        page.drawText(`Totale Prodotti: ${productTotal.toFixed(2)}€`, {
          x: width - margin - 150,
          y,
          size: 9,
          font: fontBold,
          color: rgb(0.2, 0.4, 0.8),
        })
        y -= rowHeight + 5
      }
      
      // Gift Cards detail
      if (order.giftCards.length > 0) {
        checkNewPage(order.giftCards.length * rowHeight + 20)
        
        page.drawText("Gift Card:", {
          x: margin + 20,
          y,
          size: 9,
          font: fontBold,
          color: rgb(0.2, 0.6, 0.2),
        })
        y -= rowHeight
        
        order.giftCards.forEach(gc => {
          page.drawText(`• ${gc.code}`, {
            x: margin + 30,
            y,
            size: 8,
            font,
            color: rgb(0, 0, 0),
          })
          
          page.drawText(`${gc.initialValue.toFixed(2)}€`, {
            x: width - margin - 100,
            y,
            size: 8,
            font,
            color: rgb(0.4, 0.4, 0.4),
          })
          
          y -= rowHeight
        })
        
        // Gift cards total
        page.drawText(`Totale Gift Card: ${giftCardTotal.toFixed(2)}€`, {
          x: width - margin - 150,
          y,
          size: 9,
          font: fontBold,
          color: rgb(0.2, 0.6, 0.2),
        })
        y -= rowHeight + 5
      }
      
      // Stripe ID if present
      if (order.stripePaymentIntentId) {
        checkNewPage(20)
        page.drawText(`Stripe: ${order.stripePaymentIntentId}`, {
          x: margin + 20,
          y,
          size: 7,
          font,
          color: rgb(0.5, 0.5, 0.5),
        })
        y -= rowHeight
      }
      
      // Separator between orders
      y -= 10
    })
    
    // Footer totals
    checkNewPage(100)
    
    y -= 10
    page.drawLine({
      start: { x: margin, y },
      end: { x: width - margin, y },
      thickness: 2,
      color: rgb(0, 0, 0),
    })
    
    y -= 25
    page.drawText("TOTALI GIORNO", {
      x: margin,
      y,
      size: 14,
      font: fontBold,
      color: rgb(0, 0, 0),
    })
    
    y -= 20
    page.drawText(`Prodotti: ${totals.productRevenue.toFixed(2)}€`, {
      x: margin + 20,
      y,
      size: 12,
      font: fontBold,
      color: rgb(0.2, 0.4, 0.8),
    })
    
    y -= 18
    page.drawText(`Gift Card: ${totals.giftCardRevenue.toFixed(2)}€`, {
      x: margin + 20,
      y,
      size: 12,
      font: fontBold,
      color: rgb(0.2, 0.6, 0.2),
    })
    
    y -= 22
    page.drawText(`TOTALE INCASSO: ${totals.totalRevenue.toFixed(2)}€`, {
      x: margin,
      y,
      size: 16,
      font: fontBold,
      color: rgb(0.8, 0.3, 0.1),
    })
    
    const pdfBytes = await pdfDoc.save()
    const blob = new Blob([pdfBytes as unknown as ArrayBuffer], { type: "application/pdf" })
    const link = document.createElement("a")
    link.href = URL.createObjectURL(blob)
    link.download = `LoScalo_Riepilogo_${selectedDate}.pdf`
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
      {/* Header */}
      <header className="bg-white border-b border-brand-light-gray">
        <div className="flex items-center px-4 py-3 relative">
          <Link href="/admin" className="p-2 -ml-2">
            <ArrowLeft className="w-6 h-6 text-brand-dark" />
          </Link>
          <h1 className="text-headline-sm font-bold text-brand-dark absolute left-1/2 -translate-x-1/2">
            Contabilità
          </h1>
        </div>
      </header>

      <div className="p-4 max-w-7xl mx-auto">
        {/* Date Navigation */}
        <div className="bg-white rounded-2xl shadow-card p-4 mb-4">
          <div className="flex items-center justify-between">
            <button
              onClick={() => handleDateChange(-1)}
              className="p-2 rounded-xl hover:bg-brand-light-gray/50 transition-colors"
            >
              <ChevronLeft className="w-6 h-6 text-brand-dark" />
            </button>
            
            <div className="flex items-center gap-2">
              <Calendar className="w-5 h-5 text-brand-primary" />
              <input
                type="date"
                value={selectedDate}
                onChange={(e) => setSelectedDate(e.target.value)}
                className="text-title-md font-bold text-brand-dark bg-transparent border-none focus:outline-none cursor-pointer"
              />
              {isToday && (
                <span className="px-2 py-1 bg-brand-primary/10 text-brand-primary text-label-sm rounded-full">
                  Oggi
                </span>
              )}
            </div>

            <button
              onClick={() => handleDateChange(1)}
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
              <div className="w-10 h-10 bg-brand-primary/10 rounded-xl flex items-center justify-center">
                <CreditCard className="w-5 h-5 text-brand-primary" />
              </div>
              <span className="text-label-md text-brand-gray">Totale Incasso</span>
            </div>
            <p className="text-headline-lg font-bold text-brand-dark">
              {totals.totalRevenue.toFixed(2)}€
            </p>
          </div>

          <div className="bg-white rounded-2xl shadow-card p-4">
            <div className="flex items-center gap-3 mb-2">
              <div className="w-10 h-10 bg-blue-500/10 rounded-xl flex items-center justify-center">
                <Package className="w-5 h-5 text-blue-500" />
              </div>
              <span className="text-label-md text-brand-gray">Prodotti</span>
            </div>
            <p className="text-headline-lg font-bold text-brand-dark">
              {totals.productRevenue.toFixed(2)}€
            </p>
          </div>

          <div className="bg-white rounded-2xl shadow-card p-4">
            <div className="flex items-center gap-3 mb-2">
              <div className="w-10 h-10 bg-green-500/10 rounded-xl flex items-center justify-center">
                <Gift className="w-5 h-5 text-green-500" />
              </div>
              <span className="text-label-md text-brand-gray">Gift Card</span>
            </div>
            <p className="text-headline-lg font-bold text-brand-dark">
              {totals.giftCardRevenue.toFixed(2)}€
            </p>
          </div>
        </div>

        {/* Note: Solo ordini pagati */}
        <div className="mb-4 space-y-2">
          <p className="text-body-sm text-brand-gray">
            Vengono mostrati solo gli ordini con pagamento completato (data pagamento: {new Date(selectedDate).toLocaleDateString("it-IT")})
          </p>
          {paidOrdersWithoutPaidAtCount > 0 && (
            <div className="flex items-center gap-2 px-3 py-2 bg-red-50 border border-red-200 rounded-lg">
              <AlertCircle className="w-4 h-4 text-red-600 flex-shrink-0" />
              <p className="text-body-sm text-red-700">
                Attenzione: {paidOrdersWithoutPaidAtCount} ordine pagato senza data di pagamento registrata. Aggiorna manualmente il database.
              </p>
            </div>
          )}
        </div>

        {/* Orders Count & Export Buttons */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 mb-4">
          <h2 className="text-title-md font-bold text-brand-dark">
            {filteredOrders.length} {filteredOrders.length === 1 ? "ordine" : "ordini"}
          </h2>
          <div className="flex items-center gap-2">
            <button
              onClick={exportToExcel}
              disabled={filteredOrders.length === 0}
              className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-full text-body-sm font-medium hover:bg-green-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <FileSpreadsheet className="w-4 h-4" />
              Export Excel
            </button>
            <button
              onClick={generatePDF}
              disabled={filteredOrders.length === 0}
              className="flex items-center gap-2 px-4 py-2 bg-brand-primary text-white rounded-full text-body-sm font-medium hover:bg-brand-dark transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <Printer className="w-4 h-4" />
              Stampa PDF
            </button>
          </div>
        </div>

        {/* Desktop Table View */}
        {filteredOrders.length > 0 ? (
          <>
            {/* Desktop: Table */}
            <div className="hidden md:block bg-white rounded-2xl shadow-card overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-brand-cream border-b border-brand-light-gray">
                    <tr>
                      <th className="text-left py-3 px-4 text-label-md font-bold text-brand-gray">Ordine</th>
                      <th className="text-left py-3 px-4 text-label-md font-bold text-brand-gray">Cliente</th>
                      <th className="text-left py-3 px-4 text-label-md font-bold text-brand-gray">Prodotti</th>
                      <th className="text-left py-3 px-4 text-label-md font-bold text-brand-gray">Stripe ID</th>
                      <th className="text-right py-3 px-4 text-label-md font-bold text-brand-gray">Dettaglio Totale</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredOrders.map((order) => {
                      const { productTotal, giftCardTotal } = getOrderBreakdown(order)
                      return (
                        <tr key={order.id} className="border-b border-brand-light-gray/50 last:border-b-0 hover:bg-brand-cream/50">
                          {/* Order Number */}
                          <td className="py-3 px-4">
                            <div className="flex items-center gap-2">
                              <div className="font-mono text-body-sm font-bold text-brand-dark">
                                #{order.orderNumber}
                              </div>
                              {/* Warning for missing Stripe ID */}
                              {["PENDING", "COMPLETED", "DELIVERED"].includes(order.status) && !order.stripePaymentIntentId && (
                                <div className="group relative">
                                  <AlertTriangle className="w-4 h-4 text-red-500 cursor-help" />
                                  <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 px-3 py-2 bg-red-600 text-white text-label-sm rounded-lg whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none z-10">
                                    Stripe Payment ID mancante
                                  </div>
                                </div>
                              )}
                            </div>
                            <div className="text-label-sm text-brand-gray">
                              {new Date(order.createdAt).toLocaleTimeString("it-IT", {
                                hour: "2-digit",
                                minute: "2-digit",
                              })}
                            </div>
                          </td>

                          {/* Client Info */}
                          <td className="py-3 px-4">
                            <div className="text-body-sm text-brand-dark">{order.email}</div>
                            {order.phone && (
                              <div className="text-label-sm text-brand-gray">{order.phone}</div>
                            )}
                          </td>

                          {/* Products */}
                          <td className="py-3 px-4">
                            <div className="space-y-1">
                              {order.items.map((item, idx) => (
                                <div key={idx} className="text-body-sm text-brand-dark">
                                  {item.quantity}x {item.product.name} {item.size && `(${item.size})`}
                                  <span className="text-brand-gray ml-1">- {item.totalPrice.toFixed(2)}€</span>
                                </div>
                              ))}
                              {order.giftCards.map((gc, idx) => (
                                <div key={`gc-${idx}`} className="text-body-sm text-brand-dark">
                                  Gift Card {gc.code} ({gc.initialValue.toFixed(0)}€)
                                </div>
                              ))}
                            </div>
                          </td>

                          {/* Stripe Payment ID */}
                          <td className="py-3 px-4">
                            {order.stripePaymentIntentId ? (
                              <a
                                href={`${process.env.NEXT_PUBLIC_STRIPE_DASHBOARD_URL}${order.stripePaymentIntentId}`}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="font-mono text-body-xs text-brand-primary hover:underline"
                              >
                                {order.stripePaymentIntentId}
                              </a>
                            ) : (
                              <span className="text-label-sm text-brand-gray">-</span>
                            )}
                          </td>

                          {/* Total - Split View */}
                          <td className="py-3 px-4 text-right">
                            <div className="space-y-1">
                              {productTotal > 0 && (
                                <div className="text-body-sm text-blue-600">
                                  Prodotti: <span className="font-bold">{productTotal.toFixed(2)}€</span>
                                </div>
                              )}
                              {giftCardTotal > 0 && (
                                <div className="text-body-sm text-green-600">
                                  Gift Card: <span className="font-bold">{giftCardTotal.toFixed(2)}€</span>
                                </div>
                              )}
                              <div className="pt-1 border-t border-brand-light-gray">
                                <span className="text-headline-sm font-bold text-brand-primary">
                                  {order.total.toFixed(2)}€
                                </span>
                              </div>
                            </div>
                          </td>
                        </tr>
                      )
                    })}
                  </tbody>
                  <tfoot className="bg-brand-cream border-t-2 border-brand-light-gray">
                    <tr>
                      <td colSpan={3} className="py-4 px-4 text-right">
                        <div className="space-y-1">
                          <div className="text-body-sm text-blue-600">
                            Prodotti: <span className="font-bold">{totals.productRevenue.toFixed(2)}€</span>
                          </div>
                          <div className="text-body-sm text-green-600">
                            Gift Card: <span className="font-bold">{totals.giftCardRevenue.toFixed(2)}€</span>
                          </div>
                        </div>
                      </td>
                      <td colSpan={2} className="py-4 px-4 text-right">
                        <span className="text-title-md font-bold text-brand-dark">TOTALE GIORNO:</span>
                        <div className="text-headline-md font-bold text-brand-primary">
                          {totals.totalRevenue.toFixed(2)}€
                        </div>
                      </td>
                    </tr>
                  </tfoot>
                </table>
              </div>
            </div>

            {/* Mobile: Card View */}
            <div className="md:hidden space-y-4">
              {filteredOrders.map((order) => {
                const { productTotal, giftCardTotal } = getOrderBreakdown(order)
                return (
                  <div key={order.id} className="bg-white rounded-2xl shadow-card p-4">
                    {/* Header: Order Number + Total */}
                    <div className="flex items-start justify-between mb-3 pb-3 border-b border-brand-light-gray">
                      <div>
                        <div className="font-mono text-title-md font-bold text-brand-dark">
                          #{order.orderNumber}
                        </div>
                        <div className="text-body-sm text-brand-gray">
                          {new Date(order.createdAt).toLocaleTimeString("it-IT", {
                            hour: "2-digit",
                            minute: "2-digit",
                          })}
                        </div>
                      </div>
                      <div className="text-right">
                        <div className="text-headline-sm font-bold text-brand-primary">
                          {order.total.toFixed(2)}€
                        </div>
                      </div>
                    </div>

                    {/* Warning: Missing Stripe Payment ID */}
                    {["PENDING", "COMPLETED", "DELIVERED"].includes(order.status) && !order.stripePaymentIntentId && (
                      <div className="bg-red-50 border border-red-200 rounded-xl p-3 mb-3 flex items-start gap-2">
                        <AlertTriangle className="w-5 h-5 text-red-500 flex-shrink-0 mt-0.5" />
                        <div>
                          <p className="text-body-sm font-bold text-red-700">
                            Stripe Payment ID mancante
                          </p>
                          <p className="text-label-sm text-red-600">
                            Verificare su Stripe se il pagamento è andato a buon fine
                          </p>
                        </div>
                      </div>
                    )}

                    {/* Customer Info */}
                    <div className="mb-3">
                      <div className="text-label-sm text-brand-gray mb-1">Cliente</div>
                      <div className="text-body-sm text-brand-dark">{order.email}</div>
                      {order.phone && (
                        <div className="text-body-sm text-brand-gray">{order.phone}</div>
                      )}
                    </div>

                    {/* Products Section */}
                    {(order.items.length > 0 || order.giftCards.length > 0) && (
                      <div className="mb-3">
                        <div className="text-label-sm text-brand-gray mb-2">Dettaglio</div>
                        
                        {/* Products */}
                        {order.items.length > 0 && (
                          <div className="bg-blue-50 rounded-xl p-3 mb-2">
                            <div className="flex items-center gap-2 mb-2">
                              <Package className="w-4 h-4 text-blue-500" />
                              <span className="text-label-sm font-bold text-blue-700">Prodotti</span>
                              <span className="ml-auto text-body-sm font-bold text-blue-700">
                                {productTotal.toFixed(2)}€
                              </span>
                            </div>
                            <div className="space-y-1">
                              {order.items.map((item, idx) => (
                                <div key={idx} className="text-body-sm text-brand-dark">
                                  • {item.quantity} x {item.product.name} {item.size && `(${item.size})`}
                                  <span className="text-brand-gray ml-1">({item.totalPrice.toFixed(2)}€)</span>
                                </div>
                              ))}
                            </div>
                          </div>
                        )}

                        {/* Gift Cards */}
                        {order.giftCards.length > 0 && (
                          <div className="bg-green-50 rounded-xl p-3">
                            <div className="flex items-center gap-2 mb-2">
                              <Gift className="w-4 h-4 text-green-500" />
                              <span className="text-label-sm font-bold text-green-700">Gift Card</span>
                              <span className="ml-auto text-body-sm font-bold text-green-700">
                                {giftCardTotal.toFixed(2)}€
                              </span>
                            </div>
                            <div className="space-y-1">
                              {order.giftCards.map((gc, idx) => (
                                <div key={`gc-${idx}`} className="text-body-sm text-brand-dark">
                                  • {gc.code} ({gc.initialValue.toFixed(0)}€)
                                </div>
                              ))}
                            </div>
                          </div>
                        )}
                      </div>
                    )}

                    {/* Stripe ID */}
                    {order.stripePaymentIntentId && (
                      <div className="pt-3 border-t border-brand-light-gray">
                        <div className="text-label-sm text-brand-gray mb-1">Stripe ID</div>
                        <a
                          href={`${process.env.NEXT_PUBLIC_STRIPE_DASHBOARD_URL}${order.stripePaymentIntentId}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="font-mono text-body-xs text-brand-primary hover:underline break-all"
                        >
                          {order.stripePaymentIntentId}
                        </a>
                      </div>
                    )}
                  </div>
                )
              })}

              {/* Mobile Total Footer */}
              <div className="bg-brand-cream rounded-2xl p-4 border-2 border-brand-primary">
                <div className="space-y-2 mb-3">
                  <div className="flex items-center justify-between text-body-sm">
                    <span className="text-blue-600">Prodotti:</span>
                    <span className="font-bold text-blue-600">{totals.productRevenue.toFixed(2)}€</span>
                  </div>
                  <div className="flex items-center justify-between text-body-sm">
                    <span className="text-green-600">Gift Card:</span>
                    <span className="font-bold text-green-600">{totals.giftCardRevenue.toFixed(2)}€</span>
                  </div>
                </div>
                <div className="pt-3 border-t-2 border-brand-primary">
                  <div className="flex items-center justify-between">
                    <span className="text-title-md font-bold text-brand-dark">TOTALE:</span>
                    <span className="text-headline-md font-bold text-brand-primary">
                      {totals.totalRevenue.toFixed(2)}€
                    </span>
                  </div>
                </div>
              </div>
            </div>
          </>
        ) : (
          <div className="bg-white rounded-2xl shadow-card p-12 text-center">
            <Calendar className="w-12 h-12 text-brand-gray mx-auto mb-4" />
            <p className="text-body-lg text-brand-gray">
              Nessun ordine con pagamento completato per {formatDate(selectedDate)}
            </p>
            <p className="text-body-sm text-brand-gray/60 mt-2">
              Vengono mostrati solo gli ordini con data di pagamento (paidAt) registrata
            </p>
          </div>
        )}
      </div>
    </main>
  )
}

// Wrapper with Suspense for useSearchParams
export default function DailyReportPage() {
  return (
    <Suspense fallback={
      <main className="min-h-screen bg-brand-cream flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-brand-primary" />
      </main>
    }>
      <DailyReportContent />
    </Suspense>
  )
}
