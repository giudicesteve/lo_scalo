"use client"

import { useEffect, useState, useMemo } from "react"
import Link from "next/link"
import { 
  ArrowLeft, 
  Calendar, 
  ChevronLeft, 
  ChevronRight, 
  Package, 
  CreditCard, 
  Gift, 
  FileSpreadsheet, 
  Printer, 
  FileText,
  MinusCircle,
  PlusCircle,
  RotateCcw
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

const getOrderBreakdown = (order: Order) => {
  const productTotal = order.items.reduce((sum, item) => sum + item.totalPrice, 0)
  const giftCardTotal = order.giftCards.reduce((sum, gc) => sum + gc.initialValue, 0)
  return { productTotal, giftCardTotal }
}

export default function MonthlyReportPage() {
  const [orders, setOrders] = useState<Order[]>([])
  const [refunds, setRefunds] = useState<Refund[]>([])
  const [loading, setLoading] = useState(true)
  const [selectedDate, setSelectedDate] = useState(() => {
    const now = new Date()
    return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`
  })

  useEffect(() => {
    fetchData()
  }, [selectedDate])

  const fetchData = async () => {
    setLoading(true)
    try {
      const [y, m] = selectedDate.split('-')
      
      // Fetch orders
      const ordersRes = await fetch("/api/admin/orders")
      const ordersData = await ordersRes.json()
      setOrders(Array.isArray(ordersData) ? ordersData : [])
      
      // Fetch refunds for this month
      const refundsRes = await fetch(`/api/admin/refunds?year=${y}&month=${m}`)
      const refundsData = await refundsRes.json()
      setRefunds(refundsData.refunds || [])
    } catch (error) {
      console.error("Error fetching data:", error)
    } finally {
      setLoading(false)
    }
  }

  const [year, month] = selectedDate.split('-').map(Number)

  const filteredOrders = useMemo(() => {
    return orders.filter(order => {
      if (!order.paidAt) return false
      const orderDate = new Date(order.paidAt)
      const isOnMonth = orderDate.getFullYear() === year && orderDate.getMonth() === month - 1
      const isPaidOrder = ["COMPLETED", "DELIVERED"].includes(order.status)
      return isOnMonth && isPaidOrder
    }).sort((a, b) => new Date(a.paidAt!).getTime() - new Date(b.paidAt!).getTime())
  }, [orders, year, month])

  const monthlyRefunds = useMemo(() => {
    return refunds.sort((a, b) => new Date(a.refundedAt).getTime() - new Date(b.refundedAt).getTime())
  }, [refunds])

  const totals = useMemo(() => {
    const totalRevenue = filteredOrders.reduce((sum, o) => sum + o.total, 0)
    const productRevenue = filteredOrders
      .reduce((sum, o) => sum + o.items.reduce((itemSum, item) => itemSum + item.totalPrice, 0), 0)
    const giftCardRevenue = filteredOrders
      .reduce((sum, o) => sum + o.giftCards.reduce((gcSum, gc) => gcSum + gc.initialValue, 0), 0)
    const totalRefunds = monthlyRefunds.reduce((sum, r) => sum + r.totalRefunded, 0)
    const productRefunds = monthlyRefunds.reduce((sum, r) => sum + r.productTotal, 0)
    const giftCardRefunds = monthlyRefunds.reduce((sum, r) => sum + r.giftCardTotal, 0)
    const netRevenue = totalRevenue - totalRefunds
    return { totalRevenue, productRevenue, giftCardRevenue, totalRefunds, productRefunds, giftCardRefunds, netRevenue }
  }, [filteredOrders, monthlyRefunds])

  const handleMonthChange = (direction: 'prev' | 'next') => {
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
    if (filteredOrders.length === 0 && monthlyRefunds.length === 0) return

    const rows: Record<string, string | number>[] = []
    
    // Orders
    filteredOrders.forEach(order => {
      const { productTotal, giftCardTotal } = getOrderBreakdown(order)
      const orderDate = new Date(order.paidAt!)
      
      rows.push({
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
    
    // Refunds
    monthlyRefunds.forEach(refund => {
      const refundDate = new Date(refund.refundedAt)
      rows.push({
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
    
    // Riepilogo
    rows.push({})
    
    rows.push({
      "Data": "TOTALI ORDINI",
      "Tipo": "",
      "Codice Univoco": "",
      "Rif. Ordine": "",
      "Fonte": "",
      "Metodo Rimborso": "",
      "Stripe ID / Rif. Documento": "",
      "Dettaglio Prodotti": +totals.productRevenue,
      "Dettaglio Gift Card": +totals.giftCardRevenue,
      "Totale": +totals.totalRevenue,
    })
    
    rows.push({
      "Data": "TOTALI RIMBORSI",
      "Tipo": "",
      "Codice Univoco": "",
      "Rif. Ordine": "",
      "Fonte": "",
      "Metodo Rimborso": "",
      "Stripe ID / Rif. Documento": "",
      "Dettaglio Prodotti": -totals.productRefunds,
      "Dettaglio Gift Card": -totals.giftCardRefunds,
      "Totale": -totals.totalRefunds,
    })
    

    const ws = XLSX.utils.json_to_sheet(rows)
    const wb = XLSX.utils.book_new()
    XLSX.utils.book_append_sheet(wb, ws, "Report Mensile ")

    const colWidths = [
      { wch: 18 }, { wch: 12 }, { wch: 20 }, { wch: 17 }, { wch: 10 },
      { wch: 15 }, { wch: 34 }, { wch: 18 }, { wch: 18 }, { wch: 12 }
    ]
    ws['!cols'] = colWidths

    const range = XLSX.utils.decode_range(ws['!ref'] || "A1");
    for (let R = range.s.r + 1; R <= range.e.r; ++R) {
      [7, 8, 9].forEach(colIdx => {
        const cellAddress = XLSX.utils.encode_cell({ r: R, c: colIdx });
        const cell = ws[cellAddress];

        if (cell) {
          cell.t = 'n'; // 'n' sta per number
          cell.z = '#,##0.00 €'; // Questo è il formato numerico di Excel
        }
      });
    }

    XLSX.writeFile(wb, `LoScalo_ReportMensile_${selectedDate}.xlsx`)
  }

  const generatePDF = async () => {
    if (filteredOrders.length === 0 && monthlyRefunds.length === 0) return

    const pdfDoc = await PDFDocument.create()
    let page = pdfDoc.addPage([842, 595])
    const { width, height } = page.getSize()
    const font = await pdfDoc.embedFont(StandardFonts.Helvetica)
    const fontBold = await pdfDoc.embedFont(StandardFonts.HelveticaBold)
    
    let y = height - 50
    const margin = 40
    const rowHeight = 14
    const colWidths = [60, 60, 95, 85, 50, 55, 170, 130, 60]
    const colPositions = colWidths.reduce((acc, w, i) => {
      acc.push((acc[i - 1] || margin - 5) + w)
      return acc
    }, [] as number[])
    
    page.drawText("Lo Scalo - Report Mensile Contabile", {
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
    page.drawText(`Ordini: ${filteredOrders.length} | Rimborsi: ${monthlyRefunds.length}`, {
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
      
      const headers = ["Data", "Tipo", "Codice Univoco", "Rif. Ordine", "Fonte", "Metodo", "Stripe ID / Rif.", "Dettaglio", "Totale"]
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
    
    // All rows (orders + refunds mixed, sorted by date)
    const allRows = [
      ...filteredOrders.map(o => ({ type: 'order' as const, data: o, date: new Date(o.paidAt!) })),
      ...monthlyRefunds.map(r => ({ type: 'refund' as const, data: r, date: new Date(r.refundedAt) }))
    ].sort((a, b) => a.date.getTime() - b.date.getTime())
    
    allRows.forEach((row) => {
      checkNewPage(40)
      
      if (row.type === 'order') {
        const order = row.data as Order
        const { productTotal, giftCardTotal } = getOrderBreakdown(order)
        const dateStr = row.date.toLocaleDateString("it-IT")
        
        // Data
        page.drawText(dateStr, {
          x: margin,
          y,
          size: 8,
          font,
          color: rgb(0, 0, 0),
        })
        
        // Tipo
        page.drawText("Ordine", {
          x: colPositions[0],
          y,
          size: 8,
          font,
          color: rgb(0.2, 0.6, 0.2),
        })
        
        // Codice Univoco
        page.drawText(`#${order.orderNumber}`, {
          x: colPositions[1],
          y,
          size: 8,
          font: fontBold,
          color: rgb(0, 0, 0),
        })
        
        // Rif. Ordine
        page.drawText("-", {
          x: colPositions[2],
          y,
          size: 8,
          font,
          color: rgb(0.5, 0.5, 0.5),
        })
        
        // Fonte
        page.drawText(order.orderSource === "MANUAL" ? "Fisico" : "Online", {
          x: colPositions[3],
          y,
          size: 8,
          font,
          color: rgb(0, 0, 0),
        })
        
        // Metodo Rimborso
        page.drawText("-", {
          x: colPositions[4],
          y,
          size: 8,
          font,
          color: rgb(0.5, 0.5, 0.5),
        })
        
        // Stripe ID
        const stripeId = order.stripePaymentIntentId || "-"
        page.drawText(stripeId, {
          x: colPositions[5],
          y,
          size: 8,
          font,
          color: rgb(0.4, 0.4, 0.4),
        })

        const marginExtra = 190;
        const pageWidth = page.getWidth();
        const rightAlignX = pageWidth - marginExtra; 
        const textWidth = font.widthOfTextAtSize(`Prod: +${productTotal.toFixed(2)}€`, 7);
        
        // Dettaglio
        let dettaglioY = y
        if (productTotal > 0) {
          page.drawText(`Prod: +${productTotal.toFixed(2)}€`, {
            x: rightAlignX - textWidth,
            y: dettaglioY,
            size: 7,
            font,
            color: rgb(0.2, 0.4, 0.8),
          })
          dettaglioY -= 10
        }

        const textWidth2 = font.widthOfTextAtSize(`GC: +${giftCardTotal.toFixed(2)}€`, 7);

        if (giftCardTotal > 0) {
          page.drawText(`GC: +${giftCardTotal.toFixed(2)}€`, {
            x: rightAlignX - textWidth2,
            y: dettaglioY,
            size: 7,
            font,
            color: rgb(0.6, 0.2, 0.6),
          })
        }

        const marginExtra2 = 80;
        const rightAlignX2 = pageWidth - marginExtra2; 
        const textWidth3 = font.widthOfTextAtSize(`+${order.total.toFixed(2)}€`, 7);
        
        // Totale
        page.drawText(`+${order.total.toFixed(2)}€`, {
          x: rightAlignX2 - textWidth3,
          y,
          size: 9,
          font: fontBold,
          color: rgb(0.2, 0.6, 0.2),
        })
        
      } else {
        const refund = row.data as Refund
        const dateStr = row.date.toLocaleDateString("it-IT")
        
        // Data
        page.drawText(dateStr, {
          x: margin,
          y,
          size: 8,
          font,
          color: rgb(0, 0, 0),
        })
        
        // Tipo
        page.drawText("Rimborso", {
          x: colPositions[0],
          y,
          size: 8,
          font,
          color: rgb(0.8, 0.2, 0.2),
        })
        
        // Codice Univoco
        page.drawText(refund.refundNumber, {
          x: colPositions[1],
          y,
          size: 8,
          font: fontBold,
          color: rgb(0.8, 0.2, 0.2),
        })
        
        // Rif. Ordine
        page.drawText(`#${refund.order.orderNumber}`, {
          x: colPositions[2],
          y,
          size: 8,
          font,
          color: rgb(0.4, 0.4, 0.4),
        })
        
        // Fonte
        page.drawText("-", {
          x: colPositions[3],
          y,
          size: 8,
          font,
          color: rgb(0.5, 0.5, 0.5),
        })
        
        // Metodo Rimborso
        page.drawText(refund.refundMethod, {
          x: colPositions[4],
          y,
          size: 8,
          font,
          color: rgb(0, 0, 0),
        })
        
        // Stripe ID / Rif
        const extRef = refund.externalRef || "-"
        page.drawText(extRef.length > 18 ? extRef.substring(0, 18) + "..." : extRef, {
          x: colPositions[5],
          y,
          size: 8,
          font,
          color: rgb(0.4, 0.4, 0.4),
        })


        const marginExtra = 190;
        const pageWidth = page.getWidth();
        const rightAlignX = pageWidth - marginExtra; 
        const textWidth = font.widthOfTextAtSize(`Prod: +${refund.productTotal.toFixed(2)}€`, 7);
        
        // Dettaglio
        let dettaglioY = y
        if (refund.productTotal > 0) {
          page.drawText(`Prod: +${refund.productTotal.toFixed(2)}€`, {
            x: rightAlignX - textWidth,
            y: dettaglioY,
            size: 7,
            font,
            color: rgb(0.2, 0.4, 0.8),
          })
          dettaglioY -= 10
        }

        const textWidth2 = font.widthOfTextAtSize(`GC: +${refund.giftCardTotal.toFixed(2)}€`, 7);

        if (refund.giftCardTotal > 0) {
          page.drawText(`GC: +${refund.giftCardTotal.toFixed(2)}€`, {
            x: rightAlignX - textWidth2,
            y: dettaglioY,
            size: 7,
            font,
            color: rgb(0.6, 0.2, 0.6),
          })
        }

        const marginExtra2 = 80;
        const rightAlignX2 = pageWidth - marginExtra2; 
        const textWidth3 = font.widthOfTextAtSize(`+${refund.totalRefunded.toFixed(2)}€`, 7);
        
        // Totale
        page.drawText(`+${refund.totalRefunded.toFixed(2)}€`, {
          x: rightAlignX2 - textWidth3,
          y,
          size: 9,
          font: fontBold,
          color: rgb(0.2, 0.6, 0.2),
        })

      }
      
      page.drawLine({
        start: { x: 40, y: y+10 },      // Punto di partenza (margine sinistro)
        end: { x: 802, y: y+10 },      // Punto di arrivo (margine destro)
        thickness: 0.5,                      // Spessore della linea
        color: rgb(0.75, 0.75, 0.75),      // Colore grigio chiaro (RGB da 0 a 1)
        opacity: 0.8,                      // Opacità
      });

      y -= rowHeight + 10
    })
    
    // Totals
    checkNewPage(160)
    
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
    page.drawText(`Prodotti:`, {
      x: margin + 20,
      y,
      size: 10,
      font,
      color: rgb(0.2, 0.4, 0.8),
    })
    page.drawText(`${totals.productRevenue.toFixed(2)}€`, {
      x: margin + 200,
      y,
      size: 10,
      font: fontBold,
      color: rgb(0.2, 0.4, 0.8),
    })
    
    y -= 16
    page.drawText(`Gift Card:`, {
      x: margin + 20,
      y,
      size: 10,
      font,
      color: rgb(0.6, 0.2, 0.6),
    })
    page.drawText(`${totals.giftCardRevenue.toFixed(2)}€`, {
      x: margin + 200,
      y,
      size: 10,
      font: fontBold,
      color: rgb(0.6, 0.2, 0.6),
    })
    
    
    y -= 20
    page.drawText(`TOTALE ORDINI:`, {
      x: margin,
      y,
      size: 11,
      font: fontBold,
      color: rgb(0.2, 0.6, 0.2),
    })
    page.drawText(`+${totals.totalRevenue.toFixed(2)}€`, {
      x: margin + 200,
      y,
      size: 11,
      font: fontBold,
      color: rgb(0.2, 0.6, 0.2),
    })
    

      y -= 18
      page.drawLine({
        start: { x: margin + 20, y },
        end: { x: margin + 250, y },
        thickness: 0.5,
        color: rgb(0.8, 0.8, 0.8),
      })
      
      y -= 16
      page.drawText(`Prodotti:`, {
        x: margin + 30,
        y,
        size: 9,
        font,
        color: rgb(0.2, 0.4, 0.8),
      })
      page.drawText(`-${totals.productRefunds.toFixed(2)}€`, {
        x: margin + 200,
        y,
        size: 9,
        font: fontBold,
        color: rgb(0.2, 0.4, 0.8),
      })
      
      y -= 14
      page.drawText(`Gift Card:`, {
        x: margin + 30,
        y,
        size: 9,
        font,
        color: rgb(0.6, 0.2, 0.6),
      })
      page.drawText(`-${totals.giftCardRefunds.toFixed(2)}€`, {
        x: margin + 200,
        y,
        size: 9,
        font: fontBold,
        color: rgb(0.6, 0.2, 0.6),
      })
      
      y -= 18
      page.drawText(`TOTALE RIMBORSI:`, {
        x: margin,
        y,
        size: 11,
        font: fontBold,
        color: rgb(0.8, 0.2, 0.2),
      })
      page.drawText(`-${totals.totalRefunds.toFixed(2)}€`, {
        x: margin + 200,
        y,
        size: 11,
        font: fontBold,
        color: rgb(0.8, 0.2, 0.2),
      })
      

    
    const pdfBytes = await pdfDoc.save()
    const blob = new Blob([pdfBytes as unknown as ArrayBuffer], { type: "application/pdf" })
    const link = document.createElement("a")
    link.href = URL.createObjectURL(blob)
    link.download = `LoScalo_ReportMensile_${selectedDate}.pdf`
    link.click()
  }

  if (loading) {
    return (
      <main className="min-h-screen bg-brand-cream flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-brand-primary" />
      </main>
    )
  }

  const hasData = filteredOrders.length > 0 || monthlyRefunds.length > 0

  return (
    <main className="min-h-screen bg-brand-cream">
      <header className="bg-white border-b border-brand-light-gray">
        <div className="flex items-center px-4 py-3 relative">
          <Link href="/admin/reports" className="p-2 -ml-2">
            <ArrowLeft className="w-6 h-6 text-brand-dark" />
          </Link>
          <h1 className="text-headline-sm font-bold text-brand-dark absolute left-1/2 -translate-x-1/2">
            Report Mensile
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
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
          <div className="bg-white rounded-2xl shadow-card p-4">
            <div className="flex items-center gap-3 mb-2">
              <div className="w-10 h-10 bg-green-500/10 rounded-xl flex items-center justify-center">
                <PlusCircle className="w-5 h-5 text-green-500" />
              </div>
              <span className="text-label-md text-brand-gray">Incasso Ordini</span>
            </div>
            <p className="text-headline-lg font-bold text-green-600">
              +{totals.totalRevenue.toFixed(2)}€
            </p>
          </div>

          <div className="bg-white rounded-2xl shadow-card p-4">
            <div className="flex items-center gap-3 mb-2">
              <div className="w-10 h-10 bg-red-500/10 rounded-xl flex items-center justify-center">
                <MinusCircle className="w-5 h-5 text-red-500" />
              </div>
              <span className="text-label-md text-brand-gray">Rimborsi</span>
            </div>
            <p className="text-headline-lg font-bold text-red-600">
              -{totals.totalRefunds.toFixed(2)}€
            </p>
          </div>

          <div className="bg-white rounded-2xl shadow-card p-4">
            <div className="flex items-center gap-3 mb-2">
              <div className="w-10 h-10 bg-purple-500/10 rounded-xl flex items-center justify-center">
                <Gift className="w-5 h-5 text-purple-500" />
              </div>
              <span className="text-label-md text-brand-gray">Gift Card</span>
            </div>
            <p className="text-headline-lg font-bold text-purple-600">
              {totals.giftCardRevenue.toFixed(2)}€
            </p>
          </div>

          <div className="bg-white rounded-2xl shadow-card p-4">
            <div className="flex items-center gap-3 mb-2">
              <div className="w-10 h-10 bg-blue-500/10 rounded-xl flex items-center justify-center">
                <Package className="w-5 h-5 text-blue-500" />
              </div>
              <span className="text-label-md text-brand-gray">Prodotti</span>
            </div>
            <p className="text-headline-lg font-bold text-blue-600">
              {totals.productRevenue.toFixed(2)}€
            </p>
          </div>
        </div>

        {/* Info & Export */}
        <div className="mb-4 space-y-3">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
            <div>
              <h2 className="text-title-md font-bold text-brand-dark">
                {filteredOrders.length} {filteredOrders.length === 1 ? "ordine" : "ordini"}
                {monthlyRefunds.length > 0 && ` • ${monthlyRefunds.length} ${monthlyRefunds.length === 1 ? "rimborso" : "rimborsi"}`}
              </h2>
              <p className="text-body-sm text-brand-gray">
                Solo ordini pagati (COMPLETED e DELIVERED) e rimborsi del mese
              </p>
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={exportToExcel}
                disabled={!hasData}
                className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-full text-body-sm font-medium hover:bg-green-700 transition-colors disabled:opacity-50"
              >
                <FileSpreadsheet className="w-4 h-4" />
                Export Excel
              </button>
              <button
                onClick={generatePDF}
                disabled={!hasData}
                className="flex items-center gap-2 px-4 py-2 bg-brand-primary text-white rounded-full text-body-sm font-medium hover:bg-brand-dark transition-colors disabled:opacity-50"
              >
                <Printer className="w-4 h-4" />
                Stampa PDF
              </button>
            </div>
          </div>
        </div>

        {/* Data Table */}
        {hasData ? (
          <div className="bg-white rounded-2xl shadow-card overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-brand-cream border-b border-brand-light-gray">
                  <tr>
                    <th className="text-left py-3 px-4 text-label-md font-bold text-brand-gray">Data</th>
                    <th className="text-left py-3 px-4 text-label-md font-bold text-brand-gray">Tipo</th>
                    <th className="text-left py-3 px-4 text-label-md font-bold text-brand-gray">Codice Univoco</th>
                    <th className="text-left py-3 px-4 text-label-md font-bold text-brand-gray">Rif. Ordine</th>
                    <th className="text-left py-3 px-4 text-label-md font-bold text-brand-gray">Fonte</th>
                    <th className="text-left py-3 px-4 text-label-md font-bold text-brand-gray">Metodo Rimborso</th>
                    <th className="text-left py-3 px-4 text-label-md font-bold text-brand-gray">Stripe ID / Rif. Documento</th>
                    <th className="text-right py-3 px-4 text-label-md font-bold text-brand-gray">Dettaglio</th>
                    <th className="text-right py-3 px-4 text-label-md font-bold text-brand-gray">Totale</th>
                  </tr>
                </thead>
                <tbody>
                  {/* Orders */}
                  {filteredOrders.map((order) => {
                    const { productTotal, giftCardTotal } = getOrderBreakdown(order)
                    const orderDate = new Date(order.paidAt!)
                    return (
                      <tr key={order.id} className="border-b border-brand-light-gray/50 last:border-b-0 hover:bg-green-50/50">
                        <td className="py-3 px-4">
                          <div className="text-body-sm text-brand-dark">
                            {orderDate.toLocaleDateString("it-IT")}
                          </div>
                          <div className="text-label-sm text-brand-gray">
                            {orderDate.toLocaleTimeString("it-IT", { hour: "2-digit", minute: "2-digit" })}
                          </div>
                        </td>
                        <td className="py-3 px-4">
                          <span className="flex items-center gap-1 text-green-600">
                            <span className="text-label-sm font-medium">Ordine</span>
                          </span>
                        </td>
                        <td className="py-3 px-4">
                          <Link 
                            href={`/admin/orders?id=${order.id}`}
                            className="font-mono text-body-sm font-bold text-brand-dark hover:text-brand-primary"
                          >
                            #{order.orderNumber}
                          </Link>
                        </td>
                        <td className="py-3 px-4">
                          <span className="text-brand-gray">-</span>
                        </td>
                        <td className="py-3 px-4">
                          {order.orderSource === "MANUAL" ? (
                            <span className="text-label-sm text-brand-black">
                              Fisico
                            </span>
                          ) : (
                            <span className="text-label-sm text-brand-black">Online</span>
                          )}
                        </td>
                        <td className="py-3 px-4">
                          <span className="text-brand-gray">-</span>
                        </td>
                        <td className="py-3 px-4">
                          {order.stripePaymentIntentId ? (
                            <div className="font-mono text-label-sm text-brand-dark max-w-[160px]" title={order.stripePaymentIntentId}>
                              {order.stripePaymentIntentId}
                            </div>
                          ) : (
                            <span className="text-label-sm text-brand-gray">-</span>
                          )}
                        </td>
                        <td className="py-3 px-4 text-right">
                          <div className="space-y-1">
                            {productTotal > 0 && (
                              <div className="text-body-sm text-blue-600">
                                Prodotti: +{productTotal.toFixed(2)}€
                              </div>
                            )}
                            {giftCardTotal > 0 && (
                              <div className="text-body-sm text-purple-600">
                                Gift Card: +{giftCardTotal.toFixed(2)}€
                              </div>
                            )}
                          </div>
                        </td>
                        <td className="py-3 px-4 text-right">
                          <span className="text-headline-sm font-bold text-green-600">
                            +{order.total.toFixed(2)}€
                          </span>
                        </td>
                      </tr>
                    )
                  })}
                  
                  {/* Refunds */}
                  {monthlyRefunds.map((refund) => {
                    const refundDate = new Date(refund.refundedAt)
                    return (
                      <tr key={refund.id} className="border-b border-brand-light-gray/50 last:border-b-0 hover:bg-red-50/50 bg-red-50/30">
                        <td className="py-3 px-4">
                          <div className="text-body-sm text-brand-dark">
                            {refundDate.toLocaleDateString("it-IT")}
                          </div>
                          <div className="text-label-sm text-brand-gray">
                            {refundDate.toLocaleTimeString("it-IT", { hour: "2-digit", minute: "2-digit" })}
                          </div>
                        </td>
                        <td className="py-3 px-4">
                          <span className="flex items-center gap-1 text-red-600">
                            <span className="text-label-sm font-medium">Rimborso</span>
                          </span>
                        </td>
                        <td className="py-3 px-4">
                          <div className="font-mono text-body-sm font-bold text-red-700">
                            {refund.refundNumber}
                          </div>
                        </td>
                        <td className="py-3 px-4">
                          <Link 
                            href={`/admin/orders?id=${refund.orderId}`}
                            className="text-label-sm text-brand-black hover:text-brand-primary font-mono"
                          >
                            #{refund.order.orderNumber}
                          </Link>
                        </td>
                        <td className="py-3 px-4">
                          <span className="text-brand-gray">-</span>
                        </td>
                        <td className="py-3 px-4">
                          <span className={`text-label-sm text-brand-black ${
                            refund.refundMethod === 'STRIPE' ? '':
                            refund.refundMethod === 'CASH' ? '':
                            ''
                          }`}>
                            {refund.refundMethod}
                          </span>
                        </td>
                        <td className="py-3 px-4">
                          {refund.externalRef ? (
                            <div className="font-mono text-label-sm text-brand-dark truncate max-w-[150px]" title={refund.externalRef}>
                              {refund.externalRef}
                            </div>
                          ) : (
                            <span className="text-label-sm text-brand-gray">-</span>
                          )}
                        </td>
                        <td className="py-3 px-4 text-right">
                          <div className="space-y-1">
                            {refund.productTotal > 0 && (
                              <div className="text-body-sm text-blue-600">
                                Prodotti: -{refund.productTotal.toFixed(2)}€
                              </div>
                            )}
                            {refund.giftCardTotal > 0 && (
                              <div className="text-body-sm text-purple-600">
                                Gift Card: -{refund.giftCardTotal.toFixed(2)}€
                              </div>
                            )}
                          </div>
                        </td>
                        <td className="py-3 px-4 text-right">
                          <span className="text-headline-sm font-bold text-red-600">
                            -{refund.totalRefunded.toFixed(2)}€
                          </span>
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
                <tfoot className="bg-brand-cream border-t-2 border-brand-light-gray">
                  <tr>
                    <td colSpan={6} className="py-4 px-4">
                      <div className="space-y-2">
                        <div className="flex justify-between text-body-sm">
                          <span className="text-brand-gray">Prodotti:</span>
                          <span className="font-bold text-blue-600">{totals.productRevenue.toFixed(2)}€</span>
                        </div>
                        <div className="flex justify-between text-body-sm">
                          <span className="text-brand-gray">Gift Card:</span>
                          <span className="font-bold text-purple-600">{totals.giftCardRevenue.toFixed(2)}€</span>
                        </div>
                        <div className="flex justify-between text-body-sm border-t border-brand-light-gray pt-2 mt-2">
                          <span className="text-green-600 font-medium">Totale Ordini:</span>
                          <span className="font-bold text-green-600">+{totals.totalRevenue.toFixed(2)}€</span>
                        </div>
                        {totals.totalRefunds > 0 && (
                          <div className="flex justify-between text-body-sm">
                            <span className="text-red-600 font-medium">Totale Rimborsi:</span>
                            <span className="font-bold text-red-600">-{totals.totalRefunds.toFixed(2)}€</span>
                          </div>
                        )}
                      </div>
                    </td>
                    <td colSpan={3} className="py-4 px-4 text-right">
                      <span className="text-title-md font-bold text-brand-dark">NETTO MESE:</span>
                      <div className="text-headline-md font-bold text-brand-primary">
                        {totals.netRevenue.toFixed(2)}€
                      </div>
                    </td>
                  </tr>
                </tfoot>
              </table>
            </div>
          </div>
        ) : (
          <div className="bg-white rounded-2xl shadow-card p-12 text-center">
            <FileText className="w-12 h-12 text-brand-gray mx-auto mb-4" />
            <p className="text-body-lg text-brand-gray">
              Nessun dato per {formatMonthYear(selectedDate)}
            </p>
            <p className="text-body-sm text-brand-gray/60 mt-2">
              Vengono mostrati ordini con stato COMPLETED/DELIVERED e rimborsi del mese
            </p>
          </div>
        )}
      </div>
    </main>
  )
}
