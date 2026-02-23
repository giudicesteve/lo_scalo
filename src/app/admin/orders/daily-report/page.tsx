"use client"

import { Suspense, useEffect, useState, useMemo } from "react"
import Link from "next/link"
import { useSearchParams } from "next/navigation"
import { ArrowLeft, Calendar, ChevronLeft, ChevronRight, Download, Package, CreditCard, Gift, AlertTriangle } from "lucide-react"

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

  const filteredOrders = useMemo(() => {
    const date = new Date(selectedDate)
    date.setHours(0, 0, 0, 0)
    const nextDay = new Date(date)
    nextDay.setDate(nextDay.getDate() + 1)

    return orders.filter(order => {
      const orderDate = new Date(order.createdAt)
      const isOnDate = orderDate >= date && orderDate < nextDay
      // Only show paid orders (Option A: PENDING, COMPLETED, DELIVERED)
      const isPaidOrder = ["PENDING", "COMPLETED", "DELIVERED"].includes(order.status)
      return isOnDate && isPaidOrder
    })
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
          <Link href="/admin/orders" className="p-2 -ml-2">
            <ArrowLeft className="w-6 h-6 text-brand-dark" />
          </Link>
          <h1 className="text-headline-sm font-bold text-brand-dark absolute left-1/2 -translate-x-1/2">
            Riep. Contabilità
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

        {/* Orders Count */}
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-title-md font-bold text-brand-dark">
            {filteredOrders.length} {filteredOrders.length === 1 ? "ordine" : "ordini"}
          </h2>
          <button
            onClick={() => window.print()}
            className="flex items-center gap-2 px-4 py-2 bg-white border-2 border-brand-light-gray rounded-full text-body-sm font-medium text-brand-dark hover:border-brand-primary hover:text-brand-primary transition-colors"
          >
            <Download className="w-4 h-4" />
            Stampa / PDF
          </button>
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
              Nessun ordine per {formatDate(selectedDate)}
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
