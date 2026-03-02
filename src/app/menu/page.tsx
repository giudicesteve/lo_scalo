"use client"

import { useEffect, useState, useRef } from "react"
import Link from "next/link"
import { Logo } from "@/components/Logo"
import { useLanguage } from "@/store/language"
import { ArrowLeft, Instagram } from "lucide-react"
import { MapIcon } from "@/components/MapIcon"
import { AlcoholIndicator } from "@/components/AlcoholIndicator"

interface Cocktail {
  id: string
  nameIt: string
  nameEn: string
  ingredientsIt?: string | null
  ingredientsEn?: string | null
  descriptionIt?: string | null
  descriptionEn?: string | null
  price: number
  alcoholLevel?: number | null
}

interface Category {
  id: string
  nameIt: string
  nameEn: string
  macroCategoryIt: string | null
  macroCategoryEn: string | null
  showAlcoholLevel: boolean
  cocktails: Cocktail[]
}

interface SiteConfig {
  menuEnabled: boolean
  menuClosedMessageIt: string
  menuClosedMessageEn: string
}

export default function MenuPage() {
  const { lang, t } = useLanguage()
  const [categories, setCategories] = useState<Category[]>([])
  const [activeCategory, setActiveCategory] = useState<string>("")
  const [siteConfig, setSiteConfig] = useState<SiteConfig>({
    menuEnabled: true,
    menuClosedMessageIt: "Il locale è chiuso per la stagione. Seguici sui social per scoprire quando riapriremo!",
    menuClosedMessageEn: "We are closed for the season. Follow us on social media to find out when we will reopen!",
  })
  const [loading, setLoading] = useState(true)
  const buttonRefs = useRef<(HTMLButtonElement | null)[]>([])

  useEffect(() => {
    if (typeof window !== 'undefined') {
      fetchCategories()
      fetchSiteConfig()
      
      const handleVisibilityChange = () => {
        if (document.visibilityState === 'visible') {
          fetchCategories()
          fetchSiteConfig()
        }
      }
      
      document.addEventListener('visibilitychange', handleVisibilityChange)
      return () => document.removeEventListener('visibilitychange', handleVisibilityChange)
    }
  }, [])

  const fetchCategories = async () => {
    let hasCache = false
    
    try {
      const cached = localStorage.getItem('menu-categories')
      const cachedActive = localStorage.getItem('menu-active-category')
      if (cached) {
        try {
          const parsed = JSON.parse(cached)
          // Only use cache if it's a valid array
          if (Array.isArray(parsed)) {
            hasCache = true
            setCategories(parsed)
            if (cachedActive) {
              setActiveCategory(cachedActive)
            } else if (parsed.length > 0) {
              setActiveCategory(parsed[0].id)
            }
            setLoading(false)
          }
        } catch {
          // Invalid cache, ignore
          localStorage.removeItem('menu-categories')
        }
      }

      const res = await fetch("/api/categories", { cache: 'no-store' })
      const data = await res.json()
      
      // Handle error response from API
      if (!Array.isArray(data)) {
        console.error("Categories API returned non-array:", data)
        if (!hasCache) {
          setCategories([])
        }
        return
      }
      
      localStorage.setItem('menu-categories', JSON.stringify(data))
      
      setCategories(data)
      if (data.length > 0) {
        if (!hasCache) {
          setActiveCategory(data[0].id)
        }
        localStorage.setItem('menu-active-category', data[0].id)
      }
    } catch (error) {
      console.error("Error fetching categories:", error)
      if (!hasCache) {
        setCategories([])
      }
    } finally {
      setLoading(false)
    }
  }

  const fetchSiteConfig = async () => {
    try {
      const res = await fetch("/api/site-config?key=MENU_ENABLED", { cache: 'no-store' })
      const data = await res.json()
      
      setSiteConfig(prev => ({
        ...prev,
        menuEnabled: data.value === 'true'
      }))
    } catch (error) {
      console.error("Error fetching site config:", error)
    }
  }

  const activeCat = categories.find((c) => c.id === activeCategory)
  const [showPreviousMenu, setShowPreviousMenu] = useState(false)

  // Se il menu è spento e non si vuole vedere il menu precedente, mostra il messaggio di chiusura
  if (!siteConfig.menuEnabled && !showPreviousMenu) {
    return (
      <main className="min-h-screen bg-brand-cream flex flex-col">
        {/* Header */}
        <header className="bg-brand-cream drop-shadow-[0_2px_2px_rgba(0,0,0,0.2)]">
          <div className="flex items-center justify-between px-4 py-3">
            <Link href="/home" className="p-2 -ml-2">
              <ArrowLeft className="w-6 h-6 text-brand-dark" />
            </Link>
            <Link href="/home"><Logo variant="solo" className="h-8 w-auto text-brand-dark" /></Link>
            <a
              href="https://maps.google.com/?q=Lo+Scalo+Craft+Drinks+By+The+Lake+Cremia"
              target="_blank"
              rel="noopener noreferrer"
              className="p-2 -mr-2"
            >
              <MapIcon className="w-10 h-10" />
            </a>
          </div>
        </header>

        {/* Closed Message */}
        <div className="flex-1 flex flex-col items-center justify-center p-8">
          <div className="text-center max-w-md">
            <h2 className="text-headline-lg font-bold text-brand-dark mb-6">
              {t('menu.closed-title')}
            </h2>
            <p className="text-body-lg text-brand-gray mb-8">
              {t('menu.closed-subtitle')}
            </p>
            
            {/* Social Links */}
            <div className="flex justify-center gap-6 mb-8">
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

            {/* Button to view previous season menu */}
            <div className="flex justify-center flex-col items-center gap-4">
            <button 
              onClick={() => setShowPreviousMenu(true)}
              className="text-title-md font-medium flex items-center justify-start gap-4 px-6 py-4 rounded-full border-2 border-brand-dark text-brand-dark hover:bg-brand-dark hover:text-white transition-all duration-200 group"
            >
              {t('menu.view-previous')}
            </button>
            </div>
          </div>
          <div className="flex justify-center gap-6 p-8">
            <Link href="/home" className="btn-primary">
              {t("menu.back-to-menu")}
            </Link>
          </div>
        </div>
      </main>
    )
  }



  return (
    <main className="min-h-screen bg-brand-cream/95">
      {/* Header */}
      <header className="sticky top-0 z-50 bg-brand-cream/95 backdrop-blur-sm drop-shadow-[0_2px_2px_rgba(0,0,0,0.2)]">
        <div className="flex items-center justify-between px-4 py-3 bg-brand-cream">
          <Link href="/home" className="p-2 -ml-2">
            <ArrowLeft className="w-6 h-6 text-brand-dark" />
          </Link>
          <Link href="/home"><Logo variant="solo" className="h-8 w-auto text-brand-dark" /></Link>
          <a
            href="https://maps.google.com/?q=Lo+Scalo+Craft+Drinks+By+The+Lake+Cremia"
            target="_blank"
            rel="noopener noreferrer"
            className="p-2 -mr-2"
          >
            <MapIcon className="w-10 h-10" />
          </a>
        </div>

        {/* Category Tabs */}
        {categories.length > 0 && (
          <div 
            className="flex overflow-x-auto px-4 menu-tabs-scroll bg-brand-cream relative z-10"
            style={{ width: '100vw', maxWidth: '100%' }}
          >
            {categories.map((cat, index) => {
              const handleClick = () => {
                setActiveCategory(cat.id)
                localStorage.setItem('menu-active-category', cat.id)
                buttonRefs.current[index]?.scrollIntoView({ behavior: 'smooth', inline: 'center', block: 'nearest' })
              }
              
              return (
                <button
                  key={cat.id}
                  ref={(el) => { buttonRefs.current[index] = el }}
                  onClick={handleClick}
                  className={`flex-shrink-0 px-4 py-3 text-center transition-all relative ${
                    activeCategory === cat.id
                      ? "text-brand-dark"
                      : "text-brand-gray hover:text-brand-dark"
                  }`}
                >
                  <span className="block text-label-sm mb-0.5 min-h-[16px]">
                    {lang === "it" ? (cat.macroCategoryIt || "") : (cat.macroCategoryEn || "")}
                  </span>
                  <span className="block text-title-md font-medium">
                    {lang === "it" ? cat.nameIt : cat.nameEn}
                  </span>
                  {activeCategory === cat.id && (
                    <span className="absolute bottom-0 left-0 right-0 h-1 bg-brand-primary rounded-t-full" />
                  )}
                </button>
              )
            })}
          </div>
        )}
      </header>

      {/* Content */}
      <div className="p-4 max-w-7xl mx-auto">
        {loading ? (
          <div className="flex justify-center py-12">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-brand-primary" />
          </div>
        ) : activeCat ? (
          <div className="space-y-4">
            {activeCat.cocktails.map((cocktail) => (
              <div
                key={cocktail.id}
                className="bg-white rounded-2xl overflow-hidden drop-shadow-[0_2px_2px_rgba(0,0,0,0.2)]"
              >
                {/* Header - Nome drink con sfondo beige */}
                <div className="bg-[#EDE0DD] px-4 py-3">
                  <h3 className="text-[24px] font-medium text-brand-primary leading-[28px]">
                    {lang === "it" ? cocktail.nameIt : cocktail.nameEn}
                  </h3>
                </div>

                {/* Body - Layout a due colonne */}
                <div className="flex">
                  {/* Colonna sinistra - Ingredienti */}
                  <div className="bg-[#FBEEEB] flex-1 p-4">
                    <p className="text-[12px] font-normal text-brand-dark mb-2 leading-[16px] tracking-[0.4px]">
                      {t("menu.ingredients")}
                    </p>
                    <p className="text-[12px] font-normal text-brand-dark mb-4 leading-[16px] tracking-[0.4px]">
                      {lang === "it" 
                        ? (cocktail.ingredientsIt || "") 
                        : (cocktail.ingredientsEn || "")
                      }
                    </p>
                    
                    {activeCat?.showAlcoholLevel && cocktail.alcoholLevel !== undefined && cocktail.alcoholLevel !== null && (
                      <div className="flex items-center gap-2">
                        <span className="text-[12px] font-normal text-brand-dark leading-[16px] tracking-[0.4px]">
                          {t("menu.alcohol")}
                        </span>
                        <AlcoholIndicator level={cocktail.alcoholLevel} size="sm" />
                      </div>
                    )}
                  </div>

                  {/* Colonna destra - Prezzo */}
                  <div className="flex-shrink-0 bg-brand-primary w-20 flex items-center justify-center">
                    <span className="text-[22px] font-light text-white leading-[28px]">
                      {cocktail.price.toFixed(1)}€
                    </span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <p className="text-center text-brand-gray py-12">
            {t("common.loading")}
          </p>
        )}
      </div>
    </main>
  )
}
