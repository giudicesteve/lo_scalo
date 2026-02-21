"use client"

import { useEffect, useState } from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { Logo } from "@/components/Logo"
import { useLanguage } from "@/store/language"
import { ArrowLeft, Instagram } from "lucide-react"

export default function ShopIntroPage() {
  const { t } = useLanguage()
  const router = useRouter()
  const [shopEnabled, setShopEnabled] = useState(true)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetchShopStatus()
  }, [])

  const fetchShopStatus = async () => {
    try {
      const res = await fetch("/api/site-config?key=SHOP_ENABLED")
      const data = await res.json()
      setShopEnabled(data.value !== 'false') // Default true se non impostato
    } catch (error) {
      console.error("Error fetching shop status:", error)
      setShopEnabled(true) // Default aperto in caso di errore
    } finally {
      setLoading(false)
    }
  }

  const handleExplore = () => {
    router.replace("/shop/products")
  }

  if (loading) {
    return (
      <main className="min-h-screen bg-brand-cream flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-brand-primary" />
      </main>
    )
  }

  // Se lo shop è chiuso, mostra messaggio di chiusura stagionale
  if (!shopEnabled) {
    return (
      <main className="min-h-screen bg-brand-cream flex flex-col">
        {/* Header */}
        <header className="sticky top-0 z-40 bg-brand-cream/95 backdrop-blur-sm drop-shadow drop-shadow-[0_2px_2px_rgba(0,0,0,0.2)]">
          <div className="flex items-center justify-between px-4 py-3">
            <Link href="/home" className="p-2 -ml-2">
              <ArrowLeft className="w-6 h-6 text-brand-dark" />
            </Link>
            <Link href="/home">
              <Logo variant="solo" className="h-8 w-auto" />
            </Link>
            <div className="w-10" />
          </div>
        </header>

        <div className="flex-1 flex flex-col items-center justify-center p-6">
         
          <h2 className="text-headline-lg font-bold text-brand-dark mb-4 text-center">
            {t("shop.closed-title")}
          </h2>
          
          <p className="text-body-lg text-brand-gray text-center max-w-sm mb-8">
            {t("shop.closed-subtitle")}
          </p>
          {/* Social Links */}
          <div className="flex justify-center gap-6">
            <a
              href="https://www.instagram.com/lo_scalo_craftdrinksbythelake/"
              target="_blank"
              rel="noopener noreferrer"
              className="flex flex-col items-center gap-2 text-brand-gray hover:text-brand-primary transition-colors"
            >
              <Instagram className="w-8 h-8" />
              <span className="text-label-sm">Instagram</span>
            </a>
          </div>
          <div className="flex justify-center gap-6 p-8">
            <Link href="/home" className="btn-primary">
              {t("cart.back-to-menu")}
            </Link>
          </div>
        </div>
      </main>
    )
  }

  // Shop aperto - pagina normale
  return (
    <main className="min-h-screen bg-brand-cream flex flex-col">
      {/* Header */}
      <header className="sticky top-0 z-40 bg-brand-cream/95 backdrop-blur-sm drop-shadow drop-shadow-[0_2px_2px_rgba(0,0,0,0.2)]">
        <div className="flex items-center justify-between px-4 py-3">
          <Link href="/home" className="p-2 -ml-2">
            <ArrowLeft className="w-6 h-6 text-brand-dark" />
          </Link>
          <Link href="/home">
            <Logo variant="solo" className="h-8 w-auto" />
          </Link>
          <div className="w-10" /> {/* Spacer for alignment */}
        </div>
      </header>

      <div className="flex-1 flex flex-col items-center justify-center p-6">
        <h2 className="text-headline-sm font-bold text-brand-dark mb-4">
          {t("shop.title")}
        </h2>
        <p className="text-body-md text-brand-gray text-center max-w-sm mb-8">
          {t("shop.subtitle")}
        </p>

        <div className="bg-brand-primary/10 border border-brand-primary/20 rounded-xl p-4 mb-6 w-full max-w-sm mb-8">
          <h3 className="text-title-md text-center font-bold text-brand-primary mb-3">
            {t("shop.warning")}
          </h3>
          <p className="text-body-md text-center text-brand-dark">
            {t("shop.no-shipping")}
          </p>
        </div>

        <button
          onClick={handleExplore}
          className="btn-primary w-full max-w-sm text-center"
        >
          {t("shop.explore")}
        </button>
      </div>
    </main>
  )
}
