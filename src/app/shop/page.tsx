"use client"

import Link from "next/link"
import { useRouter } from "next/navigation"
import { Logo } from "@/components/Logo"
import { useLanguage } from "@/store/language"
import { ArrowLeft } from "lucide-react"

export default function ShopIntroPage() {
  const { t } = useLanguage()
  const router = useRouter()

  const handleExplore = () => {
    // Usa replace invece di push così /shop viene sostituita nella history
    // e il back del browser torna direttamente a /home
    router.replace("/shop/products")
  }

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
          <p className="text-body-sm text-center text-brand-dark">
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
