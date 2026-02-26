"use client"

import { useEffect, useState } from "react"
import Link from "next/link"
import { Logo } from "@/components/Logo"
import { useLanguage } from "@/store/language"
import { ArrowLeft, RefreshCw } from "lucide-react"

interface PolicyData {
  id: string
  content: string
  version: string
  effectiveDate: string
}

interface TermsClientProps {
  initialPolicy: PolicyData | null
  initialLang: string
}

export default function TermsClient({ initialPolicy, initialLang }: TermsClientProps) {
  const { lang, t } = useLanguage()
  const [policy, setPolicy] = useState<PolicyData | null>(initialPolicy)

  // Refetch if language changes from client side
  useEffect(() => {
    if (lang !== initialLang) {
      const fetchPolicy = async () => {
        try {
          const res = await fetch(`/api/policies?type=TERMS&lang=${lang}`)
          if (res.ok) {
            const data = await res.json()
            if (data.length > 0) {
              setPolicy(data[0])
            } else {
              setPolicy(null)
            }
          }
        } catch (error) {
          console.error("Error fetching policy:", error)
        }
      }
      fetchPolicy()
    }
  }, [lang, initialLang])

  const handleRefresh = () => {
    window.location.reload()
  }

  return (
    <main className="min-h-screen bg-brand-cream">
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

      <div className="p-4 pb-24 max-w-2xl mx-auto">
        {/* Header */}
        <div className="text-center mb-8">
          <h1 className="text-headline-md font-bold text-brand-dark mb-2">
            {lang === "it" ? "Termini e Condizioni" : "Terms & Conditions"}
          </h1>
          {policy && (
            <p className="text-label-sm text-brand-gray">
              {lang === "it" ? "Versione" : "Version"} {policy.version} - {lang === "it" ? "In vigore dal" : "Effective from"} {new Date(policy.effectiveDate).toLocaleDateString(lang === "it" ? "it-IT" : "en-US")}
            </p>
          )}
        </div>

        {/* Content */}
        {policy ? (
          <div 
            className="prose max-w-none bg-white rounded-2xl shadow-card p-6"
            dangerouslySetInnerHTML={{ __html: policy.content }}
          />
        ) : (
          <div className="bg-white rounded-2xl shadow-card p-8 text-center">
            <RefreshCw className="w-12 h-12 text-brand-gray mx-auto mb-4" />
            <p className="text-body-md text-brand-gray mb-2">
              {lang === "it" 
                ? "Contenuto non disponibile." 
                : "Content not available."}
            </p>
            <p className="text-body-sm text-brand-gray mb-4">
              {lang === "it" 
                ? "Aggiorna la pagina per caricare i contenuti." 
                : "Please refresh the page to load the content."}
            </p>
            <button
              onClick={handleRefresh}
              className="btn-primary inline-flex items-center gap-2"
            >
              <RefreshCw className="w-4 h-4" />
              {lang === "it" ? "Aggiorna pagina" : "Refresh page"}
            </button>
          </div>
        )}

        {/* Back button */}
        <div className="mt-8 text-center">
          <Link href="/home" className="btn-primary inline-block">
            {t("cart.back-to-menu")}
          </Link>
        </div>
      </div>
    </main>
  )
}
