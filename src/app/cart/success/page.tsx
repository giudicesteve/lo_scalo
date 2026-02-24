"use client"

import { Suspense } from "react"
import { useEffect, useState } from "react"
import Link from "next/link"
import { useSearchParams } from "next/navigation"
import { Check, Gift, Mail } from "lucide-react"
import { Logo } from "@/components/Logo"
import { useLanguage } from "@/store/language"

interface Order {
  id: string
  orderNumber: string
  status: string
  email: string
  total: number
  createdAt: string
  items: Array<{
    id: string
    name: string
    quantity: number
    size?: string
    totalPrice: number
  }>
  giftCards: Array<{
    id: string
    code: string
    initialValue: number
    isActive: boolean
  }>
}

function CartSuccessContent() {
  const { t } = useLanguage()
  const searchParams = useSearchParams()
  const orderNumber = searchParams.get("order")
  const sessionId = searchParams.get("session")
  
  const [order, setOrder] = useState<Order | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [source, setSource] = useState<"database" | "stripe-verification" | null>(null)

  useEffect(() => {
    async function verifyOrder() {
      console.log(`🛒 [SUCCESS PAGE] Verifica ordine ${orderNumber}, sessionId: ${sessionId ? 'presente' : 'mancante'}`)
      
      if (!orderNumber) {
        console.log(`❌ [SUCCESS PAGE] Numero ordine mancante`)
        setError(t("cart.order-number-missing"))
        setLoading(false)
        return
      }

      try {
        // 1. Prima prova a recuperare l'ordine dal DB
        console.log(`🔍 [SUCCESS PAGE] Chiamo /api/orders/${orderNumber}`)
        const orderRes = await fetch(`/api/orders/${orderNumber}`)
        
        if (orderRes.ok) {
          const orderData = await orderRes.json()
          
          // Se l'ordine è già completato, mostra i dati
          console.log(`📊 [SUCCESS PAGE] Ordine trovato: status=${orderData.status}, emailSent=${orderData.emailSent}`)
          if (orderData.status !== "PENDING_PAYMENT") {
            console.log(`⏭️ [SUCCESS PAGE] Ordine già completato, SKIP verify-session`)
            setOrder(orderData)
            setSource("database")
            setLoading(false)
            
            // Pulisci backup
            localStorage.removeItem("pending-order")
            localStorage.removeItem("cart-backup")
            return
          }
        }

        // 2. Se l'ordine è ancora PENDING_PAYMENT e abbiamo il session ID,
        // verifica con Stripe (fallback al webhook)
        console.log(`📧 [SUCCESS PAGE] Ordine PENDING_PAYMENT, verifico con Stripe...`)
        if (sessionId) {
          console.log(`🚀 [SUCCESS PAGE] Chiamo /api/orders/verify-session`)
          const verifyRes = await fetch("/api/orders/verify-session", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ orderNumber, sessionId }),
          })

          if (verifyRes.ok) {
            const verifyData = await verifyRes.json()
            
            if (verifyData.success) {
              console.log(`✅ [SUCCESS PAGE] Verify-session OK, source=${verifyData.source}`)
              setOrder(verifyData.order)
              setSource(verifyData.source)
              setLoading(false)
              
              // Pulisci backup
              localStorage.removeItem("pending-order")
              localStorage.removeItem("cart-backup")
              return
            } else {
              // Pagamento non completato
              setError(verifyData.message || "Payment not completed")
              setLoading(false)
              return
            }
          }
        }

        // 3. Se arriviamo qui, qualcosa è andato storto
        console.log(`❌ [SUCCESS PAGE] Ordine non trovato o errore`)
        setError(t("cart.order-not-found"))
        setLoading(false)
        
      } catch (err) {
        console.error(`❌ [SUCCESS PAGE] Errore:`, err)
        setError(t("cart.order-not-found"))
        setLoading(false)
      }
    }

    verifyOrder()
  }, [orderNumber, sessionId, t])

  if (loading) {
    return (
      <main className="min-h-screen bg-brand-cream flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-brand-primary" />
      </main>
    )
  }

  if (error || !order) {
    return (
      <main className="min-h-screen bg-brand-cream flex flex-col items-center justify-center p-6">
        <div className="text-center max-w-md">
          <h1 className="text-headline-md font-bold text-brand-dark mb-4">
            {error || t("cart.order-not-found")}
          </h1>
          <Link href="/home" className="btn-primary inline-block">
            {t("cart.back-to-menu")}
          </Link>
        </div>
      </main>
    )
  }

  const hasGiftCards = order.giftCards.length > 0
  const hasProducts = order.items.length > 0

  return (
    <main className="min-h-screen bg-brand-cream">
      <header className="sticky top-0 z-40 bg-brand-cream/95 backdrop-blur-sm drop-shadow drop-shadow-[0_2px_2px_rgba(0,0,0,0.2)]">
        <div className="flex items-center justify-center px-4 py-3">
          <Logo variant="solo" className="h-8 w-auto" />
        </div>
      </header>

      <div className="p-4 pt-12 pb-24 max-w-md mx-auto">
        {/* Header success */}
        <div className="text-center mb-8">
          <div className="w-16 h-16 bg-green-500 rounded-full flex items-center justify-center mx-auto mb-6">
            <Check className="w-8 h-8 text-white" />
          </div>
          <h1 className="text-headline-md font-bold text-brand-dark mb-4">
            {t("cart.success")}
          </h1>
          <p className="text-body-md text-brand-gray mb-2">
            {t("cart.order-number")} <span className="font-bold">#{order.orderNumber}</span>
          </p>
          {source === "stripe-verification" && (
            <p className="text-label-sm text-brand-gray">
              {t("cart.verified-by-system")}
            </p>
          )}
        </div>

        {/* Recap ordine */}
        <div className="bg-white rounded-2xl shadow-card p-4 mb-6">
          <h2 className="text-title-md font-bold text-brand-dark mb-4">{t("cart.success-summary")}</h2>
          
          {/* Lista articoli */}
          <div className="space-y-3 mb-4">
            {order.items.map((item) => (
              <div key={item.id} className="flex justify-between items-start">
                <div className="flex-1">
                  <p className="text-body-sm text-brand-dark font-medium">
                    {item.name}
                    {item.size && <span className="text-brand-gray"> ({item.size})</span>}
                  </p>
                  <p className="text-label-sm text-brand-gray">{t("cart.success-qty")}: {item.quantity}</p>
                </div>
                <p className="text-body-sm font-bold text-brand-dark">
                  {item.totalPrice.toFixed(2)}€
                </p>
              </div>
            ))}
            {order.giftCards.map((gc) => (
              <div key={gc.id} className="flex justify-between items-start">
                <div className="flex-1">
                  <p className="text-body-sm text-brand-dark font-medium">{t("giftcard.title")}</p>
                  <p className="text-label-sm text-brand-gray">{gc.code}</p>
                </div>
                <p className="text-body-sm font-bold text-brand-dark">
                  {gc.initialValue.toFixed(2)}€
                </p>
              </div>
            ))}
          </div>

          {/* Divider */}
          <div className="border-t border-brand-light-gray my-4" />

          {/* Totale */}
          <div className="flex justify-between items-center">
            <span className="text-title-md font-bold text-brand-dark">{t("cart.total")}</span>
            <span className="text-headline-sm font-bold text-brand-primary">
              {order.total.toFixed(2)}€
            </span>
          </div>

          {/* Email di conferma */}
          <div className="mt-4 pt-4 border-t border-brand-light-gray">
            <p className="text-label-sm text-brand-gray">
              {t("cart.success-sent-to")} <span className="text-brand-dark font-medium">{order.email}</span>
            </p>
          </div>
        </div>

        {/* Info Gift Card */}
        {hasGiftCards && (
          <div className="bg-brand-primary/10 rounded-2xl p-4 mb-6">
            <div className="flex items-start gap-3">
              <Gift className="w-5 h-5 text-brand-primary flex-shrink-0 mt-0.5" />
              <div>
                <p className="text-body-sm font-bold text-brand-dark mb-1">
                  {t("cart.success-giftcard-title")}
                </p>
                <p className="text-body-xs text-brand-gray">
                  {t("cart.success-giftcard-message")}
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Info prodotti */}
        {hasProducts && (
          <div className="bg-blue-50 rounded-2xl p-4 mb-6">
            <p className="text-body-sm text-brand-dark">
              <span className="font-bold">{t("cart.success-pickup-title")}:</span> {t("cart.success-pickup-message")}
            </p>
          </div>
        )}

        {/* Messaggio supporto */}
        <div className="bg-gray-50 rounded-2xl p-4 mb-8">
          <div className="flex items-start gap-3">
            <Mail className="w-5 h-5 text-brand-gray flex-shrink-0 mt-0.5" />
            <div>
              <p className="text-body-sm text-brand-dark mb-2">
                {t("cart.success-no-email")}
              </p>
              <p className="text-body-xs text-brand-gray mb-2">
                {t("cart.success-check-spam")}
              </p>
              <p className="text-body-xs text-brand-gray">
                {t("cart.success-contact")}{" "}
                <a 
                  href={`mailto:support@loscalo.it?subject=${encodeURIComponent(`${t("cart.support-subject")} ${order.orderNumber}`)}`}
                  className="text-brand-primary hover:underline font-medium"
                >
                  support@loscalo.it
                </a>{" "}
                {t("cart.success-contact-subject")}
              </p>
            </div>
          </div>
        </div>

        <Link href="/home" className="btn-primary inline-block w-full text-center">
          {t("cart.close")}
        </Link>
      </div>
    </main>
  )
}

// Loading fallback
function LoadingState() {
  return (
    <main className="min-h-screen bg-brand-cream flex items-center justify-center">
      <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-brand-primary" />
    </main>
  )
}

// Page wrapper with Suspense
export default function CartSuccessPage() {
  return (
    <Suspense fallback={<LoadingState />}>
      <CartSuccessContent />
    </Suspense>
  )
}
