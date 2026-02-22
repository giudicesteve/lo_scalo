"use client"

import { useState, useEffect } from "react"
import Link from "next/link"
import Image from "next/image"
import { Logo } from "@/components/Logo"
import { useLanguage } from "@/store/language"
import { BookOpen, MapPin, Music } from "lucide-react"

export default function HomePage() {
  const { t } = useLanguage()
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    setMounted(true)
  }, [])

  // Placeholder durante SSR per evitare hydration mismatch
  if (!mounted) {
    return (
      <main className="min-h-screen bg-brand-cream flex flex-col items-center justify-center p-6">
        <div className="flex flex-col items-center">
          <Logo variant="vertical" className="w-64 h-auto mb-12" />        
          <nav className="flex flex-col items-center space-y-4">
            {[1, 2, 3, 4, 5].map((i) => (
              <div key={i} className="w-64 px-6 py-4 rounded-full border-2 border-brand-light-gray">
                <div className="h-6 bg-brand-light-gray/50 rounded w-32"></div>
              </div>
            ))}
          </nav>
        </div>
      </main>
    )
  }

  return (
    <main className="min-h-screen bg-brand-cream flex flex-col items-center justify-center p-6">
      <div className="flex flex-col items-center">
        <Logo variant="vertical" className="w-64 h-auto mb-12" />        
        
        {/* Banner Test Site */}
        <div className="w-full max-w-md mb-6 px-4 py-3 bg-red-500 text-white text-center rounded-xl">
          <p className="text-label-md font-bold uppercase tracking-wide">
            🚧 SITO DI TEST / TEST SITE 🚧
          </p>
        </div>

        {/* Menu principale */}
        <nav className="flex flex-col items-center space-y-4 mb-12">
          <Link
            href="/menu"
            className="flex items-center justify-start gap-4 w-64 px-6 py-4 rounded-full border-2 border-brand-dark text-brand-dark hover:bg-brand-dark hover:text-white transition-all duration-200 group"
          >
            <Image src="/resources/Menu.svg" alt="Menu" width={24} height={24} className="w-6 h-6 group-hover:invert" />
            <span className="text-title-md font-medium">{t("nav.menu")}</span>
          </Link>
          
          <Link
            href="/shop"
            className="flex items-center justify-start gap-4 w-64 px-6 py-4 rounded-full border-2 border-brand-dark text-brand-dark hover:bg-brand-dark hover:text-white transition-all duration-200 group"
          >
            <Image src="/resources/Shop.svg" alt="Shop" width={24} height={24} className="w-6 h-6 group-hover:invert" />
            <span className="text-title-md font-medium">{t("nav.shop")}</span>
          </Link>
          
          <Link
            href="/gift-card"
            className="flex items-center justify-start gap-4 w-64 px-6 py-4 rounded-full border-2 border-brand-dark text-brand-dark hover:bg-brand-dark hover:text-white transition-all duration-200 group"
          >
            <Image src="/resources/Giftcard.svg" alt="Gift Card" width={24} height={24} className="w-6 h-6 group-hover:invert" />
            <span className="text-title-md font-medium">{t("nav.giftcard")}</span>
          </Link>

          <Link
            href="/story"
            className="flex items-center justify-start gap-4 w-64 px-6 py-4 rounded-full border-2 border-brand-dark text-brand-dark hover:bg-brand-dark hover:text-white transition-all duration-200 group"
          >
            <BookOpen className="w-6 h-6 group-hover:text-white" strokeWidth={1.5} />
            <span className="text-title-md font-medium">{t("nav.story")}</span>
          </Link>

          <Link
            href="/playlist"
            className="flex items-center justify-start gap-4 w-64 px-6 py-4 rounded-full border-2 border-brand-dark text-brand-dark hover:bg-brand-dark hover:text-white transition-all duration-200 group"
          >
            <Music className="w-6 h-6 group-hover:text-white" strokeWidth={1.5} />
            <span className="text-title-md font-medium">{t("nav.playlist")}</span>
          </Link>

          <a
            href="https://maps.google.com/?q=Lo+Scalo+Craft+Drinks+By+The+Lake+Cremia"
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center justify-start gap-4 w-64 px-6 py-4 rounded-full border-2 border-brand-dark text-brand-dark hover:bg-brand-dark hover:text-white transition-all duration-200 group"
          >
            <MapPin className="w-6 h-6 group-hover:text-white" strokeWidth={1.5} />
            <span className="text-title-md font-medium">{t("nav.directions")}</span>
          </a>
        </nav>
        
        {/* Link cambia lingua */}
        <Link
          href="/?change=true"
          className="text-body-md text-brand-gray hover:text-brand-dark transition-colors"
        >
          Cambia lingua / Change language
        </Link>
      </div>
    </main>
  )
}
