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
  FileText
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
  email: string
  phone?: string
  total: number
  createdAt: string
  paidAt?: string
  stripePaymentIntentId?: string
  items: OrderItem[]
  giftCards: GiftCard[]
}

const getOrderBreakdown = (order: Order) => {
  const productTotal = order.items.reduce((sum, item) => sum + item.totalPrice, 0)
  const giftCardTotal = order.giftCards.reduce((sum, gc) => sum + gc.initialValue, 0)
  return { productTotal, giftCardTotal }
}

export default function MonthlyReportPage() {
  const [orders, setOrders] = useState<Order[]>([])
  const [loading, setLoading] = useState(true)
  const [selectedDate, setSelectedDate] = useState(() => {
    const now = new Date()
    return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`
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

  const totals = useMemo(() => {
    const totalRevenue = filteredOrders.reduce((sum, o) => sum + o.total, 0)
    const productRevenue = filteredOrders
      .reduce((sum, o) => sum + o.items.reduce((itemSum, item) => itemSum + item.totalPrice, 0), 0)
    const giftCardRevenue = filteredOrders
      .reduce((sum, o) => sum + o.giftCards.reduce((gcSum, gc) => gcSum + gc.initialValue, 0), 0)
    return { totalRevenue, productRevenue, giftCardRevenue }
  }, [filteredOrders])

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
    if (filteredOrders.length === 0) return

    const rows: Record<string, string | number>[] = []
    
    filteredOrders.forEach(order => {
      const { productTotal, giftCardTotal } = getOrderBreakdown(order)
      const orderDate = new Date(order.paidAt!)
      
      rows.push({
        "Data": orderDate.toLocaleDateString("it-IT"),
        "Ora": orderDate.toLocaleTimeString("it-IT", { hour: "2-digit", minute: "2-digit" }),
        "Ordine": order.orderNumber,
        "Email": order.email,
        "Telefono": order.phone || "-",
        "Tipo": order.items.length > 0 && order.giftCards.length > 0 ? "MIXED" : order.giftCards.length > 0 ? "GIFT CARD" : "PRODOTTI",
        "Totale Prodotti": productTotal > 0 ? productTotal : "",
        "Totale Gift Card": giftCardTotal > 0 ? giftCardTotal : "",
        "Totale Ordine": order.total,
        "Stripe ID": order.stripePaymentIntentId || "-",
      })
      
      order.items.forEach(item => {
        rows.push({
          "Data": "",
          "Ora": "",
          "Ordine": "",
          "Email": "",
          "Telefono": "",
          "Tipo": "PRODOTTO",
          "Prodotto": `${item.product?.name || 'Prodotto eliminato'}${item.size ? ` (${item.size})` : ''}`,
          "Qty": item.quantity,
          "Prezzo Unitario": item.unitPrice,
          "Totale Riga": item.totalPrice,
        })
      })
      
      order.giftCards.forEach(gc => {
        rows.push({
          "Data": "",
          "Ora": "",
          "Ordine": "",
          "Email": "",
          "Telefono": "",
          "Tipo": "GIFT CARD",
          "Codice": gc.code,
          "Valore": gc.initialValue,
        })
      })
      
      rows.push({})
    })
    
    rows.push({
      "Data": "TOTALI MESE",
      "Totale Prodotti": totals.productRevenue,
      "Totale Gift Card": totals.giftCardRevenue,
      "Totale Ordine": totals.totalRevenue,
    })

    const ws = XLSX.utils.json_to_sheet(rows)
    const wb = XLSX.utils.book_new()
    XLSX.utils.book_append_sheet(wb, ws, "Report Mensile")
    
    const colWidths = [
      { wch: 12 }, { wch: 8 }, { wch: 12 }, { wch: 25 }, { wch: 15 },
      { wch: 12 }, { wch: 30 }, { wch: 8 }, { wch: 12 }, { wch: 12 },
      { wch: 12 }, { wch: 30 }
    ]
    ws['!cols'] = colWidths
    
    XLSX.writeFile(wb, `LoScalo_ReportMensile_${selectedDate}.xlsx`)
  }

  const generatePDF = async () => {
    if (filteredOrders.length === 0) return

    const pdfDoc = await PDFDocument.create()
    let page = pdfDoc.addPage([842, 595])
    const { width, height } = page.getSize()
    const font = await pdfDoc.embedFont(StandardFonts.Helvetica)
    const fontBold = await pdfDoc.embedFont(StandardFonts.HelveticaBold)
    
    let y = height - 50
    const margin = 40
    const rowHeight = 12
    
    page.drawText("Lo Scalo - Report Mensile Contabile", {
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
    page.drawText(`Totale Ordini: ${filteredOrders.length} | Incasso: ${totals.totalRevenue.toFixed(2)}€`, {
      x: margin,
      y,
      size: 10,
      font,
      color: rgb(0.4, 0.4, 0.4),
    })
    
    y -= 30
    
    const checkNewPage = (neededSpace: number) => {
      if (y < neededSpace + 60) {
        page = pdfDoc.addPage([842, 595])
        y = height - 50
        return true
      }
      return false
    }
    
    filteredOrders.forEach((order) => {
      const { productTotal, giftCardTotal } = getOrderBreakdown(order)
      const date = new Date(order.paidAt!)
      
      checkNewPage(60)
      
      page.drawRectangle({
        x: margin,
        y: y - 5,
        width: width - margin * 2,
        height: 18,
        color: rgb(0.95, 0.95, 0.95),
      })
      
      page.drawText(`#${order.orderNumber}`, {
        x: margin,
        y,
        size: 10,
        font: fontBold,
      })
      
      page.drawText(date.toLocaleDateString("it-IT"), {
        x: margin + 80,
        y,
        size: 9,
        font,
        color: rgb(0.4, 0.4, 0.4),
      })
      
      page.drawText(order.email, {
        x: margin + 150,
        y,
        size: 9,
        font,
      })
      
      page.drawText(`${order.total.toFixed(2)}€`, {
        x: width - margin - 60,
        y,
        size: 10,
        font: fontBold,
        color: rgb(0.8, 0.3, 0.1),
      })
      
      y -= rowHeight + 5
      
      if (productTotal > 0) {
        page.drawText(`Prodotti: ${productTotal.toFixed(2)}€`, {
          x: margin + 20,
          y,
          size: 8,
          font,
          color: rgb(0.2, 0.4, 0.8),
        })
        y -= rowHeight
      }
      
      if (giftCardTotal > 0) {
        page.drawText(`Gift Card: ${giftCardTotal.toFixed(2)}€`, {
          x: margin + 20,
          y,
          size: 8,
          font,
          color: rgb(0.2, 0.6, 0.2),
        })
        y -= rowHeight
      }
      
      // Stripe ID
      if (order.stripePaymentIntentId) {
        page.drawText(`Stripe: ${order.stripePaymentIntentId}`, {
          x: margin + 20,
          y,
          size: 7,
          font,
          color: rgb(0.4, 0.4, 0.4),
        })
        y -= rowHeight
      }
      
      y -= 10
    })
    
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
    page.drawText(`Prodotti: ${totals.productRevenue.toFixed(2)}€`, {
      x: margin + 20,
      y,
      size: 11,
      font: fontBold,
      color: rgb(0.2, 0.4, 0.8),
    })
    
    y -= 18
    page.drawText(`Gift Card: ${totals.giftCardRevenue.toFixed(2)}€`, {
      x: margin + 20,
      y,
      size: 11,
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

        {/* Info & Export */}
        <div className="mb-4 space-y-3">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
            <div>
              <h2 className="text-title-md font-bold text-brand-dark">
                {filteredOrders.length} {filteredOrders.length === 1 ? "ordine" : "ordini"}
              </h2>
              <p className="text-body-sm text-brand-gray">
                Solo ordini pagati (COMPLETED e DELIVERED)
              </p>
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={exportToExcel}
                disabled={filteredOrders.length === 0}
                className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-full text-body-sm font-medium hover:bg-green-700 transition-colors disabled:opacity-50"
              >
                <FileSpreadsheet className="w-4 h-4" />
                Export Excel
              </button>
              <button
                onClick={generatePDF}
                disabled={filteredOrders.length === 0}
                className="flex items-center gap-2 px-4 py-2 bg-brand-primary text-white rounded-full text-body-sm font-medium hover:bg-brand-dark transition-colors disabled:opacity-50"
              >
                <Printer className="w-4 h-4" />
                Stampa PDF
              </button>
            </div>
          </div>
        </div>

        {/* Orders List */}
        {filteredOrders.length > 0 ? (
          <div className="bg-white rounded-2xl shadow-card overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-brand-cream border-b border-brand-light-gray">
                  <tr>
                    <th className="text-left py-3 px-4 text-label-md font-bold text-brand-gray">Data</th>
                    <th className="text-left py-3 px-4 text-label-md font-bold text-brand-gray">Ordine</th>
                    <th className="text-left py-3 px-4 text-label-md font-bold text-brand-gray">Cliente</th>
                    <th className="text-left py-3 px-4 text-label-md font-bold text-brand-gray">Dettaglio</th>
                    <th className="text-left py-3 px-4 text-label-md font-bold text-brand-gray">Stripe ID</th>
                    <th className="text-right py-3 px-4 text-label-md font-bold text-brand-gray">Totale</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredOrders.map((order) => {
                    const { productTotal, giftCardTotal } = getOrderBreakdown(order)
                    const orderDate = new Date(order.paidAt!)
                    return (
                      <tr key={order.id} className="border-b border-brand-light-gray/50 last:border-b-0 hover:bg-brand-cream/50">
                        <td className="py-3 px-4">
                          <div className="text-body-sm text-brand-dark">
                            {orderDate.toLocaleDateString("it-IT")}
                          </div>
                          <div className="text-label-sm text-brand-gray">
                            {orderDate.toLocaleTimeString("it-IT", { hour: "2-digit", minute: "2-digit" })}
                          </div>
                        </td>
                        <td className="py-3 px-4">
                          <div className="font-mono text-body-sm font-bold text-brand-dark">
                            #{order.orderNumber}
                          </div>
                        </td>
                        <td className="py-3 px-4">
                          <div className="text-body-sm text-brand-dark">{order.email}</div>
                          {order.phone && (
                            <div className="text-label-sm text-brand-gray">{order.phone}</div>
                          )}
                        </td>
                        <td className="py-3 px-4">
                          <div className="space-y-1">
                            {productTotal > 0 && (
                              <div className="text-body-sm text-blue-600">
                                Prodotti: {productTotal.toFixed(2)}€
                              </div>
                            )}
                            {giftCardTotal > 0 && (
                              <div className="text-body-sm text-green-600">
                                Gift Card: {giftCardTotal.toFixed(2)}€
                              </div>
                            )}
                          </div>
                        </td>
                        <td className="py-3 px-4">
                          <div className="font-mono text-label-sm text-brand-gray truncate max-w-[150px]">
                            {order.stripePaymentIntentId ? (
                              <span className="text-brand-dark">{order.stripePaymentIntentId}</span>
                            ) : (
                              <span className="text-brand-gray/50">-</span>
                            )}
                          </div>
                        </td>
                        <td className="py-3 px-4 text-right">
                          <span className="text-headline-sm font-bold text-brand-primary">
                            {order.total.toFixed(2)}€
                          </span>
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
                <tfoot className="bg-brand-cream border-t-2 border-brand-light-gray">
                  <tr>
                    <td colSpan={4} className="py-4 px-4 text-right">
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
                      <span className="text-title-md font-bold text-brand-dark">TOTALE MESE:</span>
                      <div className="text-headline-md font-bold text-brand-primary">
                        {totals.totalRevenue.toFixed(2)}€
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
              Nessun ordine pagato per {formatMonthYear(selectedDate)}
            </p>
            <p className="text-body-sm text-brand-gray/60 mt-2">
              Vengono mostrati solo gli ordini con stato COMPLETED o DELIVERED
            </p>
          </div>
        )}
      </div>
    </main>
  )
}
