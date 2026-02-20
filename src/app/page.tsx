"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { Logo } from "@/components/Logo"
import { useLanguage } from "@/store/language"

export default function RootPage() {
  const { setLang } = useLanguage()
  const router = useRouter()
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    // Check URL parameter client-side only
    if (typeof window !== 'undefined') {
      const params = new URLSearchParams(window.location.search)
      const changeParam = params.get("change")
      
      if (changeParam === "true") {
        setIsLoading(false)
        return
      }

      // Check saved language
      const savedLang = localStorage.getItem("lo-scalo-language")
      if (savedLang) {
        router.push("/home")
      } else {
        setIsLoading(false)
      }
    }
  }, [router])

  const handleSelectLanguage = (selectedLang: "it" | "en") => {
    setLang(selectedLang)
    router.push("/home")
  }

  if (isLoading) {
    return (
      <main className="min-h-screen bg-brand-cream flex flex-col items-center justify-center p-6">
        <Logo variant="vertical" className="w-64 h-auto mb-12" />
        <div className="animate-pulse">
          <div className="flex gap-4">
            <div className="px-8 py-3 rounded-full border-2 border-brand-light-gray w-32 h-12"></div>
            <div className="px-8 py-3 rounded-full border-2 border-brand-light-gray w-32 h-12"></div>
          </div>
        </div>
      </main>
    )
  }

  return (
    <main className="min-h-screen bg-brand-cream flex flex-col items-center justify-center p-6">
      <Logo variant="vertical" className="w-64 h-auto mb-12" />
      
      <div className="flex gap-4">
        <button
          onClick={() => handleSelectLanguage("it")}
          className="px-8 py-3 rounded-full border-2 border-brand-dark text-brand-dark hover:bg-brand-dark hover:text-white transition-all duration-200"
        >
          <span className="text-title-md font-medium">Italiano</span>
        </button>
        <button
          onClick={() => handleSelectLanguage("en")}
          className="px-8 py-3 rounded-full border-2 border-brand-dark text-brand-dark hover:bg-brand-dark hover:text-white transition-all duration-200"
        >
          <span className="text-title-md font-medium">English</span>
        </button>
      </div>
    </main>
  )
}
