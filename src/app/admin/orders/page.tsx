"use client"

import { useEffect, useState, useCallback } from "react"
import Link from "next/link"
// eslint-disable-next-line @typescript-eslint/no-unused-vars
import { ArrowLeft, Search, Mail, Archive, RotateCcw, CheckCircle, Clock, X, AlertTriangle, Store, Globe, RotateCcwIcon, ArrowDownLeftFromCircle, LucideArrowUpCircle } from "lucide-react"
import { ConfirmDialog } from "@/components/Dialog"
import { Toast, useToast } from "@/components/Toast"
import { RefundModal } from "@/components/admin/refunds"

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
  orderSource?: "ONLINE" | "MANUAL"
  customerName?: string  // Usato per memorizzare metodo di pagamento per ordini POS
  stripePaymentId?: string
  stripePaymentIntentId?: string
  items: OrderItem[]
  giftCards: GiftCard[]
  hasRefund?: boolean
  refundCount?: number
  refundedTotal?: number
  refunds?: Array<{
    id: string
    refundNumber: string
    totalRefunded: number
    refundedAt: string
  }>
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
  CANCELLED: <X className="w-3 h-3" />,
}

export default function AdminOrdersPage() {
  const [orders, setOrders] = useState<Order[]>([])
  const [filteredOrders, setFilteredOrders] = useState<Order[]>([])
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState<"active" | "archived" | "cancelled">("active")
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const [searchQuery, setSearchQuery] = useState("")
  
  const { toast, showToast, hideToast } = useToast()

  const fetchOrders = useCallback(async () => {
    try {
      // Chiamata senza filtri per ottenere tutti gli ordini (come Gift Cards)
      const res = await fetch("/api/admin/orders")
      const data = await res.json()
      // Ensure data is an array
      setOrders(Array.isArray(data) ? data : [])
    } catch (error) {
      console.error("Error fetching orders:", error)
      setOrders([])
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchOrders()
    
    // Check if user is super admin
    const checkAdmin = async () => {
      try {
        const res = await fetch("/api/admin/admins")
        if (res.ok) {
          const admins = await res.json()
          const sessionRes = await fetch("/api/auth/session")
          const session = await sessionRes.json()
          const currentAdmin = admins.find((a: { email: string }) => a.email === session?.user?.email)
          setIsSuperAdmin(currentAdmin?.canManageAdmins || false)
        }
      } catch (err) {
        console.error("Error checking admin:", err)
      }
    }
    checkAdmin()
  }, [fetchOrders])

  // Ricarica quando la pagina prende focus (utente torna sulla tab)
  useEffect(() => {
    const handleFocus = () => {
      fetchOrders()
    }
    window.addEventListener('focus', handleFocus)
    return () => window.removeEventListener('focus', handleFocus)
  }, [fetchOrders])

  // Filtra ordini per tab (active/archived/cancelled) e ricerca
  useEffect(() => {
    // Se c'è una ricerca, verifica se c'è un match esatto 1:1 in un'altra tab
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase()
      const matchingOrders = orders.filter(order => 
        order.orderNumber?.toLowerCase().includes(query) ||
        order.email?.toLowerCase().includes(query) ||
        (order.phone && order.phone.toLowerCase().includes(query))
      )
      
      // Se c'è esattamente 1 match, switcha alla tab corretta
      if (matchingOrders.length === 1) {
        const matchedOrder = matchingOrders[0]
        if (matchedOrder.status === "CANCELLED" && filter !== "cancelled") {
          setFilter("cancelled")
          return
        } else if (matchedOrder.status !== "CANCELLED") {
          const targetFilter = matchedOrder.isArchived ? "archived" : "active"
          if (filter !== targetFilter) {
            setFilter(targetFilter)
            return
          }
        }
      }
    }
    
    let filtered = orders
    
    // Filtro per tab
    if (filter === "cancelled") {
      // Tab Annullati: solo ordini con status CANCELLED
      filtered = filtered.filter(order => order.status === "CANCELLED")
    } else {
      // Tab Attivi e Archiviati: escludi ordini CANCELLED
      filtered = filtered.filter(order => order.status !== "CANCELLED")
      
      // Filtro per tab active/archived
      filtered = filtered.filter(order => 
        filter === "active" ? !order.isArchived : order.isArchived
      )
    }
    
    // Filtro per ricerca
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase()
      filtered = filtered.filter(order => 
        order.orderNumber?.toLowerCase().includes(query) ||
        order.email?.toLowerCase().includes(query) ||
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

  const handleArchive = (orderId: string) => {
    openActionDialog(orderId, 'archive')
  }

  const handleRestore = (orderId: string) => {
    openActionDialog(orderId, 'restore')
  }

  const confirmAction = async () => {
    if (!actionDialog.orderId || !actionDialog.action) return

    if (actionDialog.action === 'resetStatus') {
      await handleUpdateStatus(actionDialog.orderId, "COMPLETED")
      closeActionDialog()
      return
    }

    const isArchived = actionDialog.action === 'archive'
    const res = await fetch("/api/admin/orders", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id: actionDialog.orderId, isArchived }),
    })

    if (res.ok) {
      fetchOrders()
    }
    closeActionDialog()
  }

  const [sendingEmailOrderId, setSendingEmailOrderId] = useState<string | null>(null)
  const [confirmDialog, setConfirmDialog] = useState<{
    isOpen: boolean
    order: Order | null
  }>({ isOpen: false, order: null })
  
  // Refund modal state
  const [isSuperAdmin, setIsSuperAdmin] = useState(false)
  const [refundModalOpen, setRefundModalOpen] = useState(false)
  const [selectedOrderForRefund, setSelectedOrderForRefund] = useState<Order | null>(null)

  const [actionDialog, setActionDialog] = useState<{
    isOpen: boolean
    orderId: string | null
    action: 'archive' | 'restore' | 'resetStatus' | null
  }>({ isOpen: false, orderId: null, action: null })

  const openResendDialog = (order: Order) => {
    setConfirmDialog({ isOpen: true, order })
  }

  const closeResendDialog = () => {
    setConfirmDialog({ isOpen: false, order: null })
  }

  const openActionDialog = (orderId: string, action: 'archive' | 'restore' | 'resetStatus') => {
    setActionDialog({ isOpen: true, orderId, action })
  }

  const closeActionDialog = () => {
    setActionDialog({ isOpen: false, orderId: null, action: null })
  }

  const handleOpenRefund = (order: Order) => {
    setSelectedOrderForRefund(order)
    setRefundModalOpen(true)
  }
  
  const handleRefundComplete = () => {
    fetchOrders()
    setRefundModalOpen(false)
    setSelectedOrderForRefund(null)
    showToast("Rimborso completato con successo!", "success")
  }

  const handleResendOrderEmail = async () => {
    const order = confirmDialog.order
    if (!order) return

    closeResendDialog()
    setSendingEmailOrderId(order.id)

    try {
      const response = await fetch('/api/admin/orders/resend', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ orderId: order.id })
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Errore durante l\'invio')
      }

      const successMessage = data.attachments > 0
        ? `Email inviata con successo! (${data.attachments} PDF allegati)`
        : 'Email inviata con successo!'
      
      showToast(successMessage, "success")
    } catch (err) {
      console.error('Error resending email:', err)
      showToast("Errore durante l'invio dell'email. Riprova.", "error")
    } finally {
      setSendingEmailOrderId(null)
    }
  }

  // Conta ordini per tab (escludi CANCELLED)
  const activeCount = orders.filter(o => !o.isArchived && o.status !== "CANCELLED").length
  const archivedCount = orders.filter(o => o.isArchived && o.status !== "CANCELLED").length
  const cancelledCount = orders.filter(o => o.status === "CANCELLED").length

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
        </div>
      </header>

      <div className="p-4">
        {/* Search & Refresh */}
        <div className="rounded-2xl mb-4">
          <div className="flex flex-col sm:flex-row gap-2">
            <div className="relative flex-1">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-brand-gray" />
              <input
                type="text"
                placeholder="Cerca per numero ordine, email o telefono..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="input-field pl-12 pr-10 w-full"
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
            <div className="flex gap-2">
              <button
                onClick={() => fetchOrders()}
                className="flex-1 sm:flex-none flex items-center justify-center gap-2 px-4 py-3 bg-white border border-brand-light-gray rounded-xl text-brand-primary hover:bg-brand-primary/5 transition-colors"
                title="Aggiorna"
              >
                <RotateCcw className="w-5 h-5" />
                <span className="sm:hidden text-body-sm">Aggiorna</span>
              </button>
            </div>
          </div>
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
          <button
            onClick={() => setFilter("cancelled")}
            className={`flex-1 py-2 px-4 rounded-full text-title-sm font-medium transition-all ${
              filter === "cancelled"
                ? "bg-red-600 text-white"
                : "bg-white text-brand-gray border border-brand-light-gray"
            }`}
          >
            Annullati ({cancelledCount})
          </button>
        </div>

        {/* Orders List */}
        <div className="space-y-4">
          {filteredOrders.map((order) => (
            <div key={order.id} className="bg-white rounded-2xl shadow-card p-4">
              {/* Header: Numero Ordine + Info */}
              <div className="flex items-center justify-between mb-3">
                <div className="flex flex-col gap-2">
                  <h3 className="font-mono text-title-md font-bold text-brand-dark">
                    #{order.orderNumber}
                  </h3>
                  {/* Badges con label */}
                  <div className="flex flex-col sm:flex-row sm:flex-wrap sm:items-center gap-2 sm:gap-3">
                    {/* Tipo */}
                    <div className="flex items-center gap-1">
                      <span className="text-label-sm text-brand-gray">Tipo:</span>
                      {order.orderSource === "MANUAL" ? (
                        <span className="px-2 py-1 rounded-full text-label-sm bg-purple-100 text-purple-700 flex items-center gap-1">
                          <Store className="w-3 h-3" />
                          In negozio
                        </span>
                      ) : (
                        <span className="px-2 py-1 rounded-full text-label-sm bg-blue-100 text-blue-700 flex items-center gap-1">
                          <Globe className="w-3 h-3" />
                          Online
                        </span>
                      )}
                    </div>
                    {/* Stato */}
                    <div className="flex items-center gap-1">
                      <span className="text-label-sm text-brand-gray">Stato:</span>
                      <span
                        className={`px-2 py-1 rounded-full text-label-sm flex items-center gap-1 ${
                          statusColors[order.status]
                        }`}
                      >
                        {statusIcons[order.status]}
                        {statusLabels[order.status]}
                      </span>
                    </div>
                    {/* Rimborso */}
                    {order.hasRefund && (
                      <div className="flex items-center gap-1">
                        <span className="text-label-sm text-brand-gray">Rimborso:</span>
                        <span className={`px-2 py-1 rounded-full text-label-sm flex items-center gap-1 ${
                          order.refundedTotal && order.refundedTotal >= order.total
                            ? "bg-red-100 text-red-700"
                            : "bg-orange-100 text-orange-700"
                        }`}>
                          <RotateCcw className="w-3 h-3" />
                          {order.refundedTotal && order.refundedTotal >= order.total
                            ? "Totale"
                            : "Parziale"
                          }
                        </span>
                      </div>
                    )}
                  </div>
                </div>
                <span className="text-headline-sm font-bold text-brand-primary">
                  {order.total.toFixed(2)}€
                </span>
              </div>

              {/* Warning: Missing Stripe Payment ID (solo per ordini online) */}
              {order.orderSource !== "MANUAL" && ["PENDING", "COMPLETED", "DELIVERED"].includes(order.status) && !order.stripePaymentIntentId && (
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

              {/* Info pagamento per ordini MANUAL */}
              {order.orderSource === "MANUAL" && order.customerName && (
                <div className="bg-purple-50 border border-purple-200 rounded-xl p-3 mb-3">
                  <p className="text-body-sm text-purple-700">
                    <span className="font-medium">{order.customerName}</span>
                  </p>
                </div>
              )}

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
                          {item.quantity} x {item.product?.name || 'Prodotto eliminato'} {item.size && `(${item.size})`}
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

              {/* Actions - Divise in sezioni */}
              <div className="space-y-3">
                {/* Sezione 1: Gestione Ordine */}
                {(filter === "active" && order.status !== "PENDING_PAYMENT") || (filter === "archived" && order.status !== "CANCELLED" && order.items.length > 0) ? (
                  <div>
                    <p className="text-label-sm text-brand-gray mb-2">Gestione ordine:</p>
                    <div className="flex flex-wrap gap-2">
                      {filter === "active" ? (
                        <>
                          {/* PENDING o COMPLETED: Segna Consegnato */}
                          {(order.status === "PENDING" || order.status === "COMPLETED") && (
                            <button
                              onClick={() => handleUpdateStatus(order.id, "DELIVERED")}
                              className="btn-primary py-2 text-label-md flex items-center gap-1.5"
                            >
                              <CheckCircle className="w-4 h-4" />
                              Segna "Consegnato"
                            </button>
                          )}
                          
                          {/* DELIVERED: Ripristina (solo se ha prodotti) e Archivia */}
                          {order.status === "DELIVERED" && (
                            <>
                              {order.items.length > 0 && (
                                <button
                                  onClick={() => openActionDialog(order.id, 'resetStatus')}
                                  className="px-3 py-2 bg-orange-500 text-white rounded-full text-label-md flex items-center gap-1.5 hover:bg-orange-600 transition-colors"
                                >
                                  <ArrowLeft className="w-4 h-4" />
                                  Segna "Da ritirare"
                                </button>
                              )}
                              <button
                                onClick={() => handleArchive(order.id)}
                                className="px-3 py-2 bg-gray-200 text-gray-700 rounded-full text-label-md flex items-center gap-1.5 hover:bg-gray-300 transition-colors"
                              >
                                <Archive className="w-4 h-4" />
                                Archivia
                              </button>
                            </>
                          )}
                        </>
                      ) : (
                        /* Archiviati: Ripristina */
                        order.status !== "CANCELLED" && order.items.length > 0 && (
                          <button
                            onClick={() => handleRestore(order.id)}
                            className="btn-primary py-2 text-label-md flex items-center gap-1.5"
                          >
                            <RotateCcw className="w-4 h-4" />
                            Ripristina
                          </button>
                        )
                      )}
                    </div>
                  </div>
                ) : null}
                
                {/* Sezione 2: Azioni - Non mostrare per ordini CANCELLED */}
                {order.status !== "PENDING_PAYMENT" && order.status !== "CANCELLED" && (
                  <div>
                    <p className="text-label-sm text-brand-gray mb-2">Azioni:</p>
                    <div className="flex flex-wrap gap-2">
                      {/* Reinvia email */}
                      <button
                        onClick={() => openResendDialog(order)}
                        disabled={sendingEmailOrderId === order.id}
                        className="px-3 py-2 bg-blue-500 text-white rounded-full text-label-md flex items-center gap-1.5 hover:bg-blue-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        {sendingEmailOrderId === order.id ? (
                          <>
                            <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                            Invio...
                          </>
                        ) : (
                          <>
                            <Mail className="w-4 h-4" />
                            Reinvia email
                          </>
                        )}
                      </button>
                      
                      {/* Rimborso - solo super admin */}
                      {isSuperAdmin && (
                        <button
                          onClick={() => handleOpenRefund(order)}
                          className="px-3 py-2 bg-red-500 text-white rounded-full text-label-md flex items-center gap-1.5 hover:bg-red-600 transition-colors"
                        >
                          <RotateCcwIcon className="w-4 h-4" />
                          Rimborso
                        </button>
                      )}
                    </div>
                  </div>
                )}
                
                {/* PENDING_PAYMENT: messaggio */}
                {order.status === "PENDING_PAYMENT" && (
                  <span className="text-label-sm text-brand-gray italic">
                    In attesa del pagamento...
                  </span>
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
                  : filter === "archived"
                    ? "Nessun ordine archiviato"
                    : "Nessun ordine annullato"}
            </p>
          )}
        </div>
      </div>

      {/* Dialog conferma reinvio email */}
      <ConfirmDialog
        isOpen={confirmDialog.isOpen}
        onClose={closeResendDialog}
        title="Reinvia Email"
        description={
          confirmDialog.order
            ? confirmDialog.order.giftCards?.length > 0
              ? `Vuoi reinviare l'email di conferma con ${confirmDialog.order.giftCards.length} PDF delle Gift Card a ${confirmDialog.order.email}?`
              : `Vuoi reinviare l'email di conferma ordine a ${confirmDialog.order.email}?`
            : ""
        }
        confirmLabel="Invia Email"
        cancelLabel="Annulla"
        onConfirm={handleResendOrderEmail}
      />

      {/* Refund Modal */}
      {selectedOrderForRefund && (
        <RefundModal
          isOpen={refundModalOpen}
          onClose={() => {
            setRefundModalOpen(false)
            setSelectedOrderForRefund(null)
          }}
          orderId={selectedOrderForRefund.id}
          orderNumber={selectedOrderForRefund.orderNumber}
          onRefundComplete={handleRefundComplete}
        />
      )}
      
      {/* Dialog conferma azioni (archivia/ripristina/elimina) */}
      {actionDialog.isOpen && (
        <div className="fixed inset-0 z-[70] flex items-center justify-center p-4 bg-black/50">
          <div className="bg-white rounded-3xl w-full max-w-sm p-6 shadow-2xl">
            <div className="text-center mb-6">
              <div className={`w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4 ${
                actionDialog.action === 'archive' ? 'bg-gray-100' : 'bg-orange-100'
              }`}>
                {actionDialog.action === 'archive' ? (
                  <Archive className="w-8 h-8 text-gray-600" />
                ) : actionDialog.action === 'restore' ? (
                  <RotateCcw className="w-8 h-8 text-green-600" />
                ) : (
                  <Clock className="w-8 h-8 text-orange-600" />
                )}
              </div>
              <h3 className="text-headline-sm font-bold text-brand-dark mb-2">
                {actionDialog.action === 'archive' ? 'Archivia Ordine' : 
                 actionDialog.action === 'restore' ? 'Ripristina Ordine' : 
                 'Ripristina a Da ritirare'}
              </h3>
              <p className="text-body-md text-brand-gray">
                {actionDialog.action === 'archive' 
                  ? "Sei sicuro di voler archiviare questo ordine? Potrai trovarlo nella sezione 'Archiviati'."
                  : actionDialog.action === 'restore'
                  ? "Sei sicuro di voler ripristinare questo ordine? Tornerà nella sezione 'Attivi'."
                  : "Sei sicuro di voler ripristinare questo ordine allo stato 'Da ritirare'?"}
              </p>
            </div>
            <div className="flex gap-3">
              <button
                onClick={closeActionDialog}
                className="flex-1 py-3 px-4 bg-brand-light-gray/50 text-brand-dark rounded-full font-medium hover:bg-brand-light-gray transition-colors"
              >
                Annulla
              </button>
              <button
                onClick={confirmAction}
                className={`flex-1 py-3 px-4 text-white rounded-full font-medium transition-colors ${
                  actionDialog.action === 'archive' 
                    ? 'bg-gray-600 hover:bg-gray-700' 
                    : actionDialog.action === 'restore'
                    ? 'bg-green-600 hover:bg-green-700'
                    : 'bg-orange-500 hover:bg-orange-600'
                }`}
              >
                {actionDialog.action === 'archive' ? 'Archivia' : 
                 actionDialog.action === 'restore' ? 'Ripristina' : 
                 'Conferma'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Toast notification */}
      <Toast
        isOpen={toast.isOpen}
        message={toast.message}
        type={toast.type}
        onClose={hideToast}
        duration={2000}
      />
    </main>
  )
}
