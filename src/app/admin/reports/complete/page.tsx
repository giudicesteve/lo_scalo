"use client"

import { useState, useMemo } from "react"
import Link from "next/link"
import { 
  ArrowLeft, 
  Calendar, 
  ChevronLeft, 
  ChevronRight, 
  FileSpreadsheet,
  Printer,
  Mail,
  Send,
  CheckCircle,
  AlertCircle,
  FileText,
  Download,
} from "lucide-react"
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
  orderSource?: string
  email: string
  phone?: string
  total: number
  createdAt: string
  paidAt?: string
  stripePaymentIntentId?: string
  items: OrderItem[]
  giftCards: GiftCard[]
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
  order: {
    id: string
    orderNumber: string
    email: string
    orderSource?: string
  }
}

interface GiftCardTransaction {
  id: string
  amount: number
  type: string
  note: string | null
  receiptNumber: string | null
  receiptImage: string | null
  createdAt: string
  giftCard: {
    id: string
    code: string
    initialValue: number
    remainingValue: number
    purchasedAt: string
    order: {
      email: string
      orderNumber: string
      phone: string | null
    }
  }
}

interface ExpiredGiftCard {
  id: string
  code: string
  initialValue: number
  remainingValue: number
  purchasedAt: string
  expiresAt: string | null
  order: {
    email: string
    orderNumber: string
    phone: string | null
  }
  transactions: { id: string; amount: number }[]
}

export default function CompleteReportPage() {
  const [selectedDate, setSelectedDate] = useState(() => {
    const now = new Date()
    return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`
  })
  const [email, setEmail] = useState("")
  const [loading, setLoading] = useState(false)
  const [emailStatus, setEmailStatus] = useState<{type: 'success' | 'error', message: string} | null>(null)

  const [year, month] = selectedDate.split('-').map(Number)
  const isCurrentMonth = selectedDate === new Date().toISOString().slice(0, 7)

  const formatMonthYear = (dateStr: string) => {
    const [y, m] = dateStr.split('-').map(Number)
    return new Date(y, m - 1, 1).toLocaleDateString("it-IT", {
      month: "long",
      year: "numeric",
    })
  }

  const handleMonthChange = (direction: 'prev' | 'next') => {
    const current = new Date(year, month - 1, 1)
    if (direction === 'prev') {
      current.setMonth(current.getMonth() - 1)
    } else {
      current.setMonth(current.getMonth() + 1)
    }
    setSelectedDate(`${current.getFullYear()}-${String(current.getMonth() + 1).padStart(2, '0')}`)
  }

  const fetchAllData = async () => {
    // Fetch orders
    const ordersRes = await fetch("/api/admin/orders")
    const ordersData: Order[] = await ordersRes.json()
    
    const filteredOrders = ordersData.filter(order => {
      if (!order.paidAt) return false
      const orderDate = new Date(order.paidAt)
      const isOnMonth = orderDate.getFullYear() === year && orderDate.getMonth() === month - 1
      const isPaidOrder = ["COMPLETED", "DELIVERED"].includes(order.status)
      return isOnMonth && isPaidOrder
    }).sort((a, b) => new Date(a.paidAt!).getTime() - new Date(b.paidAt!).getTime())

    // Fetch refunds
    const refundsRes = await fetch(`/api/admin/refunds?year=${year}&month=${month}`)
    const refundsData = await refundsRes.json()
    const monthlyRefunds: Refund[] = (refundsData.refunds || []).sort(
      (a: Refund, b: Refund) => new Date(a.refundedAt).getTime() - new Date(b.refundedAt).getTime()
    )

    // Fetch gift card transactions
    const transactionsRes = await fetch(`/api/admin/gift-cards/transactions/monthly?year=${year}&month=${month}`)
    const transactionsData: GiftCardTransaction[] = await transactionsRes.json()

    // Fetch expired gift cards
    const expiredRes = await fetch(`/api/admin/gift-cards/expired/monthly?year=${year}&month=${month}`)
    const expiredData: ExpiredGiftCard[] = await expiredRes.json()

    return {
      orders: filteredOrders,
      refunds: monthlyRefunds,
      transactions: transactionsData,
      expiredCards: expiredData,
    }
  }

  const exportToExcel = async () => {
    setLoading(true)
    try {
      const { orders, refunds, transactions, expiredCards } = await fetchAllData()

      const wb = XLSX.utils.book_new()

      // Sheet 1: Vendite e Rimborsi
      const sheet1Rows: Record<string, string | number>[] = []
      
      orders.forEach(order => {
        const productTotal = order.items.reduce((sum, item) => sum + item.totalPrice, 0)
        const giftCardTotal = order.giftCards.reduce((sum, gc) => sum + gc.initialValue, 0)
        const orderDate = new Date(order.paidAt!)
        
        sheet1Rows.push({
          "Data": orderDate.toLocaleDateString("it-IT") + " " + orderDate.toLocaleTimeString("it-IT", { hour: "2-digit", minute: "2-digit" }),
          "Tipo": "Ordine",
          "Codice Univoco": order.orderNumber,
          "Rif. Ordine": "-",
          "Fonte": order.orderSource === "MANUAL" ? "Fisico" : "Online",
          "Metodo Rimborso": "-",
          "Stripe ID / Rif. Documento": order.stripePaymentIntentId || "-",
          "Dettaglio Prodotti": productTotal > 0 ? +productTotal : "-",
          "Dettaglio Gift Card": giftCardTotal > 0 ? +giftCardTotal : "-",
          "Totale": +order.total,
        })
      })
      
      refunds.forEach(refund => {
        const refundDate = new Date(refund.refundedAt)
        sheet1Rows.push({
          "Data": refundDate.toLocaleDateString("it-IT") + " " + refundDate.toLocaleTimeString("it-IT", { hour: "2-digit", minute: "2-digit" }),
          "Tipo": "Rimborso",
          "Codice Univoco": refund.refundNumber,
          "Rif. Ordine": refund.order.orderNumber,
          "Fonte": "-",
          "Metodo Rimborso": refund.refundMethod,
          "Stripe ID / Rif. Documento": refund.externalRef || "-",
          "Dettaglio Prodotti": refund.productTotal > 0 ? -refund.productTotal : "-",
          "Dettaglio Gift Card": refund.giftCardTotal > 0 ? -refund.giftCardTotal : "-",
          "Totale": -refund.totalRefunded,
        })
      })
      
      // Riepilogo Sheet 1
      const productRevenue = orders.reduce((sum, o) => sum + o.items.reduce((itemSum, item) => itemSum + item.totalPrice, 0), 0)
      const giftCardRevenue = orders.reduce((sum, o) => sum + o.giftCards.reduce((gcSum, gc) => gcSum + gc.initialValue, 0), 0)
      const totalRevenue = orders.reduce((sum, o) => sum + o.total, 0)
      const totalRefunds = refunds.reduce((sum, r) => sum + r.totalRefunded, 0)
      const productRefunds = refunds.reduce((sum, r) => sum + r.productTotal, 0)
      const giftCardRefunds = refunds.reduce((sum, r) => sum + r.giftCardTotal, 0)
      
      sheet1Rows.push({})
      sheet1Rows.push({"Data": "=== ORDINI ==="})
      sheet1Rows.push({"Data": "Prodotti:", "Dettaglio Prodotti": +productRevenue})
      sheet1Rows.push({"Data": "Gift Card:", "Dettaglio Gift Card": +giftCardRevenue})
      sheet1Rows.push({"Data": "TOTALE ORDINI", "Totale": +totalRevenue})
      
      if (totalRefunds > 0) {
        sheet1Rows.push({})
        sheet1Rows.push({"Data": "=== RIMBORSI ==="})
        sheet1Rows.push({"Data": "Prodotti:", "Dettaglio Prodotti": -productRefunds})
        sheet1Rows.push({"Data": "Gift Card:", "Dettaglio Gift Card": -giftCardRefunds})
        sheet1Rows.push({"Data": "TOTALE RIMBORSI", "Totale": -totalRefunds})
      }
      
      sheet1Rows.push({})
      sheet1Rows.push({"Data": "NETTO MESE", "Totale": totalRevenue - totalRefunds})

      const ws1 = XLSX.utils.json_to_sheet(sheet1Rows)
      XLSX.utils.book_append_sheet(wb, ws1, "Vendite e Rimborsi")

      // Sheet 2: Transazioni Gift Card
      const sheet2Rows: Record<string, string | number>[] = []
      
      transactions.forEach(t => {
        sheet2Rows.push({
          "Data": new Date(t.createdAt).toLocaleDateString("it-IT"),
          "Ora": new Date(t.createdAt).toLocaleTimeString("it-IT", { hour: "2-digit", minute: "2-digit" }),
          "Codice Gift Card": t.giftCard.code,
          "Importo Utilizzato": t.amount,
          "Numero Scontrino": t.receiptNumber || "-",
          "Nota": t.note || "-",
          "Data Acquisto": new Date(t.giftCard.purchasedAt).toLocaleDateString("it-IT"),
          "Foto Scontrino": t.receiptImage ? "Presente" : "-",
        })
      })
      
      const totalUsed = transactions.reduce((sum, t) => sum + t.amount, 0)
      const uniqueCards = new Set(transactions.map(t => t.giftCard.id)).size
      
      sheet2Rows.push({})
      sheet2Rows.push({"Data": "=== RIEPILOGO ==="})
      sheet2Rows.push({"Data": "Totale Utilizzato:", "Importo Utilizzato": totalUsed})
      sheet2Rows.push({"Data": "Gift Card Usate:", "Codice Gift Card": uniqueCards})

      const ws2 = XLSX.utils.json_to_sheet(sheet2Rows)
      XLSX.utils.book_append_sheet(wb, ws2, "Transazioni GC")

      // Sheet 3: Gift Card Scadute
      const sheet3Rows: Record<string, string | number>[] = []
      
      expiredCards.forEach(g => {
        const expiryDate = g.expiresAt ? new Date(g.expiresAt) : null
        const purchaseDate = new Date(g.purchasedAt)
        const usedAmount = g.initialValue - g.remainingValue
        
        sheet3Rows.push({
          "Codice Gift Card": g.code,
          "Valore Iniziale": g.initialValue,
          "Importo Utilizzato": usedAmount,
          "Residuo Non Utilizzato": g.remainingValue,
          "Data Acquisto": purchaseDate.toLocaleDateString("it-IT"),
          "Data Scadenza": expiryDate ? expiryDate.toLocaleDateString("it-IT") : "-",
          "Numero Transazioni": g.transactions.length,
        })
      })
      
      const totalInitial = expiredCards.reduce((sum, g) => sum + g.initialValue, 0)
      const totalUnused = expiredCards.reduce((sum, g) => sum + g.remainingValue, 0)
      const totalExpiredUsed = expiredCards.reduce((sum, g) => sum + (g.initialValue - g.remainingValue), 0)
      
      sheet3Rows.push({})
      sheet3Rows.push({"Codice Gift Card": "=== RIEPILOGO ==="})
      sheet3Rows.push({"Codice Gift Card": "Valore Iniziale:", "Valore Iniziale": totalInitial})
      sheet3Rows.push({"Codice Gift Card": "Importo Utilizzato:", "Importo Utilizzato": totalExpiredUsed})
      sheet3Rows.push({"Codice Gift Card": "Residuo Non Utilizzato:", "Residuo Non Utilizzato": totalUnused})
      sheet3Rows.push({"Codice Gift Card": "Card Scadute:", "Numero Transazioni": expiredCards.length})

      const ws3 = XLSX.utils.json_to_sheet(sheet3Rows)
      XLSX.utils.book_append_sheet(wb, ws3, "GC Scadute")

      XLSX.writeFile(wb, `LoScalo_ReportCompleto_${selectedDate}.xlsx`)
    } catch (error) {
      console.error("Error exporting Excel:", error)
      alert("Errore durante l'export Excel")
    } finally {
      setLoading(false)
    }
  }

  const generatePDF = async () => {
    setLoading(true)
    try {
      const { orders, refunds, transactions, expiredCards } = await fetchAllData()

      const pdfDoc = await PDFDocument.create()
      const font = await pdfDoc.embedFont(StandardFonts.Helvetica)
      const fontBold = await pdfDoc.embedFont(StandardFonts.HelveticaBold)

      // Helper function to add a report section
      const addReportSection = async (
        title: string, 
        subtitle: string,
        drawContent: (page: any, y: number) => Promise<number>
      ) => {
        let page = pdfDoc.addPage([842, 595])
        const { width, height } = page.getSize()
        let y = height - 50
        const margin = 40

        // Section header
        page.drawText(title, {
          x: margin,
          y,
          size: 16,
          font: fontBold,
          color: rgb(0, 0, 0),
        })
        
        y -= 22
        page.drawText(subtitle, {
          x: margin,
          y,
          size: 11,
          font,
          color: rgb(0.4, 0.4, 0.4),
        })
        
        y -= 30
        
        const finalY = await drawContent(page, y)
        return finalY
      }

      // Section 1: Vendite e Rimborsi
      await addReportSection(
        "1. VENDITE E RIMBORSI",
        `Periodo: ${formatMonthYear(selectedDate)}`,
        async (page, startY) => {
          let y = startY
          const margin = 40
          const rowHeight = 12
          const colWidths = [60, 60, 95, 85, 50, 55, 170, 130, 60]
          const colPositions = colWidths.reduce((acc, w, i) => {
            acc.push((acc[i - 1] || margin - 5) + w)
            return acc
          }, [] as number[])

          // All rows sorted by date
          const allRows = [
            ...orders.map(o => ({ type: 'order' as const, data: o, date: new Date(o.paidAt!) })),
            ...refunds.map(r => ({ type: 'refund' as const, data: r, date: new Date(r.refundedAt) }))
          ].sort((a, b) => a.date.getTime() - b.date.getTime())

          // Header
          page.drawRectangle({
            x: margin,
            y: y - 5,
            width: 842 - margin * 2,
            height: 18,
            color: rgb(0.95, 0.95, 0.9),
          })
          
          const headers = ["Data", "Tipo", "Codice", "Rif. Ord.", "Fonte", "Metodo", "Stripe ID", "Dettaglio", "Totale"]
          headers.forEach((h, i) => {
            page.drawText(h, {
              x: (i === 0 ? margin : colPositions[i - 1]) + 3,
              y,
              size: 7,
              font: fontBold,
              color: rgb(0.2, 0.2, 0.2),
            })
          })
          y -= rowHeight + 8

          // Data rows (max 15 per page)
          let rowCount = 0
          for (const row of allRows) {
            if (rowCount >= 15) {
              // Add new page and continue
              page = pdfDoc.addPage([842, 595])
              y = height - 50
              rowCount = 0
            }

            if (row.type === 'order') {
              const order = row.data as Order
              const productTotal = order.items.reduce((sum, item) => sum + item.totalPrice, 0)
              const giftCardTotal = order.giftCards.reduce((sum, gc) => sum + gc.initialValue, 0)
              
              page.drawText(row.date.toLocaleDateString("it-IT"), { x: margin, y, size: 7, font })
              page.drawText("Ordine", { x: colPositions[0], y, size: 7, font, color: rgb(0.2, 0.6, 0.2) })
              page.drawText(order.orderNumber, { x: colPositions[1], y, size: 7, font: fontBold })
              page.drawText("-", { x: colPositions[2], y, size: 7, font })
              page.drawText(order.orderSource === "MANUAL" ? "Fisico" : "Online", { x: colPositions[3], y, size: 7, font })
              page.drawText("-", { x: colPositions[4], y, size: 7, font })
              page.drawText(order.stripePaymentIntentId || "-", { x: colPositions[5], y, size: 6, font })
              
              let detailText = ""
              if (productTotal > 0) detailText += `Prod: ${productTotal.toFixed(2)}€ `
              if (giftCardTotal > 0) detailText += `GC: ${giftCardTotal.toFixed(2)}€`
              page.drawText(detailText, { x: colPositions[6], y, size: 6, font, color: rgb(0.2, 0.4, 0.8) })
              
              const marginExtra = 80
              const pageWidth = 842
              const rightAlignX = pageWidth - marginExtra
              const textWidth = fontBold.widthOfTextAtSize(`+${order.total.toFixed(2)}€`, 8)
              page.drawText(`+${order.total.toFixed(2)}€`, { x: rightAlignX - textWidth, y, size: 8, font: fontBold, color: rgb(0.2, 0.6, 0.2) })
            } else {
              const refund = row.data as Refund
              
              page.drawText(row.date.toLocaleDateString("it-IT"), { x: margin, y, size: 7, font })
              page.drawText("Rimborso", { x: colPositions[0], y, size: 7, font, color: rgb(0.8, 0.2, 0.2) })
              page.drawText(refund.refundNumber, { x: colPositions[1], y, size: 7, font: fontBold })
              page.drawText(refund.order.orderNumber, { x: colPositions[2], y, size: 7, font })
              page.drawText("-", { x: colPositions[3], y, size: 7, font })
              page.drawText(refund.refundMethod, { x: colPositions[4], y, size: 7, font })
              page.drawText(refund.externalRef || "-", { x: colPositions[5], y, size: 6, font })
              
              let detailText = ""
              if (refund.productTotal > 0) detailText += `Prod: ${refund.productTotal.toFixed(2)}€ `
              if (refund.giftCardTotal > 0) detailText += `GC: ${refund.giftCardTotal.toFixed(2)}€`
              page.drawText(detailText, { x: colPositions[6], y, size: 6, font, color: rgb(0.2, 0.4, 0.8) })
              
              const marginExtra = 80
              const pageWidth = 842
              const rightAlignX = pageWidth - marginExtra
              const textWidth = fontBold.widthOfTextAtSize(`-${refund.totalRefunded.toFixed(2)}€`, 8)
              page.drawText(`-${refund.totalRefunded.toFixed(2)}€`, { x: rightAlignX - textWidth, y, size: 8, font: fontBold, color: rgb(0.8, 0.2, 0.2) })
            }
            
            y -= rowHeight
            rowCount++
          }

          // Totals
          const totalRevenue = orders.reduce((sum, o) => sum + o.total, 0)
          const totalRefunds = refunds.reduce((sum, r) => sum + r.totalRefunded, 0)
          
          y -= 10
          page.drawText(`Totale Ordini: +${totalRevenue.toFixed(2)}€`, { x: margin, y, size: 9, font: fontBold, color: rgb(0.2, 0.6, 0.2) })
          y -= 14
          page.drawText(`Totale Rimborsi: -${totalRefunds.toFixed(2)}€`, { x: margin, y, size: 9, font: fontBold, color: rgb(0.8, 0.2, 0.2) })
          y -= 14
          page.drawText(`Netto: ${(totalRevenue - totalRefunds).toFixed(2)}€`, { x: margin, y, size: 10, font: fontBold })

          return y
        }
      )

      // Section 2: Transazioni Gift Card
      if (transactions.length > 0) {
        await addReportSection(
          "2. TRANSAZIONI GIFT CARD",
          `${transactions.length} transazioni`,
          async (page, startY) => {
            let y = startY
            const margin = 40
            const rowHeight = 12
            const colWidths = [60, 100, 180, 180, 100, 80]
            const colPositions = colWidths.reduce((acc, w, i) => {
              acc.push((acc[i - 1] || margin - 5) + w)
              return acc
            }, [] as number[])

            // Header
            page.drawRectangle({
              x: margin,
              y: y - 5,
              width: 842 - margin * 2,
              height: 18,
              color: rgb(0.95, 0.95, 0.9),
            })
            
            const headers = ["Data", "Gift Card", "Dettaglio", "Importo", "Residuo"]
            headers.forEach((h, i) => {
              page.drawText(h, {
                x: (i === 0 ? margin : colPositions[i - 1]) + 3,
                y,
                size: 8,
                font: fontBold,
                color: rgb(0.2, 0.2, 0.2),
              })
            })
            y -= rowHeight + 8

            // Data rows (max 20 per page)
            let rowCount = 0
            for (const t of transactions) {
              if (rowCount >= 20) {
                page = pdfDoc.addPage([842, 595])
                y = height - 50
                rowCount = 0
              }

              const date = new Date(t.createdAt)
              
              page.drawText(date.toLocaleDateString("it-IT"), { x: margin, y, size: 8, font })
              page.drawText(t.giftCard.code, { x: colPositions[0], y, size: 8, font: fontBold })
              
              const details = []
              if (t.receiptNumber) details.push(`Scontrino: ${t.receiptNumber}`)
              if (t.note) details.push(t.note)
              if (t.receiptImage) details.push("[Foto]")
              const detailText = details.join(" | ")
              page.drawText(detailText.length > 40 ? detailText.substring(0, 40) + "..." : detailText, { 
                x: colPositions[1], y, size: 7, font, color: rgb(0.2, 0.4, 0.8) 
              })
              
              const marginExtra = 115
              const pageWidth = 842
              const rightAlignX = pageWidth - marginExtra
              const textWidth = fontBold.widthOfTextAtSize(`-${t.amount.toFixed(2)}€`, 9)
              page.drawText(`-${t.amount.toFixed(2)}€`, { x: rightAlignX - textWidth, y, size: 9, font: fontBold, color: rgb(0.8, 0.2, 0.2) })
              
              y -= rowHeight
              rowCount++
            }

            // Total
            const totalUsed = transactions.reduce((sum, t) => sum + t.amount, 0)
            y -= 10
            page.drawText(`Totale Utilizzato: ${totalUsed.toFixed(2)}€`, { x: margin, y, size: 10, font: fontBold, color: rgb(0.8, 0.2, 0.2) })

            return y
          }
        )
      }

      // Section 3: Gift Card Scadute
      if (expiredCards.length > 0) {
        await addReportSection(
          "3. GIFT CARD SCADUTE",
          `${expiredCards.length} card scadute`,
          async (page, startY) => {
            let y = startY
            const margin = 40
            const rowHeight = 12
            const colWidths = [30, 140, 80, 80, 90, 80]
            const colPositions = colWidths.reduce((acc, w, i) => {
              acc.push((acc[i - 1] || margin - 5) + w)
              return acc
            }, [] as number[])

            // Header
            page.drawRectangle({
              x: margin,
              y: y - 5,
              width: 842 - margin * 2,
              height: 18,
              color: rgb(0.95, 0.95, 0.9),
            })
            
            const headers = ["#", "Codice", "Valore Iniz.", "Utilizzato", "Residuo", "Data Scad."]
            headers.forEach((h, i) => {
              page.drawText(h, {
                x: (i === 0 ? margin : colPositions[i - 1]) + 3,
                y,
                size: 8,
                font: fontBold,
                color: rgb(0.2, 0.2, 0.2),
              })
            })
            y -= rowHeight + 8

            // Data rows
            let rowCount = 0
            for (let i = 0; i < expiredCards.length; i++) {
              const g = expiredCards[i]
              if (rowCount >= 20) {
                page = pdfDoc.addPage([842, 595])
                y = height - 50
                rowCount = 0
              }

              const expiryDate = g.expiresAt ? new Date(g.expiresAt) : null
              const usedAmount = g.initialValue - g.remainingValue
              
              page.drawText(`${i + 1}`, { x: margin, y, size: 8, font })
              page.drawText(g.code, { x: colPositions[0], y, size: 8, font: fontBold })
              page.drawText(`${g.initialValue.toFixed(2)}€`, { x: colPositions[1], y, size: 8, font })
              page.drawText(`${usedAmount.toFixed(2)}€`, { x: colPositions[2], y, size: 8, font, color: rgb(0.2, 0.6, 0.2) })
              page.drawText(`${g.remainingValue.toFixed(2)}€`, { x: colPositions[3] + 10, y, size: 9, font: fontBold, color: rgb(0.2, 0.6, 0.2) })
              page.drawText(expiryDate ? expiryDate.toLocaleDateString("it-IT") : "-", { x: colPositions[4], y, size: 8, font })
              
              y -= rowHeight
              rowCount++
            }

            // Totals
            const totalInitial = expiredCards.reduce((sum, g) => sum + g.initialValue, 0)
            const totalUnused = expiredCards.reduce((sum, g) => sum + g.remainingValue, 0)
            const totalUsed = expiredCards.reduce((sum, g) => sum + (g.initialValue - g.remainingValue), 0)
            
            y -= 10
            page.drawText(`Valore Iniziale: ${totalInitial.toFixed(2)}€`, { x: margin, y, size: 9, font: fontBold, color: rgb(0.6, 0.2, 0.6) })
            y -= 14
            page.drawText(`Importo Utilizzato: ${totalUsed.toFixed(2)}€`, { x: margin, y, size: 9, font: fontBold, color: rgb(0.2, 0.4, 0.8) })
            y -= 14
            page.drawText(`Residuo Scaduto: ${totalUnused.toFixed(2)}€`, { x: margin, y, size: 10, font: fontBold, color: rgb(0.2, 0.6, 0.2) })

            return y
          }
        )
      }

      const pdfBytes = await pdfDoc.save()
      const blob = new Blob([pdfBytes as unknown as ArrayBuffer], { type: "application/pdf" })
      const link = document.createElement("a")
      link.href = URL.createObjectURL(blob)
      link.download = `LoScalo_ReportCompleto_${selectedDate}.pdf`
      link.click()
    } catch (error) {
      console.error("Error generating PDF:", error)
      alert("Errore durante la generazione del PDF")
    } finally {
      setLoading(false)
    }
  }

  const sendEmail = async () => {
    if (!email || !email.includes('@')) {
      setEmailStatus({ type: 'error', message: 'Inserisci un indirizzo email valido' })
      return
    }

    setLoading(true)
    setEmailStatus(null)

    try {
      const response = await fetch('/api/admin/reports/complete/send-email', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          year,
          month,
          email,
        }),
      })

      if (response.ok) {
        setEmailStatus({ type: 'success', message: 'Report inviati con successo!' })
        setEmail("")
      } else {
        const error = await response.json()
        setEmailStatus({ type: 'error', message: error.message || 'Errore durante l\'invio' })
      }
    } catch (error) {
      setEmailStatus({ type: 'error', message: 'Errore di connessione' })
    } finally {
      setLoading(false)
    }
  }

  return (
    <main className="min-h-screen bg-brand-cream">
      <header className="bg-white border-b border-brand-light-gray">
        <div className="flex items-center px-4 py-3 relative">
          <Link href="/admin/reports" className="p-2 -ml-2">
            <ArrowLeft className="w-6 h-6 text-brand-dark" />
          </Link>
          <h1 className="text-headline-sm font-bold text-brand-dark absolute left-1/2 -translate-x-1/2">
            Report Completo
          </h1>
        </div>
      </header>

      <div className="p-4 max-w-2xl mx-auto">
        {/* Month Navigation */}
        <div className="bg-white rounded-2xl shadow-card p-4 mb-6">
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

        {/* Info Card */}
        <div className="bg-blue-50 border border-blue-100 rounded-2xl p-4 mb-6">
          <div className="flex items-start gap-3">
            <FileText className="w-5 h-5 text-blue-500 flex-shrink-0 mt-0.5" />
            <div>
              <h3 className="text-body-md font-bold text-blue-800 mb-1">
                Report Contabile Completo
              </h3>
              <p className="text-body-sm text-blue-700">
                Questo report include tutti e 3 i report contabili in un unico file:
              </p>
              <ul className="text-label-sm text-blue-700 mt-2 space-y-1 ml-4 list-disc">
                <li>Vendite Prodotti/Gift Card e Rimborsi</li>
                <li>Transazioni Gift Card utilizzate</li>
                <li>Gift Card scadute con residuo</li>
              </ul>
            </div>
          </div>
        </div>

        {/* Download Buttons */}
        <div className="space-y-3 mb-6">
          <h2 className="text-title-md font-bold text-brand-dark">Scarica Report</h2>
          
          <button
            onClick={exportToExcel}
            disabled={loading}
            className="w-full bg-white rounded-2xl shadow-card p-4 flex items-center gap-4 hover:shadow-card-hover transition-shadow group disabled:opacity-50"
          >
            <div className="w-12 h-12 bg-green-500/10 rounded-xl flex items-center justify-center">
              <FileSpreadsheet className="w-6 h-6 text-green-500" />
            </div>
            <div className="flex-1 text-left">
              <h3 className="text-headline-sm font-bold text-brand-dark group-hover:text-green-600 transition-colors">
                Scarica Excel
              </h3>
              <p className="text-body-sm text-brand-gray">
                3 fogli: Vendite, Transazioni GC, GC Scadute
              </p>
            </div>
            <Download className="w-5 h-5 text-brand-gray group-hover:text-green-500 transition-colors" />
          </button>

          <button
            onClick={generatePDF}
            disabled={loading}
            className="w-full bg-white rounded-2xl shadow-card p-4 flex items-center gap-4 hover:shadow-card-hover transition-shadow group disabled:opacity-50"
          >
            <div className="w-12 h-12 bg-brand-primary/10 rounded-xl flex items-center justify-center">
              <Printer className="w-6 h-6 text-brand-primary" />
            </div>
            <div className="flex-1 text-left">
              <h3 className="text-headline-sm font-bold text-brand-dark group-hover:text-brand-primary transition-colors">
                Scarica PDF
              </h3>
              <p className="text-body-sm text-brand-gray">
                Documento completo con tutti i report
              </p>
            </div>
            <Download className="w-5 h-5 text-brand-gray group-hover:text-brand-primary transition-colors" />
          </button>
        </div>

        {/* Email Section */}
        <div className="bg-white rounded-2xl shadow-card p-4">
          <h2 className="text-title-md font-bold text-brand-dark mb-4 flex items-center gap-2">
            <Mail className="w-5 h-5 text-brand-primary" />
            Invia via Email
          </h2>
          
          <div className="space-y-3">
            <div>
              <label className="text-label-md text-brand-gray mb-1 block">
                Indirizzo Email
              </label>
              <input
                type="email"
                placeholder="esempio@email.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="input-field w-full"
              />
            </div>

            {emailStatus && (
              <div className={`flex items-center gap-2 p-3 rounded-xl ${
                emailStatus.type === 'success' ? 'bg-green-50 text-green-700' : 'bg-red-50 text-red-700'
              }`}>
                {emailStatus.type === 'success' ? (
                  <CheckCircle className="w-5 h-5 flex-shrink-0" />
                ) : (
                  <AlertCircle className="w-5 h-5 flex-shrink-0" />
                )}
                <span className="text-body-sm">{emailStatus.message}</span>
              </div>
            )}

            <button
              onClick={sendEmail}
              disabled={loading || !email}
              className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-brand-primary text-white rounded-full text-body-md font-medium hover:bg-brand-dark transition-colors disabled:opacity-50"
            >
              {loading ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white" />
                  Invio in corso...
                </>
              ) : (
                <>
                  <Send className="w-4 h-4" />
                  Invia Report
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </main>
  )
}
