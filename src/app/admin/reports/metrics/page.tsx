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
  ShoppingCart,
  TrendingUp,
  TrendingDown,
  FileSpreadsheet,
  Printer,
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

interface ProductSales {
  name: string
  quantity: number
  revenue: number
}

interface GiftCardSales {
  value: number
  quantity: number
  revenue: number
}

export default function MetricsReportPage() {
  const [orders, setOrders] = useState<Order[]>([])
  const [loading, setLoading] = useState(true)
  const [viewMode, setViewMode] = useState<"month" | "year">("month")
  const [selectedYear, setSelectedYear] = useState(() => new Date().getFullYear())
  const [selectedMonth, setSelectedMonth] = useState(() => {
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

  const filteredOrders = useMemo(() => {
    return orders.filter(order => {
      if (!order.paidAt) return false
      const orderDate = new Date(order.paidAt)
      const isPaidOrder = ["COMPLETED", "DELIVERED"].includes(order.status)
      
      if (viewMode === "month") {
        const [year, month] = selectedMonth.split('-').map(Number)
        const isOnMonth = orderDate.getFullYear() === year && orderDate.getMonth() === month - 1
        return isOnMonth && isPaidOrder
      } else {
        // Year view
        return orderDate.getFullYear() === selectedYear && isPaidOrder
      }
    }).sort((a, b) => new Date(a.paidAt!).getTime() - new Date(b.paidAt!).getTime())
  }, [orders, viewMode, selectedMonth, selectedYear])

  const metrics = useMemo(() => {
    const totalOrders = filteredOrders.length
    
    // Product metrics
    const productOrders = filteredOrders.filter(o => o.items.length > 0)
    const totalProductsSale = productOrders
      .reduce((sum, o) => sum + o.items.reduce((itemSum, item) => itemSum + item.totalPrice, 0), 0)
    const totalProductQuantity = productOrders
      .reduce((sum, o) => sum + o.items.reduce((qty, item) => qty + item.quantity, 0), 0)
    
    // Gift card metrics
    const giftCardOrders = filteredOrders.filter(o => o.giftCards.length > 0)
    const totalGiftCardsSale = giftCardOrders
      .reduce((sum, o) => sum + o.giftCards.reduce((gcSum, gc) => gcSum + gc.initialValue, 0), 0)
    const totalGiftCardQuantity = giftCardOrders
      .reduce((sum, o) => sum + o.giftCards.length, 0)
    
    // Cart metrics
    const totalRevenue = totalProductsSale + totalGiftCardsSale
    const avgCartValue = totalOrders > 0 ? totalRevenue / totalOrders : 0

    // Top & Bottom Products
    const productMap = new Map<string, ProductSales>()
    filteredOrders.forEach(order => {
      order.items.forEach(item => {
        if (!item.product) return // Skip if product was deleted
        const name = item.size ? `${item.product.name} (${item.size})` : item.product.name
        const existing = productMap.get(name)
        if (existing) {
          existing.quantity += item.quantity
          existing.revenue += item.totalPrice
        } else {
          productMap.set(name, { name, quantity: item.quantity, revenue: item.totalPrice })
        }
      })
    })
    const allProducts = Array.from(productMap.values()).sort((a, b) => b.quantity - a.quantity)
    const topProducts = allProducts.slice(0, 5)
    const bottomProducts = allProducts.length > 5 ? allProducts.slice(-5).reverse() : []

    // Top & Bottom Gift Cards (by value denomination)
    const giftCardMap = new Map<number, GiftCardSales>()
    filteredOrders.forEach(order => {
      order.giftCards.forEach(gc => {
        const existing = giftCardMap.get(gc.initialValue)
        if (existing) {
          existing.quantity += 1
          existing.revenue += gc.initialValue
        } else {
          giftCardMap.set(gc.initialValue, { value: gc.initialValue, quantity: 1, revenue: gc.initialValue })
        }
      })
    })
    const allGiftCards = Array.from(giftCardMap.values()).sort((a, b) => b.quantity - a.quantity)
    const topGiftCards = allGiftCards.slice(0, 5)
    const bottomGiftCards = allGiftCards.length > 5 ? allGiftCards.slice(-5).reverse() : []

    return {
      totalOrders,
      totalProductsSale,
      totalGiftCardsSale,
      totalRevenue,
      avgCartValue,
      totalProductQuantity,
      totalGiftCardQuantity,
      topProducts,
      bottomProducts,
      topGiftCards,
      bottomGiftCards,
    }
  }, [filteredOrders])

  const handleMonthChange = (direction: 'prev' | 'next') => {
    const [year, month] = selectedMonth.split('-').map(Number)
    const current = new Date(year, month - 1, 1)
    if (direction === 'prev') {
      current.setMonth(current.getMonth() - 1)
    } else {
      current.setMonth(current.getMonth() + 1)
    }
    setSelectedMonth(`${current.getFullYear()}-${String(current.getMonth() + 1).padStart(2, '0')}`)
  }

  const handleYearChange = (direction: 'prev' | 'next') => {
    setSelectedYear(prev => direction === 'prev' ? prev - 1 : prev + 1)
  }

  const formatPeriod = () => {
    if (viewMode === "month") {
      const [y, m] = selectedMonth.split('-').map(Number)
      return new Date(y, m - 1, 1).toLocaleDateString("it-IT", {
        month: "long",
        year: "numeric",
      })
    }
    return `${selectedYear}`
  }

  const isCurrentPeriod = viewMode === "month" 
    ? selectedMonth === new Date().toISOString().slice(0, 7)
    : selectedYear === new Date().getFullYear()

  const exportToExcel = () => {
    const rows: Record<string, string | number>[] = []
    
    rows.push({
      "Metrica": "Totale Prodotti (€)",
      "Valore": metrics.totalProductsSale,
      "Quantità": metrics.totalProductQuantity,
    })
    rows.push({
      "Metrica": "Totale Gift Card (€)",
      "Valore": metrics.totalGiftCardsSale,
      "Quantità": metrics.totalGiftCardQuantity,
    })
    rows.push({
      "Metrica": "Totale Incasso (€)",
      "Valore": metrics.totalRevenue,
      "Quantità": "",
    })
    rows.push({
      "Metrica": "Carrello Medio (€)",
      "Valore": metrics.avgCartValue.toFixed(2),
      "Quantità": "",
    })
    
    rows.push({})
    rows.push({ "Metrica": "TOP 5 PRODOTTI", "Valore": "", "Quantità": "" })
    metrics.topProducts.forEach((p, i) => {
      rows.push({
        "Metrica": `${i + 1}. ${p.name}`,
        "Valore": p.revenue,
        "Quantità": p.quantity,
      })
    })
    
    rows.push({})
    rows.push({ "Metrica": "BOTTOM 5 PRODOTTI", "Valore": "", "Quantità": "" })
    metrics.bottomProducts.forEach((p, i) => {
      rows.push({
        "Metrica": `${i + 1}. ${p.name}`,
        "Valore": p.revenue,
        "Quantità": p.quantity,
      })
    })
    
    rows.push({})
    rows.push({ "Metrica": "TOP 5 GIFT CARD", "Valore": "", "Quantità": "" })
    metrics.topGiftCards.forEach((gc, i) => {
      rows.push({
        "Metrica": `${i + 1}. Gift Card ${gc.value}€`,
        "Valore": gc.revenue,
        "Quantità": gc.quantity,
      })
    })
    
    rows.push({})
    rows.push({ "Metrica": "BOTTOM 5 GIFT CARD", "Valore": "", "Quantità": "" })
    metrics.bottomGiftCards.forEach((gc, i) => {
      rows.push({
        "Metrica": `${i + 1}. Gift Card ${gc.value}€`,
        "Valore": gc.revenue,
        "Quantità": gc.quantity,
      })
    })

    const ws = XLSX.utils.json_to_sheet(rows)
    const wb = XLSX.utils.book_new()
    XLSX.utils.book_append_sheet(wb, ws, "Metriche")
    
    const colWidths = [{ wch: 40 }, { wch: 15 }, { wch: 12 }]
    ws['!cols'] = colWidths
    
    const fileName = viewMode === "month" 
      ? `LoScalo_Metriche_${selectedMonth}.xlsx`
      : `LoScalo_Metriche_${selectedYear}.xlsx`
    XLSX.writeFile(wb, fileName)
  }

  const generatePDF = async () => {
    const pdfDoc = await PDFDocument.create()
    let page = pdfDoc.addPage([595, 842])
    const { width, height } = page.getSize()
    const font = await pdfDoc.embedFont(StandardFonts.Helvetica)
    const fontBold = await pdfDoc.embedFont(StandardFonts.HelveticaBold)
    
    let y = height - 50
    const margin = 40
    
    const periodLabel = viewMode === "month" ? "Mensili" : "Annuali"
    
    // Header
    page.drawText(`Lo Scalo - Metriche ${periodLabel}`, {
      x: margin,
      y,
      size: 20,
      font: fontBold,
      color: rgb(0, 0, 0),
    })
    
    y -= 30
    page.drawText(`Periodo: ${formatPeriod()}`, {
      x: margin,
      y,
      size: 12,
      font,
      color: rgb(0.4, 0.4, 0.4),
    })
    
    y -= 20
    page.drawText(`Totale Ordini: ${metrics.totalOrders}`, {
      x: margin,
      y,
      size: 10,
      font,
      color: rgb(0.4, 0.4, 0.4),
    })
    
    y -= 40
    
    const drawMetricCard = (label: string, value: string, color: [number, number, number]) => {
      page.drawRectangle({
        x: margin,
        y: y - 5,
        width: width - margin * 2,
        height: 50,
        color: rgb(0.97, 0.97, 0.97),
      })
      
      page.drawText(label, {
        x: margin + 15,
        y: y + 20,
        size: 10,
        font,
        color: rgb(0.4, 0.4, 0.4),
      })
      
      page.drawText(value, {
        x: margin + 15,
        y: y,
        size: 16,
        font: fontBold,
        color: rgb(color[0], color[1], color[2]),
      })
      
      y -= 65
    }
    
    // Main metrics
    drawMetricCard("Totale Prodotti", `${metrics.totalProductsSale.toFixed(2)}€`, [0.2, 0.4, 0.8])
    drawMetricCard("Totale Gift Card", `${metrics.totalGiftCardsSale.toFixed(2)}€`, [0.2, 0.6, 0.2])
    drawMetricCard("Totale Incasso", `${metrics.totalRevenue.toFixed(2)}€`, [0.8, 0.3, 0.1])
    drawMetricCard("Carrello Medio", `${metrics.avgCartValue.toFixed(2)}€`, [0.4, 0.2, 0.6])
    
    // Check for new page
    if (y < 200) {
      page = pdfDoc.addPage([595, 842])
      y = height - 50
    }
    
    // Top Products
    y -= 20
    page.drawText("Top 5 Prodotti", {
      x: margin,
      y,
      size: 12,
      font: fontBold,
      color: rgb(0.2, 0.6, 0.2),
    })
    y -= 20
    
    metrics.topProducts.forEach((p, i) => {
      page.drawText(`${i + 1}. ${p.name.substring(0, 40)}${p.name.length > 40 ? '...' : ''}`, {
        x: margin + 10,
        y,
        size: 9,
        font,
      })
      page.drawText(`${p.quantity} pz - ${p.revenue.toFixed(2)}€`, {
        x: width - margin - 100,
        y,
        size: 9,
        font,
        color: rgb(0.4, 0.4, 0.4),
      })
      y -= 15
    })
    
    // Bottom Products
    if (metrics.bottomProducts.length > 0) {
      y -= 15
      page.drawText("Bottom 5 Prodotti", {
        x: margin,
        y,
        size: 12,
        font: fontBold,
        color: rgb(0.8, 0.2, 0.2),
      })
      y -= 20
      
      metrics.bottomProducts.forEach((p, i) => {
        page.drawText(`${i + 1}. ${p.name.substring(0, 40)}${p.name.length > 40 ? '...' : ''}`, {
          x: margin + 10,
          y,
          size: 9,
          font,
        })
        page.drawText(`${p.quantity} pz - ${p.revenue.toFixed(2)}€`, {
          x: width - margin - 100,
          y,
          size: 9,
          font,
          color: rgb(0.4, 0.4, 0.4),
        })
        y -= 15
      })
    }
    
    // Check for new page
    if (y < 200) {
      page = pdfDoc.addPage([595, 842])
      y = height - 50
    }
    
    // Top Gift Cards
    y -= 20
    page.drawText("Top 5 Gift Card", {
      x: margin,
      y,
      size: 12,
      font: fontBold,
      color: rgb(0.2, 0.6, 0.2),
    })
    y -= 20
    
    metrics.topGiftCards.forEach((gc, i) => {
      page.drawText(`${i + 1}. Gift Card ${gc.value}€`, {
        x: margin + 10,
        y,
        size: 9,
        font,
      })
      page.drawText(`${gc.quantity} vendute - ${gc.revenue.toFixed(2)}€`, {
        x: width - margin - 120,
        y,
        size: 9,
        font,
        color: rgb(0.4, 0.4, 0.4),
      })
      y -= 15
    })
    
    // Bottom Gift Cards
    if (metrics.bottomGiftCards.length > 0) {
      y -= 15
      page.drawText("Bottom 5 Gift Card", {
        x: margin,
        y,
        size: 12,
        font: fontBold,
        color: rgb(0.8, 0.2, 0.2),
      })
      y -= 20
      
      metrics.bottomGiftCards.forEach((gc, i) => {
        page.drawText(`${i + 1}. Gift Card ${gc.value}€`, {
          x: margin + 10,
          y,
          size: 9,
          font,
        })
        page.drawText(`${gc.quantity} vendute - ${gc.revenue.toFixed(2)}€`, {
          x: width - margin - 120,
          y,
          size: 9,
          font,
          color: rgb(0.4, 0.4, 0.4),
        })
        y -= 15
      })
    }
    
    const pdfBytes = await pdfDoc.save()
    const blob = new Blob([pdfBytes as unknown as ArrayBuffer], { type: "application/pdf" })
    const link = document.createElement("a")
    link.href = URL.createObjectURL(blob)
    const fileName = viewMode === "month" 
      ? `LoScalo_Metriche_${selectedMonth}.pdf`
      : `LoScalo_Metriche_${selectedYear}.pdf`
    link.download = fileName
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
            Metriche
          </h1>
        </div>
      </header>

      <div className="p-4 max-w-7xl mx-auto">
        {/* View Mode Toggle + Date Navigation */}
        <div className="bg-white rounded-2xl shadow-card p-4 mb-4">
          {/* View Mode Switch */}
          <div className="flex justify-center mb-4">
            <div className="inline-flex bg-brand-light-gray/30 rounded-full p-1">
              <button
                onClick={() => setViewMode("month")}
                className={`px-6 py-2 rounded-full text-body-sm font-medium transition-all ${
                  viewMode === "month"
                    ? "bg-brand-primary text-white"
                    : "text-brand-gray hover:text-brand-dark"
                }`}
              >
                Mese
              </button>
              <button
                onClick={() => setViewMode("year")}
                className={`px-6 py-2 rounded-full text-body-sm font-medium transition-all ${
                  viewMode === "year"
                    ? "bg-brand-primary text-white"
                    : "text-brand-gray hover:text-brand-dark"
                }`}
              >
                Anno
              </button>
            </div>
          </div>
          
          {/* Date Navigation */}
          <div className="flex items-center justify-between">
            <button
              onClick={() => viewMode === "month" ? handleMonthChange('prev') : handleYearChange('prev')}
              className="p-2 rounded-xl hover:bg-brand-light-gray/50 transition-colors"
              title="Precedente"
              aria-label="Precedente"
            >
              <ChevronLeft className="w-6 h-6 text-brand-dark" />
            </button>
            
            <div className="flex items-center gap-2">
              <Calendar className="w-5 h-5 text-brand-primary" />
              {viewMode === "month" ? (
                <input
                  type="month"
                  value={selectedMonth}
                  onChange={(e) => setSelectedMonth(e.target.value)}
                  className="text-title-md font-bold text-brand-dark bg-transparent border-none focus:outline-none cursor-pointer"
                  title="Seleziona mese"
                  aria-label="Seleziona mese"
                />
              ) : (
                <select
                  value={selectedYear}
                  onChange={(e) => setSelectedYear(parseInt(e.target.value))}
                  className="text-title-md font-bold text-brand-dark bg-transparent border-none focus:outline-none cursor-pointer"
                  title="Seleziona anno"
                  aria-label="Seleziona anno"
                >
                  {Array.from({ length: 5 }, (_, i) => new Date().getFullYear() - 2 + i).map(year => (
                    <option key={year} value={year}>{year}</option>
                  ))}
                </select>
              )}
              {isCurrentPeriod && (
                <span className="px-2 py-1 bg-brand-primary/10 text-brand-primary text-label-sm rounded-full">
                  Corrente
                </span>
              )}
            </div>

            <button
              onClick={() => viewMode === "month" ? handleMonthChange('next') : handleYearChange('next')}
              className="p-2 rounded-xl hover:bg-brand-light-gray/50 transition-colors"
              title="Successivo"
              aria-label="Successivo"
            >
              <ChevronRight className="w-6 h-6 text-brand-dark" />
            </button>
          </div>
        </div>

        {/* Metrics Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
          {/* Total Products Sale */}
          <div className="bg-white rounded-2xl shadow-card p-5">
            <div className="flex items-center gap-3 mb-3">
              <div className="w-12 h-12 bg-blue-500/10 rounded-xl flex items-center justify-center">
                <Package className="w-6 h-6 text-blue-500" />
              </div>
              <span className="text-label-md text-brand-gray">Totale Prodotti</span>
            </div>
            <p className="text-headline-lg font-bold text-brand-dark">
              {metrics.totalProductsSale.toFixed(2)}€
            </p>
            <p className="text-body-sm text-brand-gray mt-1">
              {metrics.totalProductQuantity} pezzi
            </p>
          </div>

          {/* Total Gift Cards Sale */}
          <div className="bg-white rounded-2xl shadow-card p-5">
            <div className="flex items-center gap-3 mb-3">
              <div className="w-12 h-12 bg-green-500/10 rounded-xl flex items-center justify-center">
                <Gift className="w-6 h-6 text-green-500" />
              </div>
              <span className="text-label-md text-brand-gray">Totale Gift Card</span>
            </div>
            <p className="text-headline-lg font-bold text-brand-dark">
              {metrics.totalGiftCardsSale.toFixed(2)}€
            </p>
            <p className="text-body-sm text-brand-gray mt-1">
              {metrics.totalGiftCardQuantity} card
            </p>
          </div>

          {/* Average Cart Value */}
          <div className="bg-white rounded-2xl shadow-card p-5">
            <div className="flex items-center gap-3 mb-3">
              <div className="w-12 h-12 bg-purple-500/10 rounded-xl flex items-center justify-center">
                <ShoppingCart className="w-6 h-6 text-purple-500" />
              </div>
              <span className="text-label-md text-brand-gray">Carrello Medio</span>
            </div>
            <p className="text-headline-lg font-bold text-brand-dark">
              {metrics.avgCartValue.toFixed(2)}€
            </p>
            <p className="text-body-sm text-brand-gray mt-1">
              {metrics.totalOrders} ordini
            </p>
          </div>

          {/* Total Revenue */}
          <div className="bg-white rounded-2xl shadow-card p-5 border-2 border-brand-primary/20">
            <div className="flex items-center gap-3 mb-3">
              <div className="w-12 h-12 bg-brand-primary/10 rounded-xl flex items-center justify-center">
                <CreditCard className="w-6 h-6 text-brand-primary" />
              </div>
              <span className="text-label-md text-brand-gray">Totale Incasso</span>
            </div>
            <p className="text-headline-lg font-bold text-brand-primary">
              {metrics.totalRevenue.toFixed(2)}€
            </p>
            <p className="text-body-sm text-brand-gray mt-1">
              Prodotti + Gift Card
            </p>
          </div>
        </div>

        {/* Top/Bottom Sellers Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
          {/* Top/Bottom Products */}
          <div className="bg-white rounded-2xl shadow-card p-5">
            <h2 className="text-title-md font-bold text-brand-dark mb-4 flex items-center gap-2">
              <Package className="w-5 h-5 text-blue-500" />
              Prodotti
            </h2>
            
            {/* Top Products */}
            <div className="mb-6">
              <h3 className="text-label-md font-bold text-green-600 uppercase mb-3 flex items-center gap-1">
                <TrendingUp className="w-4 h-4" />
                Top 5
              </h3>
              <div className="space-y-2">
                {metrics.topProducts.map((p, i) => (
                  <div key={p.name} className="flex items-center justify-between p-3 bg-green-50 rounded-xl">
                    <div className="flex items-center gap-3">
                      <span className="w-6 h-6 bg-green-500 text-white text-label-sm rounded-full flex items-center justify-center">
                        {i + 1}
                      </span>
                      <span className="text-body-sm font-medium text-brand-dark truncate max-w-[150px]">
                        {p.name}
                      </span>
                    </div>
                    <div className="text-right">
                      <p className="text-body-sm font-bold text-brand-dark">{p.quantity} pz</p>
                      <p className="text-label-sm text-brand-gray">{p.revenue.toFixed(2)}€</p>
                    </div>
                  </div>
                ))}
                {metrics.topProducts.length === 0 && (
                  <p className="text-body-sm text-brand-gray text-center py-4">Nessun prodotto venduto</p>
                )}
              </div>
            </div>
            
            {/* Bottom Products */}
            {metrics.bottomProducts.length > 0 && (
              <div>
                <h3 className="text-label-md font-bold text-red-600 uppercase mb-3 flex items-center gap-1">
                  <TrendingDown className="w-4 h-4" />
                  Bottom 5
                </h3>
                <div className="space-y-2">
                  {metrics.bottomProducts.map((p, i) => (
                    <div key={p.name} className="flex items-center justify-between p-3 bg-red-50 rounded-xl">
                      <div className="flex items-center gap-3">
                        <span className="w-6 h-6 bg-red-500 text-white text-label-sm rounded-full flex items-center justify-center">
                          {i + 1}
                        </span>
                        <span className="text-body-sm font-medium text-brand-dark truncate max-w-[150px]">
                          {p.name}
                        </span>
                      </div>
                      <div className="text-right">
                        <p className="text-body-sm font-bold text-brand-dark">{p.quantity} pz</p>
                        <p className="text-label-sm text-brand-gray">{p.revenue.toFixed(2)}€</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Top/Bottom Gift Cards */}
          <div className="bg-white rounded-2xl shadow-card p-5">
            <h2 className="text-title-md font-bold text-brand-dark mb-4 flex items-center gap-2">
              <Gift className="w-5 h-5 text-green-500" />
              Gift Card
            </h2>
            
            {/* Top Gift Cards */}
            <div className="mb-6">
              <h3 className="text-label-md font-bold text-green-600 uppercase mb-3 flex items-center gap-1">
                <TrendingUp className="w-4 h-4" />
                Top 5
              </h3>
              <div className="space-y-2">
                {metrics.topGiftCards.map((gc, i) => (
                  <div key={gc.value} className="flex items-center justify-between p-3 bg-green-50 rounded-xl">
                    <div className="flex items-center gap-3">
                      <span className="w-6 h-6 bg-green-500 text-white text-label-sm rounded-full flex items-center justify-center">
                        {i + 1}
                      </span>
                      <span className="text-body-sm font-medium text-brand-dark">
                        Gift Card {gc.value}€
                      </span>
                    </div>
                    <div className="text-right">
                      <p className="text-body-sm font-bold text-brand-dark">{gc.quantity} vendite</p>
                      <p className="text-label-sm text-brand-gray">{gc.revenue.toFixed(2)}€</p>
                    </div>
                  </div>
                ))}
                {metrics.topGiftCards.length === 0 && (
                  <p className="text-body-sm text-brand-gray text-center py-4">Nessuna gift card venduta</p>
                )}
              </div>
            </div>
            
            {/* Bottom Gift Cards */}
            {metrics.bottomGiftCards.length > 0 && (
              <div>
                <h3 className="text-label-md font-bold text-red-600 uppercase mb-3 flex items-center gap-1">
                  <TrendingDown className="w-4 h-4" />
                  Bottom 5
                </h3>
                <div className="space-y-2">
                  {metrics.bottomGiftCards.map((gc, i) => (
                    <div key={gc.value} className="flex items-center justify-between p-3 bg-red-50 rounded-xl">
                      <div className="flex items-center gap-3">
                        <span className="w-6 h-6 bg-red-500 text-white text-label-sm rounded-full flex items-center justify-center">
                          {i + 1}
                        </span>
                        <span className="text-body-sm font-medium text-brand-dark">
                          Gift Card {gc.value}€
                        </span>
                      </div>
                      <div className="text-right">
                        <p className="text-body-sm font-bold text-brand-dark">{gc.quantity} vendite</p>
                        <p className="text-label-sm text-brand-gray">{gc.revenue.toFixed(2)}€</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Export Buttons */}
        <div className="bg-white rounded-2xl shadow-card p-4">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
            <div>
              <h2 className="text-title-md font-bold text-brand-dark">
                Export Dati
              </h2>
              <p className="text-body-sm text-brand-gray">
                Scarica le metriche in Excel o PDF
              </p>
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={exportToExcel}
                className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-full text-body-sm font-medium hover:bg-green-700 transition-colors"
              >
                <FileSpreadsheet className="w-4 h-4" />
                Export Excel
              </button>
              <button
                onClick={generatePDF}
                className="flex items-center gap-2 px-4 py-2 bg-brand-primary text-white rounded-full text-body-sm font-medium hover:bg-brand-dark transition-colors"
              >
                <Printer className="w-4 h-4" />
                Stampa PDF
              </button>
            </div>
          </div>
        </div>
      </div>
    </main>
  )
}
