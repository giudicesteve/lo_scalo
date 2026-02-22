"use client"

import { useState, useEffect } from "react"
import Link from "next/link"
import { MapPin } from "lucide-react"
import { useLanguage } from "@/store/language"
import { Logo } from "@/components/Logo"

export default function StoryPage() {
  const { t } = useLanguage()
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    setMounted(true)
  }, [])

  // Placeholder durante SSR
  if (!mounted) {
    return (
      <main className="min-h-screen bg-brand-cream flex flex-col">
        <div className="flex-1 flex items-center justify-center p-6">
          <div className="animate-pulse max-w-2xl w-full">
            <div className="h-8 bg-brand-light-gray/50 rounded w-1/2 mb-8"></div>
            <div className="h-4 bg-brand-light-gray/50 rounded w-full mb-4"></div>
            <div className="h-4 bg-brand-light-gray/50 rounded w-full mb-4"></div>
            <div className="h-4 bg-brand-light-gray/50 rounded w-3/4"></div>
          </div>
        </div>
      </main>
    )
  }

  return (
    <main className="min-h-screen bg-brand-cream flex flex-col">
      {/* Header */}
      {}


      {/* Content */}
      <div className="flex-1 flex items-center justify-center p-6">
        <div className="max-w-2xl w-full text-center ">
                        <div className="flex flex-col items-center">
                <Logo variant="vertical" className="w-64 h-auto mb-12" />        
              </div>  
          <p className="text-body-xl text-brand-gray leading-relaxed mb-8">
            {t('home.story.content')}
          </p>
          <div className="flex justify-center flex-col items-center gap-4">
            <a
              href="https://maps.google.com/?q=Lo+Scalo+Craft+Drinks+By+The+Lake+Cremia"
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center justify-start gap-4 px-6 py-4 rounded-full border-2 border-brand-dark text-brand-dark hover:bg-brand-dark hover:text-white transition-all duration-200 group"
            >
              <MapPin className="w-6 h-6 group-hover:text-white" strokeWidth={1.5} />
              <span className="text-title-md font-medium">{t("nav.directions")}</span>
            </a>
            <Link
              href="/home"
              className="px-8 py-3 rounded-full border-2 border-brand-dark text-brand-dark hover:bg-brand-dark hover:text-white transition-all duration-200"
            >
              <span className="text-title-md font-medium">{t('common.back')}</span>
            </Link>
          </div>
        </div>
      </div>
    </main>
  )
}
