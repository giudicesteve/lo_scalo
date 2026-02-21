"use client"

import { Suspense } from "react"
import { useEffect, useState } from "react"
import Link from "next/link"
import { useSearchParams } from "next/navigation"
import { AlertCircle } from "lucide-react"
import { Logo } from "@/components/Logo"
import { useCart } from "@/store/cart"
import { useLanguage } from "@/store/language"

function CartCanceledContent() {
  const { t } = useLanguage()
  const searchParams = useSearchParams()
  const orderNumber = searchParams.get("order")
  const [isRestoring, setIsRestoring] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    async function handleCancel() {
      if (!orderNumber) {
        setError(t("cart.canceled-error"))
        setIsRestoring(false)
        return
      }

      try {
        // 1. Chiama API per annullare ordine (idempotente)
        await fetch("/api/orders/cancel", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ orderNumber })
        })

        // 2. Ripristina carrello da backup
        const cartBackup = localStorage.getItem('cart-backup')
        if (cartBackup) {
          const restoredItems = JSON.parse(cartBackup)
          const cartStore = useCart.getState()
          
          if (cartStore.setItems) {
            cartStore.setItems(restoredItems)
          } else {
            // Fallback: aggiungi item per item
            restoredItems.forEach((item: { id: string; type: string; name: string; price: number; quantity: number; size?: string; image?: string; maxStock?: number }) => {
              for (let i = 0; i < item.quantity; i++) {
                cartStore.addItem({
                  id: item.id,
                  type: item.type as 'product' | 'gift-card',
                  name: item.name,
                  price: item.price,
                  quantity: 1,
                  size: item.size,
                  image: item.image,
                  maxStock: item.maxStock
                })
              }
            })
          }
          
          localStorage.removeItem('cart-backup')
        }

        setIsRestoring(false)
      } catch {
        setError(t("cart.canceled-error"))
        setIsRestoring(false)
      }
    }

    handleCancel()
  }, [orderNumber, t])

  if (isRestoring) {
    return (
      <main className="min-h-screen bg-brand-cream flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-brand-primary" />
      </main>
    )
  }

  return (
    <main className="min-h-screen bg-brand-cream">
      <header className="sticky top-0 z-40 bg-brand-cream/95 backdrop-blur-sm drop-shadow drop-shadow-[0_2px_2px_rgba(0,0,0,0.2)]">
        <div className="flex items-center justify-center px-4 py-3">
          <Logo variant="solo" className="h-8 w-auto" />
        </div>
      </header>

      <div className="p-4 pt-12 pb-24 max-w-md mx-auto">
        <div className="text-center mb-8">
          <div className="w-16 h-16 bg-orange-100 rounded-full flex items-center justify-center mx-auto mb-6">
            <AlertCircle className="w-8 h-8 text-orange-500" />
          </div>
          <h1 className="text-headline-md font-bold text-brand-dark mb-4">
            {t("cart.canceled-title")}
          </h1>
          <p className="text-body-md text-brand-gray">
            {error || t("cart.canceled-message")}
          </p>
        </div>

        <div className="flex gap-3">
          <Link href="/cart" className="btn-primary flex-1 text-center">
            {t("cart.back-to-cart")}
          </Link>
          <Link href="/home" className="btn-secondary flex-1 text-center">
            {t("cart.back-to-menu")}
          </Link>
        </div>
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
export default function CartCanceledPage() {
  return (
    <Suspense fallback={<LoadingState />}>
      <CartCanceledContent />
    </Suspense>
  )
}
