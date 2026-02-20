"use client"

import { useEffect, useState } from "react"
import Link from "next/link"
import Image from "next/image"
import { Logo } from "@/components/Logo"
import { useLanguage } from "@/store/language"
import { useCart } from "@/store/cart"
import { ArrowLeft, Check } from "lucide-react"
import { CartIcon } from "@/components/CartIcon"

interface GiftCardTemplate {
  id: string
  value: number
  price: number
}

export default function GiftCardPage() {
  const { t } = useLanguage()
  const { addItem, items } = useCart()
  const [templates, setTemplates] = useState<GiftCardTemplate[]>([])
  const [loading, setLoading] = useState(true)
  const [showToast, setShowToast] = useState(false)
  const [toastMessage, setToastMessage] = useState("")

  const cartCount = items.reduce((sum, item) => sum + item.quantity, 0)

  useEffect(() => {
    fetchTemplates()
  }, [])

  const fetchTemplates = async () => {
    try {
      const res = await fetch("/api/gift-card-templates")
      const data = await res.json()
      setTemplates(data)
    } catch (error) {
      console.error("Error fetching gift card templates:", error)
    } finally {
      setLoading(false)
    }
  }

  const showAddedToast = (message: string) => {
    setToastMessage(message)
    setShowToast(true)
    setTimeout(() => setShowToast(false), 2500)
  }

  const handleAddToCart = (template: GiftCardTemplate) => {
    addItem({
      id: template.id,
      type: "gift-card",
      name: `Gift Card ${template.value.toFixed(0)}€`,
      price: template.price,
      quantity: 1,
    })
    showAddedToast(`Gift Card ${template.value.toFixed(0)}€ ${t('shop.added-to-cart')}`)
  }

  return (
    <main className="min-h-screen bg-brand-cream">
      {/* Header */}
      <header className="sticky top-0 z-40 bg-brand-cream/95 backdrop-blur-sm drop-shadow drop-shadow-[0_2px_2px_rgba(0,0,0,0.2)]">
        <div className="flex items-center justify-between px-4 py-3">
          <Link href="/home" className="p-2 -ml-2">
            <ArrowLeft className="w-6 h-6 text-brand-dark" />
          </Link>
          <Link href="/home"><Logo variant="solo" className="h-8 w-auto" /></Link>
          <Link href="/cart" className="p-2 -mr-2 relative">
            <CartIcon className="w-10 h-10" />
            {cartCount > 0 && (
              <span className="absolute -top-1 -right-1 drop-shadow drop-shadow-[0_1px_1px_rgba(0,0,0,0.6)] bg-brand-primary text-white text-label-sm w-5 h-5 rounded-full flex items-center justify-center">
                {cartCount}
              </span>
            )}
          </Link>
        </div>
      </header>

      {/* Toast Notification */}
      <div className={`fixed top-20 left-1/2 -translate-x-1/2 z-50 transition-all duration-300 ${showToast ? 'opacity-100 translate-y-0' : 'opacity-0 -translate-y-4 pointer-events-none'}`}>
        <div className="bg-brand-dark text-white px-6 py-3 rounded-full shadow-lg flex items-center gap-2">
          <Check className="w-5 h-5 text-green-400" />
          <span className="text-body-md font-medium">{toastMessage}</span>
        </div>
      </div>

      {/* Content */}
      <div className="p-4 pb-8">
        <div className="text-center mb-6">
          <h1 className="text-headline-lg font-bold text-brand-dark mb-2">
            {t("giftcard.title")}
          </h1>
          <p className="text-body-md text-brand-gray">
            {t("giftcard.subtitle")}
          </p>
        </div>

        <div className="bg-brand-primary/10 border border-brand-primary/20 rounded-xl p-4 mb-6">
          <p className="text-body-sm text-brand-dark">
            <span className="font-bold">{t("giftcard.attention")}:</span>{" "}
            {t("giftcard.email-delivery")}
          </p>
        </div>

        {loading ? (
          <div className="flex justify-center py-12">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-brand-primary" />
          </div>
        ) : (
          <div className="grid grid-cols-2 gap-3">
            {templates.map((template) => (
              <div
                key={template.id}
                className="bg-[#FBEEEB] rounded-2xl overflow-hidden drop-shadow drop-shadow-[0_2px_2px_rgba(0,0,0,0.2)] flex flex-col"
              >
                {/* Immagine Gift Card */}
                <div className="bg-white flex items-center justify-center px-8">
                  <Image 
                    src="/resources/Giftcard-card-white.svg" 
                    alt="Gift Card" 
                    width={120} 
                    height={90}
                    className="w-auto h-full object-contain"
                  />
                </div>
                
                {/* Prezzo centrato verticalmente */}
                <div className="flex-1 flex items-center justify-center py-2">
                  <p className="text-title-lg font-bold text-brand-dark">
                    {template.value.toFixed(0)}€
                  </p>
                </div>
                
                {/* Bottone */}
                <div className="p-3 pt-0">
                  <button
                    onClick={() => handleAddToCart(template)}
                    className="w-full btn-primary text-label-lg py-2 px-4 disabled:opacity-50 transition-all active:scale-95"
                  >
                    {t('giftcard.add-to-cart')}
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </main>
  )
}
