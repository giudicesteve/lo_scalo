"use client"

import { Suspense, useEffect, useState, useMemo } from "react"
import Link from "next/link"
import { useSearchParams } from "next/navigation"
import { ArrowLeft, Calendar, ChevronLeft, ChevronRight, Package, CreditCard, Gift, AlertTriangle, FileSpreadsheet, Printer, AlertCircle, RotateCcw, PlusCircle, MinusCircle } from "lucide-react"
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
  orderSource?: "ONLINE" | "MANUAL"
  stripePaymentIntentId?: string
  items: OrderItem[]
  giftCards: GiftCard[]
}

interface RefundItem {
  type: 'PRODUCT' | 'GIFT_CARD'
  name: string
  price: number  // Per prodotti: prezzo in euro
  value?: number // Per gift card: valore in euro
  quantity?: number
  size?: string
}

interface Refund {
  id: string
  refundNumber: string
  orderId: string
  totalRefunded: number
  refundedAt: string
  refundMethod: "STRIPE" | "CASH" | "POS"
  externalRef?: string
  productTotal: number
  giftCardTotal: number
  items: RefundItem[]
  order: {
    id: string
    orderNumber: string
    email: string
    orderSource?: string
  }
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
  const [refunds, setRefunds] = useState<Refund[]>([])
  const [loading, setLoading] = useState(true)
  const [selectedDate, setSelectedDate] = useState(() => {
    const dateParam = searchParams.get("date")
    if (dateParam) return dateParam
    return new Date().toISOString().split("T")[0]
  })

  useEffect(() => {
    fetchData()
  }, [selectedDate])

  const fetchData = async () => {
    setLoading(true)
    try {
      // Usa API dedicata contabilità che filtra server-side per data (timezone Italia)
      const res = await fetch(`/api/admin/accounting?date=${selectedDate}`)
      const data = await res.json()
      
      setOrders(data.orders || [])
      setRefunds(data.refunds || [])
      
      // Log per debug
      console.log(`📅 [DailyReport] Data: ${selectedDate}`)
      console.log(`   Ordini: ${data.orders?.length || 0}`)
      console.log(`   Rimborsi: ${data.refunds?.length || 0}`)
      console.log(`   Range UTC: ${data.meta?.range?.start} - ${data.meta?.range?.end}`)
    } catch (error) {
      console.error("Error fetching data:", error)
    } finally {
      setLoading(false)
    }
  }

  // Ordini problematici dalla API (COMPLETED/DELIVERED senza paidAt)
  const paidOrdersWithoutPaidAtCount = useMemo(() => {
    // La API restituisce solo ordini validi, quindi se ci sono problematici
    // vengono gestiti separatamente. Per ora assumiamo 0.
    return 0
  }, [orders, selectedDate])

  const totals = useMemo(() => {
    const totalRevenue = orders.reduce((sum, o) => sum + o.total, 0)
    const productRevenue = orders
      .reduce((sum, o) => sum + o.items.reduce((itemSum, item) => itemSum + item.totalPrice, 0), 0)
    const giftCardRevenue = orders
      .reduce((sum, o) => sum + o.giftCards.reduce((gcSum, gc) => gcSum + gc.initialValue, 0), 0)
    
    // Refunds
    const totalRefunds = refunds.reduce((sum, r) => sum + r.totalRefunded, 0)
    const productRefunds = refunds.reduce((sum, r) => sum + r.productTotal, 0)
    const giftCardRefunds = refunds.reduce((sum, r) => sum + r.giftCardTotal, 0)
    
    // Net totals
    const netRevenue = totalRevenue - totalRefunds
    const netProductRevenue = productRevenue - productRefunds
    const netGiftCardRevenue = giftCardRevenue - giftCardRefunds
    
    return { 
      totalRevenue, 
      productRevenue, 
      giftCardRevenue,
      totalRefunds,
      productRefunds,
      giftCardRefunds,
      netRevenue,
      netProductRevenue,
      netGiftCardRevenue
    }
  }, [orders, refunds])

  // Combine orders and refunds into a single sorted list
  const transactions = useMemo(() => {
    const orderTransactions = orders.map(order => ({
      type: 'ORDER' as const,
      id: order.id,
      number: order.orderNumber,
      date: order.paidAt || order.createdAt,
      email: order.email,
      orderSource: order.orderSource,
      stripeId: order.stripePaymentIntentId,
      productTotal: order.items.reduce((sum, item) => sum + item.totalPrice, 0),
      giftCardTotal: order.giftCards.reduce((sum, gc) => sum + gc.initialValue, 0),
      total: order.total,
      items: order.items,
      giftCards: order.giftCards,
      order: null as Refund['order'] | null,
      refundMethod: null as Refund['refundMethod'] | null,
      externalRef: null as string | null,
    }))

    const refundTransactions = refunds.map(refund => ({
      type: 'REFUND' as const,
      id: refund.id,
      number: refund.refundNumber,
      date: refund.refundedAt,
      email: refund.order.email,
      orderSource: refund.order.orderSource,
      stripeId: null,
      productTotal: refund.productTotal,
      giftCardTotal: refund.giftCardTotal,
      total: -refund.totalRefunded, // Negative for refunds
      items: [] as OrderItem[],
      giftCards: [] as GiftCard[],
      order: refund.order,
      refundMethod: refund.refundMethod,
      externalRef: refund.externalRef,
      refundItems: refund.items,
    }))

    return [...orderTransactions, ...refundTransactions].sort(
      (a, b) => new Date(a.date).getTime() - new Date(b.date).getTime()
    )
  }, [orders, refunds])

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
    if (transactions.length === 0) return

    const rows: Record<string, string | number>[] = []
    
    
    transactions.forEach(tx => {
      const isOrder = tx.type === 'ORDER'
      
      // Build detail string with product/GC names
      let detail = ""
      if (isOrder) {
        const parts: string[] = []
        // Prodotti
        if (tx.items && tx.items.length > 0) {
          tx.items.forEach(item => {
            parts.push(`${item.quantity}x ${item.product?.name || 'Prodotto eliminato'}${item.size ? ` (${item.size})` : ''} (${item.totalPrice.toFixed(2)}€)`)
          })
        }
        // Gift Cards
        if (tx.giftCards && tx.giftCards.length > 0) {
          tx.giftCards.forEach(gc => {
            parts.push(`1x Gift Card ${gc.code} (${gc.initialValue.toFixed(2)}€)`)
          })
        }
        detail = parts.join(" | ")
      } else {
        const items = (tx as any).refundItems as RefundItem[] || []
        detail = items.map((item: RefundItem) => {
          // item.price/value è già in euro
          const itemTotal = item.type === 'PRODUCT' 
            ? (item.price * (item.quantity || 1))
            : (item.value || item.price || 0)
          return `${item.quantity || 1}x ${item.name}${item.size ? ` (${item.size})` : ''} (${itemTotal.toFixed(2)}€)`
        }).join(" | ")
      }
      
      rows.push({
        "Data": new Date(tx.date).toLocaleDateString("it-IT"),
        "Ora": new Date(tx.date).toLocaleTimeString("it-IT", { hour: "2-digit", minute: "2-digit" }),
        "Tipo": isOrder ? "ORDINE" : "RIMBORSO",
        "Codice Univoco": tx.number,
        "Rif. Ordine": isOrder ? "-" : (tx.order?.orderNumber || "-"),
        "Fonte": tx.orderSource === "MANUAL" ? "MANUALE" : "ONLINE",
        "Metodo Rimborso": isOrder ? "-" : tx.refundMethod,
        "Cliente": tx.email,
        "Dettaglio": detail,
        "Prodotti": isOrder ? (tx.productTotal > 0 ? `+${tx.productTotal.toFixed(2)}€` : "-") : 
                     ((tx as any).refundItems?.some((i: RefundItem) => i.type === 'PRODUCT') ? 
                      `-${((tx as any).refundItems.filter((i: RefundItem) => i.type === 'PRODUCT')
                        .reduce((sum: number, i: RefundItem) => sum + i.price * (i.quantity || 1), 0) / 100).toFixed(2)}€` : "-"),
        "Gift Card": isOrder ? (tx.giftCardTotal > 0 ? `+${tx.giftCardTotal.toFixed(2)}€` : "-") :
                     ((tx as any).refundItems?.some((i: RefundItem) => i.type === 'GIFT_CARD') ?
                      `-${((tx as any).refundItems.filter((i: RefundItem) => i.type === 'GIFT_CARD')
                        .reduce((sum: number, i: RefundItem) => sum + i.price, 0) / 100).toFixed(2)}€` : "-"),
        "Totale": isOrder ? `+${tx.total.toFixed(2)}€` : `-${Math.abs(tx.total).toFixed(2)}€`,
        "Stripe ID / Rif.": isOrder ? (tx.stripeId || "-") : (tx.externalRef || "-"),
      })
    })
    
    // Riga vuota
    rows.push({
      "Data": "",
      "Ora": "",
      "Tipo": "",
      "Codice Univoco": "",
      "Rif. Ordine": "",
      "Fonte": "",
      "Metodo Rimborso": "",
      "Cliente": "",
      "Dettaglio": "",
      "Prodotti": "",
      "Gift Card": "",
      "Totale": "",
      "Stripe ID / Rif.": "",
    })
    
    // Riga totali incasso
    rows.push({
      "Data": "TOTALI INGRESSO",
      "Ora": "",
      "Tipo": "",
      "Codice Univoco": "",
      "Rif. Ordine": "",
      "Fonte": "",
      "Metodo Rimborso": "",
      "Cliente": "",
      "Dettaglio": "",
      "Prodotti": `+${totals.productRevenue.toFixed(2)}€`,
      "Gift Card": `+${totals.giftCardRevenue.toFixed(2)}€`,
      "Totale": `+${totals.totalRevenue.toFixed(2)}€`,
      "Stripe ID / Rif.": "",
    })
    
    // Riga totali rimborsi
    rows.push({
      "Data": "TOTALI RIMBORSI",
      "Ora": "",
      "Tipo": "",
      "Codice Univoco": "",
      "Rif. Ordine": "",
      "Fonte": "",
      "Metodo Rimborso": "",
      "Cliente": "",
      "Dettaglio": "",
      "Prodotti": `-${totals.productRefunds.toFixed(2)}€`,
      "Gift Card": `-${totals.giftCardRefunds.toFixed(2)}€`,
      "Totale": `-${totals.totalRefunds.toFixed(2)}€`,
      "Stripe ID / Rif.": "",
    })
    
    // Riga netto
    rows.push({
      "Data": "NETTO GIORNO",
      "Ora": "",
      "Tipo": "",
      "Codice Univoco": "",
      "Rif. Ordine": "",
      "Fonte": "",
      "Metodo Rimborso": "",
      "Cliente": "",
      "Dettaglio": "",
      "Prodotti": `${totals.netProductRevenue >= 0 ? '+' : ''}${totals.netProductRevenue.toFixed(2)}€`,
      "Gift Card": `${totals.netGiftCardRevenue >= 0 ? '+' : ''}${totals.netGiftCardRevenue.toFixed(2)}€`,
      "Totale": `${totals.netRevenue >= 0 ? '+' : ''}${totals.netRevenue.toFixed(2)}€`,
      "Stripe ID / Rif.": "",
    })

    const ws = XLSX.utils.json_to_sheet(rows)
    const wb = XLSX.utils.book_new()
    XLSX.utils.book_append_sheet(wb, ws, "Riepilogo")
    
    // Auto-width per colonne
    const colWidths = [
      { wch: 12 }, // Data
      { wch: 8 },  // Ora
      { wch: 10 }, // Tipo
      { wch: 18 }, // Codice Univoco
      { wch: 18 }, // Rif. Ordine
      { wch: 10 }, // Fonte
      { wch: 10 }, // Metodo Rimborso
      { wch: 25 }, // Cliente
      { wch: 30 }, // Dettaglio
      { wch: 12 }, // Prodotti
      { wch: 12 }, // Gift Card
      { wch: 12 }, // Totale
      { wch: 30 }, // Stripe ID / Rif.
    ]
    ws['!cols'] = colWidths
    
    XLSX.writeFile(wb, `LoScalo_Contabilita_${selectedDate}.xlsx`)
  }

  // Generate and download PDF with detail
  const generatePDF = async () => {
    if (transactions.length === 0) return

    const pdfDoc = await PDFDocument.create()
    let page = pdfDoc.addPage([842, 595]) // A4 Landscape
    const { width, height } = page.getSize()
    const font = await pdfDoc.embedFont(StandardFonts.Helvetica)
    const fontBold = await pdfDoc.embedFont(StandardFonts.HelveticaBold)
    
    let y = height - 50
    const margin = 40
    const rowHeight = 12
    
    // Header
    page.drawText("Lo Scalo - Contabilità Giornaliera", {
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
    
    // Process each transaction with detail
    transactions.forEach((tx) => {
      const isOrder = tx.type === 'ORDER'
      const isRefund = tx.type === 'REFUND'
      const time = new Date(tx.date).toLocaleTimeString("it-IT", { hour: "2-digit", minute: "2-digit" })
      
      checkNewPage(80) // Space for header
      
      // Transaction header background
      page.drawRectangle({
        x: margin - 5,
        y: y - 8,
        width: width - margin * 2,
        height: 20,
        color: isRefund ? rgb(1, 0.95, 0.95) : rgb(0.95, 0.95, 0.95),
      })
      
      // Transaction header row
      const typeLabel = isOrder ? "ORDINE" : "RIMBORSO"
      const numberText = tx.orderSource === "MANUAL" 
        ? `#${tx.number} (MANUALE)` 
        : `#${tx.number}`
      
      // Type label
      page.drawText(`[${typeLabel}]`, {
        x: margin,
        y,
        size: 9,
        font: fontBold,
        color: isRefund ? rgb(0.8, 0.2, 0.2) : rgb(0.2, 0.6, 0.2),
      })
      
      // Number
      page.drawText(numberText, {
        x: margin + 70,
        y,
        size: 10,
        font: fontBold,
        color: rgb(0, 0, 0),
      })
      
      // Time
      page.drawText(time, {
        x: margin + 250,
        y,
        size: 9,
        font,
        color: rgb(0.4, 0.4, 0.4),
      })
      
      // Total
      const totalText = isOrder ? `+${tx.total.toFixed(2)}€` : `-${Math.abs(tx.total).toFixed(2)}€`
      page.drawText(totalText, {
        x: width - margin - 80,
        y,
        size: 10,
        font: fontBold,
        color: isRefund ? rgb(0.8, 0.2, 0.2) : rgb(0.8, 0.3, 0.1),
      })
      
      y -= rowHeight + 5
      
      // Ref order for refunds
      if (isRefund && tx.order) {
        checkNewPage(15)
        page.drawText(`Rif. Ordine: #${tx.order.orderNumber}`, {
          x: margin + 20,
          y,
          size: 8,
          font,
          color: rgb(0.5, 0.5, 0.5),
        })
        y -= rowHeight
      }
      
      // Products detail for orders
      if (isOrder && tx.items && tx.items.length > 0) {
        checkNewPage(tx.items.length * rowHeight + 25)
        
        page.drawText("Prodotti:", {
          x: margin + 20,
          y,
          size: 9,
          font: fontBold,
          color: rgb(0.2, 0.4, 0.8),
        })
        y -= rowHeight
        
        tx.items.forEach((item) => {
          const sizeText = item.size ? ` (${item.size})` : ""
          page.drawText(`• ${item.quantity}x ${item.product?.name || 'Prodotto eliminato'}${sizeText} (${item.totalPrice.toFixed(2)}€)`, {
            x: margin + 30,
            y,
            size: 8,
            font,
            color: rgb(0, 0, 0),
          })
          y -= rowHeight
        })
        
        page.drawText(`Totale Prodotti: +${tx.productTotal.toFixed(2)}€`, {
          x: width - margin - 150,
          y,
          size: 8,
          font: fontBold,
          color: rgb(0.2, 0.4, 0.8),
        })
        y -= rowHeight + 2
      } else if (isRefund) {
        const refundItems = (tx as any).refundItems as RefundItem[] || []
        const productItems = refundItems.filter((i: RefundItem) => i.type === 'PRODUCT')
        if (productItems.length > 0) {
          checkNewPage(productItems.length * rowHeight + 20)
          
          page.drawText("Prodotti:", {
            x: margin + 20,
            y,
            size: 9,
            font: fontBold,
            color: rgb(0.2, 0.4, 0.8),
          })
          y -= rowHeight
          
          productItems.forEach((item: RefundItem) => {
            // item.price è già in euro
            const itemTotal = item.price * (item.quantity || 1)
            page.drawText(`• ${item.name}: -${itemTotal.toFixed(2)}€`, {
              x: margin + 30,
              y,
              size: 8,
              font,
              color: rgb(0, 0, 0),
            })
            y -= rowHeight
          })

          page.drawText(`Totale Prodotti: +${tx.productTotal.toFixed(2)}€`, {
            x: width - margin - 150,
            y,
            size: 8,
            font: fontBold,
            color: rgb(0.2, 0.4, 0.8),
          })
          y -= rowHeight + 2
        }
      }
      
      // Gift Cards detail for orders
      if (isOrder && tx.giftCards && tx.giftCards.length > 0) {
        checkNewPage(tx.giftCards.length * rowHeight + 25)
        
        page.drawText("Gift Card:", {
          x: margin + 20,
          y,
          size: 9,
          font: fontBold,
          color: rgb(0.6, 0.2, 0.6),
        })
        y -= rowHeight
        
        tx.giftCards.forEach((gc) => {
          page.drawText(`• ${gc.code} (${gc.initialValue.toFixed(2)}€)`, {
            x: margin + 30,
            y,
            size: 8,
            font,
            color: rgb(0, 0, 0),
          })
          y -= rowHeight
        })
        
        page.drawText(`Totale Gift Card: +${tx.giftCardTotal.toFixed(2)}€`, {
          x: width - margin - 150,
          y,
          size: 8,
          font: fontBold,
          color: rgb(0.6, 0.2, 0.6),
        })
        y -= rowHeight + 2
      } else if (isRefund) {
        const refundItems = (tx as any).refundItems as RefundItem[] || []
        const gcItems = refundItems.filter((i: RefundItem) => i.type === 'GIFT_CARD')
        if (gcItems.length > 0) {
          checkNewPage(gcItems.length * rowHeight + 20)
          
          page.drawText("Gift Card:", {
            x: margin + 20,
            y,
            size: 9,
            font: fontBold,
            color: rgb(0.6, 0.2, 0.6),
          })
          y -= rowHeight
          
          gcItems.forEach((item: RefundItem) => {
            // item.value è in euro per gift card
            const itemValue = item.value || item.price || 0
            page.drawText(`• ${item.name}: -${itemValue.toFixed(2)}€`, {
              x: margin + 30,
              y,
              size: 8,
              font,
              color: rgb(0, 0, 0),
            })
            y -= rowHeight
          })
          page.drawText(`Totale Gift Card: +${tx.giftCardTotal.toFixed(2)}€`, {
            x: width - margin - 150,
            y,
            size: 8,
            font: fontBold,
            color: rgb(0.6, 0.2, 0.6),
          })
          y -= rowHeight + 2

          y -= 2
        }
      }
      
      // Refund method for refunds
      if (isRefund && tx.refundMethod) {
        checkNewPage(15)
        page.drawText(`Metodo: ${tx.refundMethod}${tx.externalRef ? ` - ${tx.externalRef}` : ''}`, {
          x: margin + 20,
          y,
          size: 8,
          font,
          color: rgb(0.5, 0.5, 0.5),
        })
        y -= rowHeight
      }
      
      // Stripe ID for orders
      if (isOrder && tx.stripeId) {
        checkNewPage(15)
        page.drawText(`Stripe: ${tx.stripeId}`, {
          x: margin + 20,
          y,
          size: 7,
          font,
          color: rgb(0.5, 0.5, 0.5),
        })
        y -= rowHeight
      }
      
      // Separator between transactions
      y -= 10
    })
    
    // Footer totals
    checkNewPage(200)
    
    y -= 10
    page.drawLine({
      start: { x: margin, y },
      end: { x: width - margin, y },
      thickness: 2,
      color: rgb(0, 0, 0),
    })
    
    y -= 25
    page.drawText("RIEPILOGO GIORNO", {
      x: margin,
      y,
      size: 14,
      font: fontBold,
      color: rgb(0, 0, 0),
    })
    
    // Sezione INCASSI
    y -= 20
    page.drawText("INCASSI", {
      x: margin + 10,
      y,
      size: 11,
      font: fontBold,
      color: rgb(0.4, 0.4, 0.4),
    })
    
    y -= 15
    page.drawText(`Prodotti: +${totals.productRevenue.toFixed(2)}€`, {
      x: margin + 20,
      y,
      size: 10,
      font,
      color: rgb(0.2, 0.4, 0.8),
    })
    
    y -= 14
    page.drawText(`Gift Card: +${totals.giftCardRevenue.toFixed(2)}€`, {
      x: margin + 20,
      y,
      size: 10,
      font,
      color: rgb(0.6, 0.2, 0.6),
    })
    
    y -= 15
    page.drawText(`Totale Incasso: +${totals.totalRevenue.toFixed(2)}€`, {
      x: margin + 20,
      y,
      size: 11,
      font: fontBold,
      color: rgb(0.2, 0.6, 0.2),
    })
    
    // Sezione RIMBORSI
    y -= 20
    page.drawText("RIMBORSI", {
      x: margin + 10,
      y,
      size: 11,
      font: fontBold,
      color: rgb(0.4, 0.4, 0.4),
    })
    
    y -= 15
    page.drawText(`Prodotti: -${totals.productRefunds.toFixed(2)}€`, {
      x: margin + 20,
      y,
      size: 10,
      font,
      color: rgb(0.8, 0.2, 0.2),
    })
    
    y -= 14
    page.drawText(`Gift Card: -${totals.giftCardRefunds.toFixed(2)}€`, {
      x: margin + 20,
      y,
      size: 10,
      font,
      color: rgb(0.8, 0.2, 0.2),
    })
    
    y -= 15
    page.drawText(`Totale Rimborsi: -${totals.totalRefunds.toFixed(2)}€`, {
      x: margin + 20,
      y,
      size: 11,
      font: fontBold,
      color: rgb(0.8, 0.2, 0.2),
    })
    
    // NETTO
    y -= 22
    page.drawLine({
      start: { x: margin, y: y + 10 },
      end: { x: margin + 250, y: y + 10 },
      thickness: 1,
      color: rgb(0, 0, 0),
    })
    
    y -= 5
    page.drawText(`NETTO GIORNO: ${totals.netRevenue >= 0 ? '+' : ''}${totals.netRevenue.toFixed(2)}€`, {
      x: margin,
      y,
      size: 16,
      font: fontBold,
      color: rgb(0, 0, 0),
    })
    
    const pdfBytes = await pdfDoc.save()
    const blob = new Blob([pdfBytes as unknown as ArrayBuffer], { type: "application/pdf" })
    const link = document.createElement("a")
    link.href = URL.createObjectURL(blob)
    link.download = `LoScalo_Contabilita_${selectedDate}.pdf`
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
              title="Giorno precedente"
              aria-label="Giorno precedente"
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
                title="Seleziona data"
                aria-label="Seleziona data"
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
              title="Giorno successivo"
              aria-label="Giorno successivo"
            >
              <ChevronRight className="w-6 h-6 text-brand-dark" />
            </button>
          </div>
        </div>

        {/* Summary Cards - Ordini e Rimborsi */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
          {/* Card ORDINI */}
          <div className="bg-white rounded-2xl shadow-card p-5">
            <div className="flex items-center gap-3 mb-4 pb-3 border-b border-brand-light-gray">
              <div className="w-10 h-10 bg-green-100 rounded-xl flex items-center justify-center">
                <PlusCircle className="w-5 h-5 text-green-600" />
              </div>
              <span className="text-title-sm font-bold text-green-700">ORDINI</span>
            </div>
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-body-sm text-brand-gray">Prodotti</span>
                <span className="text-body-lg font-bold text-blue-600">{totals.productRevenue.toFixed(2)}€</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-body-sm text-brand-gray">Gift Card</span>
                <span className="text-body-lg font-bold text-purple-600">{totals.giftCardRevenue.toFixed(2)}€</span>
              </div>
              <div className="flex items-center justify-between pt-3 border-t border-brand-light-gray">
                <span className="text-body-sm font-bold text-green-700">Totale Ordini</span>
                <span className="text-headline-sm font-bold text-green-600">+{totals.totalRevenue.toFixed(2)}€</span>
              </div>
            </div>
          </div>

          {/* Card RIMBORSI */}
          <div className="bg-white rounded-2xl shadow-card p-5">
            <div className="flex items-center gap-3 mb-4 pb-3 border-b border-brand-light-gray">
              <div className="w-10 h-10 bg-red-100 rounded-xl flex items-center justify-center">
                <MinusCircle className="w-5 h-5 text-red-600" />
              </div>
              <span className="text-title-sm font-bold text-red-700">RIMBORSI</span>
            </div>
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-body-sm text-brand-gray">Prodotti</span>
                <span className="text-body-lg font-bold text-blue-600">{totals.productRefunds.toFixed(2)}€</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-body-sm text-brand-gray">Gift Card</span>
                <span className="text-body-lg font-bold text-purple-600">{totals.giftCardRefunds.toFixed(2)}€</span>
              </div>
              <div className="flex items-center justify-between pt-3 border-t border-brand-light-gray">
                <span className="text-body-sm font-bold text-red-700">Totale Rimborsi</span>
                <span className="text-headline-sm font-bold text-red-600">-{totals.totalRefunds.toFixed(2)}€</span>
              </div>
            </div>
          </div>
        </div>

        {/* Note: Solo ordini pagati */}
        <div className="mb-4 space-y-2">
          <p className="text-body-sm text-brand-gray">
            Vengono mostrati solo gli ordini con pagamento completato (data pagamento: {new Date(selectedDate).toLocaleDateString("it-IT")}) e i rimborsi effettuati in quella data, indipendentemente dalla data dell'ordine originale. Se non vedi un ordine che ti aspetti, controlla se è stato pagato e se la data di pagamento è corretta.
          </p>
          {paidOrdersWithoutPaidAtCount > 0 && (
            <div className="flex items-center gap-2 px-3 py-2 bg-red-50 border border-red-200 rounded-lg">
              <AlertCircle className="w-4 h-4 text-red-600 flex-shrink-0" />
              <p className="text-body-sm text-red-700">
                Attenzione: {paidOrdersWithoutPaidAtCount} {paidOrdersWithoutPaidAtCount === 1 ? 'ordine in stato pagato' : 'ordini in stato pagati'} senza data di pagamento registrata. Controlla su stripe se sono effettivamente stati pagati.
                {paidOrdersWithoutPaidAtCount === 1 ? ' Aggiornare l\'ordine' : ' Aggiornare gli ordini'} sul database contattando l'amministratore di sistema.
              </p>
            </div>
          )}
        </div>

        {/* Orders Count & Export Buttons */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 mb-4">
          <h2 className="text-title-md font-bold text-brand-dark">
            {transactions.length} {transactions.length === 1 ? "transazione" : "transazioni"} ({orders.length} ordini, {refunds.length} rimborsi)
          </h2>
          <div className="flex items-center gap-2">
            <button
              onClick={exportToExcel}
              disabled={transactions.length === 0}
              className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-full text-body-sm font-medium hover:bg-green-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <FileSpreadsheet className="w-4 h-4" />
              Export Excel
            </button>
            <button
              onClick={generatePDF}
              disabled={transactions.length === 0}
              className="flex items-center gap-2 px-4 py-2 bg-brand-primary text-white rounded-full text-body-sm font-medium hover:bg-brand-dark transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <Printer className="w-4 h-4" />
              Stampa PDF
            </button>
          </div>
        </div>

        {/* Desktop Table View */}
        {orders.length > 0 ? (
          <>
            {/* Desktop: Table */}
            <div className="hidden md:block bg-white rounded-2xl shadow-card overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-brand-cream border-b border-brand-light-gray">
                    <tr>
                      <th className="text-left py-3 px-4 text-label-md font-bold text-brand-gray">Data/Ora</th>
                      <th className="text-left py-3 px-4 text-label-md font-bold text-brand-gray">Tipo</th>
                      <th className="text-left py-3 px-4 text-label-md font-bold text-brand-gray">Codice Univoco</th>
                      <th className="text-left py-3 px-4 text-label-md font-bold text-brand-gray">Rif. Ordine</th>
                      <th className="text-left py-3 px-4 text-label-md font-bold text-brand-gray">Fonte</th>
                      <th className="text-left py-3 px-4 text-label-md font-bold text-brand-gray">Metodo Rimborso</th>
                      <th className="text-left py-3 px-4 text-label-md font-bold text-brand-gray">Stripe ID / Rif.</th>
                      <th className="text-left py-3 px-4 text-label-md font-bold text-brand-gray">Dettaglio</th>
                      <th className="text-right py-3 px-4 text-label-md font-bold text-brand-gray">Prodotti</th>
                      <th className="text-right py-3 px-4 text-label-md font-bold text-brand-gray">Gift Card</th>
                      <th className="text-right py-3 px-4 text-label-md font-bold text-brand-gray">Totale</th>
                    </tr>
                  </thead>
                  <tbody>
                    {transactions.map((tx) => {
                      const isOrder = tx.type === 'ORDER'
                      const isRefund = tx.type === 'REFUND'
                      return (
                        <tr 
                          key={`${tx.type}-${tx.id}`} 
                          className={`border-b border-brand-light-gray/50 last:border-b-0 hover:bg-brand-cream/50 ${isRefund ? 'bg-red-50/30' : ''}`}
                        >
                          {/* Data/Ora */}
                          <td className="py-3 px-4">
                            <div className="text-body-sm text-brand-dark">
                              {new Date(tx.date).toLocaleDateString("it-IT", { day: '2-digit', month: '2-digit', year: 'numeric' })}
                            </div>
                            <div className="text-label-sm text-brand-gray">
                              {new Date(tx.date).toLocaleTimeString("it-IT", { hour: "2-digit", minute: "2-digit" })}
                            </div>
                          </td>

                          {/* Tipo */}
                          <td className="py-3 px-4">
                            {isOrder ? (
                              <span className="px-2 py-0.5 text-green-600 text-label-sm font-medium rounded">
                                Ordine
                              </span>
                            ) : (
                              <span className="px-2 py-0.5 text-red-600 text-label-sm font-medium rounded">
                                Rimborso
                              </span>
                            )}
                          </td>

                          {/* Codice Univoco */}
                          <td className="py-3 px-4">
                            <div className="font-mono text-body-sm font-bold text-brand-dark">
                              #{tx.number}
                            </div>
                          </td>

                          {/* Rif. Ordine (solo per rimborsi) */}
                          <td className="py-3 px-4">
                            {isRefund && tx.order ? (
                              <div className="font-mono text-body-sm text-brand-black">
                                #{tx.order.orderNumber}
                              </div>
                            ) : (
                              <span className="text-label-sm text-brand-gray">-</span>
                            )}
                          </td>

                          {/* Fonte */}
                          <td className="py-3 px-4">
                            {tx.orderSource === "MANUAL" ? (
                              <span className="px-2 py-0.5 text-label-sm text-brand-black font-small rounded">
                                Manuale
                              </span>
                            ) : (
                              <span className="px-2 py-0.5 text-label-sm text-brand-black font-small rounded">Online</span>
                            )}
                          </td>

                          {/* Metodo Rimborso */}
                          <td className="py-3 px-4">
                            {isRefund && tx.refundMethod ? (
                              <span className={`px-2 py-0.5 text-label-sm font-small rounded ${
                                tx.refundMethod === 'STRIPE' ? 'text-brand-black' :
                                tx.refundMethod === 'POS' ? 'text-brand-black' :
                                'text-brand-black'
                              }`}>
                                {tx.refundMethod}
                              </span>
                            ) : (
                              <span className="text-label-sm text-brand-gray">-</span>
                            )}
                          </td>

                          {/* Stripe ID / Rif. Documento */}
                          <td className="py-3 px-4">
                            {isOrder && tx.stripeId ? (
                              <a
                                href={`${process.env.NEXT_PUBLIC_STRIPE_DASHBOARD_URL}${tx.stripeId}`}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="font-mono text-label-sm text-brand-dark max-w-[160px]"
                              >
                                {tx.stripeId}
                              </a>
                            ) : isRefund && tx.externalRef ? (
                              <span className="font-mono text-label-sm text-brand-dark max-w-[160px]">
                                {tx.externalRef}
                              </span>
                            ) : (
                              <span className="font-mono text-label-sm text-brand-dark max-w-[160px]">-</span>
                            )}
                          </td>

                          {/* Dettaglio */}
                          <td className="py-3 px-4">
                            <div className="space-y-1 max-w-xs">
                              {isOrder ? (
                                <>
                                  {/* Prodotti ordine */}
                                  {tx.items && tx.items.length > 0 && tx.items.map((item, idx) => (
                                    <div key={idx} className="text-body-sm text-brand-dark">
                                      <span className="text-blue-600">{item.quantity}x {item.product?.name || 'Prodotto eliminato'} {item.size ? `(${item.size})` : ''}</span>
                                      <span className="text-brand-gray ml-1">({item.totalPrice.toFixed(2)}€)</span>
                                    </div>
                                  ))}
                                  {/* Gift Card ordine */}
                                  {tx.giftCards && tx.giftCards.length > 0 && tx.giftCards.map((gc, idx) => (
                                    <div key={`gc-${idx}`} className="text-body-sm text-brand-dark">
                                      <span className="text-purple-600">1x Gift Card {gc.code}</span>
                                      <span className="text-brand-gray ml-1">({gc.initialValue.toFixed(2)}€)</span>
                                    </div>
                                  ))}
                                </>
                              ) : (
                                <>
                                  {/* Items rimborso */}
                                  {(tx as any).refundItems?.map((item: RefundItem, idx: number) => {
                                    // item.price/value è già in euro
                                    return (
                                      <div key={idx} className="text-body-sm text-brand-dark">
                                        {item.type === 'PRODUCT' ? (
                                          <>
                                            <span className="text-blue-600">{item.quantity || 1}x {item.name} {item.size ? `(${item.size})` : ''}</span>
                                            <span className="text-brand-gray ml-1">({(item.price * (item.quantity || 1)).toFixed(2)}€)</span>
                                          </>
                                        ) : (
                                          <>
                                            <span className="text-purple-600">1x {item.name}</span>
                                            <span className="text-brand-gray ml-1">({(item.value || item.price || 0).toFixed(2)}€)</span>
                                          </>
                                        )}
                                      </div>
                                    )
                                  })}
                                </>
                              )}
                            </div>
                          </td>

                          {/* Prodotti */}
                          <td className="py-3 px-4 text-right">
                            {tx.productTotal > 0 ? (
                              <span className="text-body-sm font-bold text-blue-600">
                                {isRefund ? '-' : '+'}{tx.productTotal.toFixed(2)}€
                              </span>
                            ) : (
                              <span className="text-body-sm text-brand-gray">-</span>
                            )}
                          </td>

                          {/* Gift Card */}
                          <td className="py-3 px-4 text-right">
                            {tx.giftCardTotal > 0 ? (
                              <span className="text-body-sm font-bold text-purple-600">
                                {isRefund ? '-' : '+'}{tx.giftCardTotal.toFixed(2)}€
                              </span>
                            ) : (
                              <span className="text-body-sm text-brand-gray">-</span>
                            )}
                          </td>

                          {/* Totale */}
                          <td className="py-3 px-4 text-right">
                            <span className={`text-headline-sm font-bold ${isRefund ? 'text-red-600' : 'text-brand-primary'}`}>
                              {isRefund ? '' : '+'}{tx.total.toFixed(2)}€
                            </span>
                          </td>
                        </tr>
                      )
                    })}
                  </tbody>
                  <tfoot className="bg-brand-cream border-t-2 border-brand-light-gray">
                    <tr>
                      <td colSpan={12} className="py-4 px-4">
                        <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
                          {/* Sezione ORDINI */}
                          <div className="flex-1 w-full md:w-auto">
                            <div className="text-label-md font-bold text-green-700 mb-2 uppercase tracking-wide">Ordini</div>
                            <div className="space-y-1">
                              <div className="flex items-center justify-between gap-8">
                                <span className="text-body-sm text-brand-gray">Prodotti:</span>
                                <span className="text-body-sm font-bold text-blue-600">{totals.productRevenue.toFixed(2)}€</span>
                              </div>
                              <div className="flex items-center justify-between gap-8">
                                <span className="text-body-sm text-brand-gray">Gift Card:</span>
                                <span className="text-body-sm font-bold text-purple-600">{totals.giftCardRevenue.toFixed(2)}€</span>
                              </div>
                              <div className="flex items-center justify-between gap-8 pt-1 border-t border-brand-light-gray/50">
                                <span className="text-body-sm font-bold text-green-700">Totale Ordini:</span>
                                <span className="text-body-md font-bold text-green-600">+{totals.totalRevenue.toFixed(2)}€</span>
                              </div>
                            </div>
                          </div>
                          
                          {/* Sezione RIMBORSI */}
                          <div className="flex-1 w-full md:w-auto">
                            <div className="text-label-md font-bold text-red-700 mb-2 uppercase tracking-wide">Rimborsi</div>
                            <div className="space-y-1">
                              <div className="flex items-center justify-between gap-8">
                                <span className="text-body-sm text-brand-gray">Prodotti:</span>
                                <span className="text-body-sm font-bold text-blue-600">-{totals.productRefunds.toFixed(2)}€</span>
                              </div>
                              <div className="flex items-center justify-between gap-8">
                                <span className="text-body-sm text-brand-gray">Gift Card:</span>
                                <span className="text-body-sm font-bold text-purple-600">-{totals.giftCardRefunds.toFixed(2)}€</span>
                              </div>
                              <div className="flex items-center justify-between gap-8 pt-1 border-t border-brand-light-gray/50">
                                <span className="text-body-sm font-bold text-red-700">Totale Rimborsi:</span>
                                <span className="text-body-md font-bold text-red-600">-{totals.totalRefunds.toFixed(2)}€</span>
                              </div>
                            </div>
                          </div>
                          
                          {/* NETTO */}
                          <div className="text-right min-w-[150px]">
                            <div className="text-label-sm font-bold text-brand-gray uppercase tracking-wide mb-1">NETTO GIORNO:</div>
                            <div className="text-headline-lg font-bold text-brand-primary">
                              {totals.netRevenue.toFixed(2)}€
                            </div>
                          </div>
                        </div>
                      </td>
                    </tr>
                  </tfoot>
                </table>
              </div>
            </div>

            {/* Mobile: Card View */}
            <div className="md:hidden space-y-4">
              {transactions.map((tx) => {
                const isOrder = tx.type === 'ORDER'
                const isRefund = tx.type === 'REFUND'
                return (
                  <div 
                    key={`${tx.type}-${tx.id}`} 
                    className={`bg-white rounded-2xl shadow-card p-4 ${isRefund ? 'border-l-4 border-red-500' : ''}`}
                  >
                    {/* Header: Type + Number + Total */}
                    <div className="flex items-start justify-between mb-3 pb-3 border-b border-brand-light-gray">
                      <div>
                        <div className="flex items-center gap-2">
                          <span className={`px-2 py-0.5 text-label-sm font-small rounded ${
                            isOrder ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'
                          }`}>
                            {isOrder ? 'Ordine' : 'Rimborso'}
                          </span>
                        </div>
                        <div className="font-mono text-title-md font-bold text-brand-dark mt-1">
                          #{tx.number}
                        </div>
                        <div className="text-body-sm text-brand-gray">
                          {new Date(tx.date).toLocaleDateString("it-IT")} {new Date(tx.date).toLocaleTimeString("it-IT", { hour: "2-digit", minute: "2-digit" })}
                        </div>
                      </div>
                      <div className="text-right">
                        <div className={`text-headline-sm font-bold ${isRefund ? 'text-red-600' : 'text-brand-primary'}`}>
                          {isRefund ? '-' : '+'}{Math.abs(tx.total).toFixed(2)}€
                        </div>
                      </div>
                    </div>

                    {/* Info Grid - Fonte, Metodo, Rif. Ordine */}
                    <div className="mb-3 grid grid-cols-2 gap-2">
                      {/* Fonte */}
                      <div className="bg-brand-cream rounded-lg p-2">
                        <div className="text-label-sm text-brand-gray">Fonte</div>
                        <div className={`text-body-sm font-bold ${tx.orderSource === "MANUAL" ? 'text-amber-600' : 'text-green-600'}`}>
                          {tx.orderSource === "MANUAL" ? 'Manuale' : 'Online'}
                        </div>
                      </div>
                      
                      {/* Metodo Rimborso (solo per rimborsi) */}
                      {isRefund && tx.refundMethod && (
                        <div className="bg-red-50 rounded-lg p-2">
                          <div className="text-label-sm text-brand-gray">Metodo</div>
                          <div className="text-body-sm font-bold text-red-600">
                            {tx.refundMethod}
                          </div>
                        </div>
                      )}
                      
                      {/* Rif. Ordine (solo per rimborsi) */}
                      {isRefund && tx.order && (
                        <div className="bg-brand-cream rounded-lg p-2">
                          <div className="text-label-sm text-brand-gray">Rif. Ordine</div>
                          <div className="font-mono text-body-sm text-brand-dark">#{tx.order.orderNumber}</div>
                        </div>
                      )}
                      
                      {/* Stripe ID / Rif. Documento */}
                      {(tx.stripeId || tx.externalRef) && (
                        <div className="bg-brand-cream rounded-lg p-2">
                          <div className="text-label-sm text-brand-gray">
                            {isOrder ? 'Stripe ID' : 'Rif. Documento'}
                          </div>
                          <div className="font-mono text-body-xs text-brand-dark truncate">
                            {isOrder ? tx.stripeId : tx.externalRef}
                          </div>
                        </div>
                      )}
                    </div>

                    {/* Customer Info */}
                    <div className="mb-3">
                      <div className="text-label-sm text-brand-gray mb-1">Cliente</div>
                      <div className="text-body-sm text-brand-dark">{tx.email}</div>
                    </div>

                    {/* Detail Section */}
                    <div className="mb-3">
                      <div className="text-label-sm text-brand-gray mb-2">Dettaglio</div>
                      
                      {isOrder ? (
                        <>
                          {/* Products */}
                          {tx.items && tx.items.length > 0 && (
                            <div className="bg-blue-50 rounded-xl p-3 mb-2">
                              <div className="flex items-center gap-2 mb-2">
                                <Package className="w-4 h-4 text-blue-500" />
                                <span className="text-label-sm font-bold text-blue-700">Prodotti</span>
                                <span className="ml-auto text-body-sm font-bold text-blue-700">
                                  +{tx.productTotal.toFixed(2)}€
                                </span>
                              </div>
                              <div className="space-y-1">
                                {tx.items.map((item, idx) => (
                                  <div key={idx} className="text-body-sm text-brand-dark">
                                    • {item.quantity}x {item.product?.name || 'Prodotto eliminato'} {item.size ? `(${item.size})` : ''} ({item.totalPrice.toFixed(2)}€)
                                  </div>
                                ))}
                              </div>
                            </div>
                          )}

                          {/* Gift Cards */}
                          {tx.giftCards && tx.giftCards.length > 0 && (
                            <div className="bg-purple-50 rounded-xl p-3">
                              <div className="flex items-center gap-2 mb-2">
                                <Gift className="w-4 h-4 text-purple-500" />
                                <span className="text-label-sm font-bold text-purple-700">Gift Card</span>
                                <span className="ml-auto text-body-sm font-bold text-purple-700">
                                  +{tx.giftCardTotal.toFixed(2)}€
                                </span>
                              </div>
                              <div className="space-y-1">
                                {tx.giftCards.map((gc, idx) => (
                                  <div key={`gc-${idx}`} className="text-body-sm text-brand-dark">
                                    • {gc.code} ({gc.initialValue.toFixed(2)}€)
                                  </div>
                                ))}
                              </div>
                            </div>
                          )}
                        </>
                      ) : (
                        /* Refund Items - Separati per Prodotti e Gift Card */
                        <>
                          {/* Prodotti rimborsati */}
                          {(tx as any).refundItems?.some((i: RefundItem) => i.type === 'PRODUCT') && (
                            <div className="bg-red-50 rounded-xl p-3 mb-2 border border-red-100">
                              <div className="flex items-center gap-2 mb-2">
                                <Package className="w-4 h-4 text-red-500" />
                                <span className="text-label-sm font-bold text-red-700">Prodotti</span>
                                <span className="ml-auto text-body-sm font-bold text-red-600">
                                  -{tx.productTotal.toFixed(2)}€
                                </span>
                              </div>
                              <div className="space-y-1">
                                {(tx as any).refundItems?.filter((i: RefundItem) => i.type === 'PRODUCT').map((item: RefundItem, idx: number) => {
                                  // item.price è già in euro (non cents)
                                  const itemTotal = item.price * (item.quantity || 1)
                                  return (
                                    <div key={idx} className="text-body-sm text-brand-dark">
                                      • {item.quantity || 1}x {item.name} {item.size ? `(${item.size})` : ''} ({itemTotal.toFixed(2)}€)
                                    </div>
                                  )
                                })}
                              </div>
                            </div>
                          )}
                          
                          {/* Gift Card rimborsate */}
                          {(tx as any).refundItems?.some((i: RefundItem) => i.type === 'GIFT_CARD') && (
                            <div className="bg-red-50 rounded-xl p-3 border border-red-100">
                              <div className="flex items-center gap-2 mb-2">
                                <Gift className="w-4 h-4 text-red-500" />
                                <span className="text-label-sm font-bold text-red-700">Gift Card</span>
                                <span className="ml-auto text-body-sm font-bold text-red-600">
                                  -{tx.giftCardTotal.toFixed(2)}€
                                </span>
                              </div>
                              <div className="space-y-1">
                                {(tx as any).refundItems?.filter((i: RefundItem) => i.type === 'GIFT_CARD').map((item: RefundItem, idx: number) => {
                                  // item.value è in euro (per gift card)
                                  const itemValue = item.value || item.price || 0
                                  return (
                                    <div key={idx} className="text-body-sm text-brand-dark">
                                      • 1x {item.name} ({itemValue.toFixed(2)}€)
                                    </div>
                                  )
                                })}
                              </div>
                            </div>
                          )}
                        </>
                      )}
                    </div>

                    {/* Stripe ID / External Ref */}
                    {(tx.stripeId || tx.externalRef) && (
                      <div className="pt-3 border-t border-brand-light-gray">
                        <div className="text-label-sm text-brand-gray mb-1">
                          {isOrder ? 'Stripe ID' : 'Riferimento Rimborso'}
                        </div>
                        {isOrder && tx.stripeId ? (
                          <a
                            href={`${process.env.NEXT_PUBLIC_STRIPE_DASHBOARD_URL}${tx.stripeId}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="font-mono text-body-xs text-brand-primary hover:underline break-all"
                          >
                            {tx.stripeId}
                          </a>
                        ) : (
                          <span className="font-mono text-body-xs text-brand-gray">
                            {tx.externalRef}
                          </span>
                        )}
                      </div>
                    )}
                  </div>
                )
              })}

              {/* Mobile Total Footer */}
              <div className="bg-white rounded-2xl shadow-card p-4">
                {/* Sezione ORDINI */}
                <div className="mb-4 pb-3 border-b border-brand-light-gray">
                  <div className="text-label-md font-bold text-green-700 mb-2 uppercase tracking-wide">Ordini</div>
                  <div className="space-y-1">
                    <div className="flex items-center justify-between text-body-sm">
                      <span className="text-brand-gray">Prodotti:</span>
                      <span className="font-bold text-blue-600">{totals.productRevenue.toFixed(2)}€</span>
                    </div>
                    <div className="flex items-center justify-between text-body-sm">
                      <span className="text-brand-gray">Gift Card:</span>
                      <span className="font-bold text-purple-600">{totals.giftCardRevenue.toFixed(2)}€</span>
                    </div>
                    <div className="flex items-center justify-between text-body-sm pt-2 border-t border-brand-light-gray/50">
                      <span className="font-bold text-green-700">Totale Ordini:</span>
                      <span className="font-bold text-green-600">+{totals.totalRevenue.toFixed(2)}€</span>
                    </div>
                  </div>
                </div>
                
                {/* Sezione RIMBORSI */}
                <div className="mb-4 pb-3 border-b border-brand-light-gray">
                  <div className="text-label-md font-bold text-red-700 mb-2 uppercase tracking-wide">Rimborsi</div>
                  <div className="space-y-1">
                    <div className="flex items-center justify-between text-body-sm">
                      <span className="text-brand-gray">Prodotti:</span>
                      <span className="font-bold text-blue-600">-{totals.productRefunds.toFixed(2)}€</span>
                    </div>
                    <div className="flex items-center justify-between text-body-sm">
                      <span className="text-brand-gray">Gift Card:</span>
                      <span className="font-bold text-purple-600">-{totals.giftCardRefunds.toFixed(2)}€</span>
                    </div>
                    <div className="flex items-center justify-between text-body-sm pt-2 border-t border-brand-light-gray/50">
                      <span className="font-bold text-red-700">Totale Rimborsi:</span>
                      <span className="font-bold text-red-600">-{totals.totalRefunds.toFixed(2)}€</span>
                    </div>
                  </div>
                </div>
                
                {/* NETTO */}
                <div className="pt-2">
                  <div className="flex items-center justify-between">
                    <span className="text-label-sm font-bold text-brand-gray uppercase tracking-wide">NETTO GIORNO:</span>
                    <span className="text-headline-md font-bold text-brand-primary">
                      {totals.netRevenue.toFixed(2)}€
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
              Nessuna transazione per {formatDate(selectedDate)}
            </p>
            <p className="text-body-sm text-brand-gray/60 mt-2">
              Vengono mostrati ordini con pagamento completato e rimborsi effettuati
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
