"use client"

import { useEffect, useState, useCallback } from "react"
import Link from "next/link"
import { Logo } from "@/components/Logo"
import { ArrowLeft, Search, Mail, Archive, RotateCcw, CheckCircle, Clock, X } from "lucide-react"

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
  remainingValue: number
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
  isArchived: boolean
  stripePaymentId?: string
  stripePaymentIntentId?: string
  items: OrderItem[]
  giftCards: GiftCard[]
}

const statusLabels: Record<string, string> = {
  PENDING_PAYMENT: "In attesa di pagamento",
  PENDING: "Da ritirare",
  COMPLETED: "Da ritirare", // Unificato con PENDING
  DELIVERED: "Consegnato",
  CANCELLED: "Annullato",
}

const statusColors: Record<string, string> = {
  PENDING_PAYMENT: "bg-yellow-100 text-yellow-700",
  PENDING: "bg-blue-100 text-blue-700",
  COMPLETED: "bg-blue-100 text-blue-700", // Stesso colore di PENDING
  DELIVERED: "bg-green-100 text-green-700",
  CANCELLED: "bg-red-100 text-red-700",
}

const statusIcons: Record<string, React.ReactNode> = {
  PENDING_PAYMENT: <Clock className="w-3 h-3" />,
  PENDING: <Clock className="w-3 h-3" />,
  COMPLETED: <CheckCircle className="w-3 h-3" />,
  DELIVERED: <CheckCircle className="w-3 h-3" />,
  CANCELLED: <Clock className="w-3 h-3" />,
}

export default function AdminOrdersPage() {
  const [orders, setOrders] = useState<Order[]>([])
  const [filteredOrders, setFilteredOrders] = useState<Order[]>([])
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState<"active" | "archived">("active")
  const [searchQuery, setSearchQuery] = useState("")

  const fetchOrders = useCallback(async () => {
    try {
      // Chiamata senza filtri per ottenere tutti gli ordini (come Gift Cards)
      const res = await fetch("/api/admin/orders")
      const data = await res.json()
      setOrders(data)
    } catch (error) {
      console.error("Error fetching orders:", error)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchOrders()
  }, [fetchOrders])

  // Ricarica quando la pagina prende focus (utente torna sulla tab)
  useEffect(() => {
    const handleFocus = () => {
      fetchOrders()
    }
    window.addEventListener('focus', handleFocus)
    return () => window.removeEventListener('focus', handleFocus)
  }, [fetchOrders])

  // Filtra ordini per tab (active/archived) e ricerca
  useEffect(() => {
    let filtered = orders
    
    // Filtro per tab
    filtered = filtered.filter(order => 
      filter === "active" ? !order.isArchived : order.isArchived
    )
    
    // Filtro per ricerca
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase()
      filtered = filtered.filter(order => 
        order.orderNumber.toLowerCase().includes(query) ||
        order.email.toLowerCase().includes(query) ||
        (order.phone && order.phone.toLowerCase().includes(query))
      )
    }
    
    setFilteredOrders(filtered)
  }, [searchQuery, orders, filter])

  const handleUpdateStatus = async (orderId: string, newStatus: string) => {
    const res = await fetch("/api/admin/orders", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id: orderId, status: newStatus }),
    })

    if (res.ok) {
      fetchOrders()
    }
  }

  const handleArchive = async (orderId: string) => {
    if (!confirm("Archiviare questo ordine?")) return

    const res = await fetch("/api/admin/orders", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id: orderId, isArchived: true }),
    })

    if (res.ok) {
      fetchOrders()
    }
  }

  const handleRestore = async (orderId: string) => {
    if (!confirm("Ripristinare questo ordine?")) return

    const res = await fetch("/api/admin/orders", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id: orderId, isArchived: false }),
    })

    if (res.ok) {
      fetchOrders()
    }
  }

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const handleResendGiftCardEmail = async (orderId: string) => {
    alert("Email gift card inviata nuovamente! (Mock)")
  }

  // Conta ordini per tab
  const activeCount = orders.filter(o => !o.isArchived).length
  const archivedCount = orders.filter(o => o.isArchived).length

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
          <Link href="/admin" className="p-2 -ml-2">
            <ArrowLeft className="w-6 h-6 text-brand-dark" />
          </Link>
          <h1 className="text-headline-sm font-bold text-brand-dark absolute left-1/2 -translate-x-1/2">
            Ordini
          </h1>
          <Logo variant="solo" className="h-3 w-auto ml-auto" />
        </div>
      </header>

      <div className="p-4">
        {/* Search */}
        <div className="relative mb-4">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-brand-gray" />
          <input
            type="text"
            placeholder="Cerca per numero ordine, email o telefono..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="input-field pl-12 pr-10"
          />
          {searchQuery && (
            <button
              onClick={() => setSearchQuery("")}
              className="absolute right-3 top-1/2 -translate-y-1/2 p-1 text-brand-gray hover:text-brand-dark hover:bg-brand-light-gray/50 rounded-full transition-colors"
              title="Cancella"
            >
              <X className="w-4 h-4" />
            </button>
          )}
        </div>

        {/* Separatore tra area ricerca e tabs */}
        <div className="border-b border-brand-light-gray mb-4" />

        {/* Tabs */}
        <div className="flex gap-2 mb-6">
          <button
            onClick={() => setFilter("active")}
            className={`flex-1 py-2 px-4 rounded-full text-title-sm font-medium transition-all ${
              filter === "active"
                ? "bg-brand-primary text-white"
                : "bg-white text-brand-gray border border-brand-light-gray"
            }`}
          >
            Attivi ({activeCount})
          </button>
          <button
            onClick={() => setFilter("archived")}
            className={`flex-1 py-2 px-4 rounded-full text-title-sm font-medium transition-all ${
              filter === "archived"
                ? "bg-brand-primary text-white"
                : "bg-white text-brand-gray border border-brand-light-gray"
            }`}
          >
            Archiviati ({archivedCount})
          </button>
        </div>

        {/* Orders List */}
        <div className="space-y-4">
          {filteredOrders.map((order) => (
            <div key={order.id} className="bg-white rounded-2xl shadow-card p-4">
              {/* Header: Numero Ordine + Status */}
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                  <h3 className="font-mono text-title-md font-bold text-brand-dark">
                    #{order.orderNumber}
                  </h3>
                  <span
                    className={`px-2 py-1 rounded-full text-label-sm flex items-center gap-1 ${
                      statusColors[order.status]
                    }`}
                  >
                    {statusIcons[order.status]}
                    {statusLabels[order.status]}
                  </span>
                </div>
                <span className="text-headline-sm font-bold text-brand-primary">
                  {order.total.toFixed(2)}€
                </span>
              </div>

              {/* Info Cliente */}
              <div className="space-y-1 mb-3">
                <p className="text-body-sm text-brand-dark">
                  <span className="text-brand-gray">Email:</span> {order.email}
                </p>
                {order.phone && (
                  <p className="text-body-sm text-brand-dark">
                    <span className="text-brand-gray">Tel:</span> {order.phone}
                  </p>
                )}
                <p className="text-body-sm text-brand-dark">
                  <span className="text-brand-gray">Data:</span>{" "}
                  {new Date(order.createdAt).toLocaleString("it-IT", {
                    day: "2-digit",
                    month: "2-digit",
                    year: "numeric",
                    hour: "2-digit",
                    minute: "2-digit",
                  })}
                </p>
              </div>

              {/* Stripe Payment Info */}
              {(order.stripePaymentId || order.stripePaymentIntentId) && (
                <div className="bg-gray-50 rounded-xl p-3 mb-3">
                  <p className="text-label-sm text-brand-gray mb-1">Pagamento Stripe:</p>
                  {order.stripePaymentIntentId && (
                    <p className="text-body-xs font-mono text-brand-dark break-all">
                      <span className="text-brand-gray">Payment:</span>{" "}
                      <a
                        href={`${process.env.NEXT_PUBLIC_STRIPE_DASHBOARD_URL}${order.stripePaymentIntentId}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-brand-primary hover:underline"
                      >
                        {order.stripePaymentIntentId}
                      </a>
                    </p>
                  )}
                  {order.stripePaymentId && (
                    <p className="text-body-xs font-mono text-brand-dark break-all">
                      <span className="text-brand-gray">Session:</span> {order.stripePaymentId}
                    </p>
                  )}
                </div>
              )}

              {/* Articoli */}
              <div className="bg-brand-cream rounded-xl p-3 mb-3">
                {order.items.length > 0 && (
                  <>
                    <p className="text-label-sm text-brand-gray mb-1">Prodotti:</p>
                    {order.items.map((item) => (
                      <div key={item.id} className="flex justify-between text-body-sm mb-1">
                        <span>
                          {item.product.name} {item.size && `(${item.size})`} x{item.quantity}
                        </span>
                        <span className="font-medium">{item.totalPrice.toFixed(2)}€</span>
                      </div>
                    ))}
                  </>
                )}
                {order.giftCards.length > 0 && (
                  <>
                    {order.items.length > 0 && <div className="border-t border-brand-light-gray/50 my-2" />}
                    <p className="text-label-sm text-brand-gray mb-1">Gift Card:</p>
                    {order.giftCards.map((gc) => (
                      <div key={gc.id} className="flex justify-between text-body-sm">
                        <span>{gc.code} ({gc.initialValue.toFixed(0)}€)</span>
                        <span className="font-medium">{gc.initialValue.toFixed(2)}€</span>
                      </div>
                    ))}
                  </>
                )}
              </div>

              {/* Actions */}
              <div className="flex flex-wrap gap-2">
                {filter === "active" ? (
                  <>
                    {/* PENDING_PAYMENT: nessuna azione */}
                    {order.status === "PENDING_PAYMENT" && (
                      <span className="text-label-sm text-brand-gray italic">
                        In attesa del pagamento...
                      </span>
                    )}
                    
                    {/* PENDING o COMPLETED: Segna Consegnato */}
                    {(order.status === "PENDING" || order.status === "COMPLETED") && (
                      <button
                        onClick={() => handleUpdateStatus(order.id, "DELIVERED")}
                        className="btn-primary py-2 text-label-md flex items-center gap-1.5"
                      >
                        <CheckCircle className="w-4 h-4" />
                        Segna Consegnato
                      </button>
                    )}
                    
                    {/* DELIVERED: Ripristina (solo se ha prodotti) e Archivia */}
                    {order.status === "DELIVERED" && (
                      <>
                        {/* Mostra Ripristina solo se l'ordine ha prodotti (non solo gift card) */}
                        {order.items.length > 0 && (
                          <button
                            onClick={() => {
                              if (confirm("Ripristinare a 'Da ritirare'?")) {
                                handleUpdateStatus(order.id, "PENDING")
                              }
                            }}
                            className="px-3 py-2 bg-orange-500 text-white rounded-full text-label-md flex items-center gap-1.5 hover:bg-orange-600 transition-colors"
                          >
                            <Clock className="w-4 h-4" />
                            Ripristina
                          </button>
                        )}
                        <button
                          onClick={() => handleArchive(order.id)}
                          className={`px-3 py-2 bg-gray-200 text-gray-700 rounded-full text-label-md flex items-center gap-1.5 hover:bg-gray-300 transition-colors ${order.items.length === 0 ? '' : 'ml-auto'}`}
                        >
                          <Archive className="w-4 h-4" />
                          Archivia
                        </button>
                      </>
                    )}
                    
                    {/* Gift Card: Reinvia email (se ci sono) */}
                    {order.giftCards.length > 0 && order.status !== "PENDING_PAYMENT" && (
                      <button
                        onClick={() => handleResendGiftCardEmail(order.id)}
                        className="px-3 py-2 bg-blue-500 text-white rounded-full text-label-md flex items-center gap-1.5 hover:bg-blue-600 transition-colors"
                      >
                        <Mail className="w-4 h-4" />
                        Reinvia email
                      </button>
                    )}
                  </>
                ) : (
                  /* Archiviati: mostra azioni in base allo stato */
                  <>
                    {/* Ripristina solo se non CANCELLED e ha prodotti */}
                    {order.status !== "CANCELLED" && order.items.length > 0 && (
                      <button
                        onClick={() => handleRestore(order.id)}
                        className="btn-primary py-2 text-label-md flex items-center gap-1.5"
                      >
                        <RotateCcw className="w-4 h-4" />
                        Ripristina
                      </button>
                    )}
                    
                    {/* Reinvia email se ci sono gift card */}
                    {order.giftCards.length > 0 && (
                      <button
                        onClick={() => handleResendGiftCardEmail(order.id)}
                        className="px-3 py-2 bg-blue-500 text-white rounded-full text-label-md flex items-center gap-1.5 hover:bg-blue-600 transition-colors"
                      >
                        <Mail className="w-4 h-4" />
                        Reinvia email
                      </button>
                    )}
                  </>
                )}
              </div>
            </div>
          ))}

          {filteredOrders.length === 0 && (
            <p className="text-center text-brand-gray py-12">
              {searchQuery 
                ? "Nessun ordine trovato" 
                : filter === "active" 
                  ? "Nessun ordine attivo" 
                  : "Nessun ordine archiviato"}
            </p>
          )}
        </div>
      </div>
    </main>
  )
}
