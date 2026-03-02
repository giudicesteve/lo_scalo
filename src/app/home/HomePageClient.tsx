"use client"

import { useState, useEffect } from "react"
import Link from "next/link"
import Image from "next/image"
import { Logo } from "@/components/Logo"
import { useLanguage } from "@/store/language"
import { BookOpen, MapPin, Music } from "lucide-react"
import { FeatureGate } from "@/components/feature-flags"
import { FEATURE_FLAGS } from "@/components/feature-flags"

export default function HomePageClient() {
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

      <div className="absolute w-full h-64 items-center justify-center overflow-hidden z-[0] pointer-events-none">
        <div className="absolute inset-0 flex items-center justify-center pointer-events-none select-none z-[0] pointer-events-none">
          <span className="text-2xl md:text-5xl font-black uppercase tracking-widest text-red-600/65 -rotate-12 border-8 border-red-600/65 px-4 py-2 rounded-xl transform z-[0] pointer-events-none">
            SITO DI TEST/TEST SITE
          </span>
        </div>
      </div>

      <div className="flex flex-col items-center z-[1]">
        <Logo variant="vertical" className="w-64 h-auto mb-12" />        

        {/* Menu principale */}
        <nav className="flex flex-col items-center space-y-4 mb-12">
          <FeatureGate flag={FEATURE_FLAGS.MENU_ENABLED}>
            <Link
              href="/menu"
              className="flex items-center justify-start gap-4 w-64 px-6 py-4 rounded-full border-2 border-brand-dark text-brand-dark hover:bg-brand-dark hover:text-white transition-all duration-200 group"
            >
              <Image src="/resources/Menu.svg" alt="Menu" width={24} height={24} className="w-6 h-6 group-hover:invert" />
              <span className="text-title-md font-medium">{t("nav.menu")}</span>
            </Link>
          </FeatureGate>
          
          <FeatureGate flag={FEATURE_FLAGS.SHOP_ENABLED}>
            <Link
              href="/shop"
              className="flex items-center justify-start gap-4 w-64 px-6 py-4 rounded-full border-2 border-brand-dark text-brand-dark hover:bg-brand-dark hover:text-white transition-all duration-200 group"
            >
              <Image src="/resources/Shop.svg" alt="Shop" width={24} height={24} className="w-6 h-6 group-hover:invert" />
              <span className="text-title-md font-medium">{t("nav.shop")}</span>
            </Link>
          </FeatureGate>
          
          <FeatureGate flag={FEATURE_FLAGS.GIFT_CARDS_ENABLED}>
            <Link
              href="/gift-card"
              className="flex items-center justify-start gap-4 w-64 px-6 py-4 rounded-full border-2 border-brand-dark text-brand-dark hover:bg-brand-dark hover:text-white transition-all duration-200 group"
            >
              <Image src="/resources/Giftcard.svg" alt="Gift Card" width={24} height={24} className="w-6 h-6 group-hover:invert" />
              <span className="text-title-md font-medium">{t("nav.giftcard")}</span>
            </Link>
          </FeatureGate>

          <FeatureGate flag={FEATURE_FLAGS.STORY_ENABLED}>
            <Link
              href="/story"
              className="flex items-center justify-start gap-4 w-64 px-6 py-4 rounded-full border-2 border-brand-dark text-brand-dark hover:bg-brand-dark hover:text-white transition-all duration-200 group"
            >
              <BookOpen className="w-6 h-6 group-hover:text-white" strokeWidth={1.5} />
              <span className="text-title-md font-medium">{t("nav.story")}</span>
            </Link>
          </FeatureGate>

          <FeatureGate flag={FEATURE_FLAGS.PLAYLIST_ENABLED}>
            <Link
              href="/playlist"
              className="flex items-center justify-start gap-4 w-64 px-6 py-4 rounded-full border-2 border-brand-dark text-brand-dark hover:bg-brand-dark hover:text-white transition-all duration-200 group"
            >
              <Music className="w-6 h-6 group-hover:text-white" strokeWidth={1.5} />
              <span className="text-title-md font-medium">{t("nav.playlist")}</span>
            </Link>
          </FeatureGate>

          <FeatureGate flag={FEATURE_FLAGS.LOCATION_ENABLED}>
            <a
              href="https://maps.google.com/?q=Lo+Scalo+Craft+Drinks+By+The+Lake+Cremia"
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center justify-start gap-4 w-64 px-6 py-4 rounded-full border-2 border-brand-dark text-brand-dark hover:bg-brand-dark hover:text-white transition-all duration-200 group"
            >
              <MapPin className="w-6 h-6 group-hover:text-white" strokeWidth={1.5} />
              <span className="text-title-md font-medium">{t("nav.directions")}</span>
            </a>
          </FeatureGate>
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
