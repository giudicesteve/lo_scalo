"use client"

import { useEffect, useState } from "react"
import { X, FileText } from "lucide-react"

interface Policy {
  id: string
  type: string
  version: string
  content: string
  effectiveDate: string
}

interface PolicyModalProps {
  isOpen: boolean
  onClose: () => void
  type: "TERMS" | "PRIVACY" | null
  lang: "it" | "en"
}

export function PolicyModal({ isOpen, onClose, type, lang }: PolicyModalProps) {
  const [policy, setPolicy] = useState<Policy | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (isOpen && type) {
      fetchPolicy()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen, type, lang])

  const fetchPolicy = async () => {
    if (!type) return
    
    setLoading(true)
    setError(null)
    
    try {
      // Fetch with ISR-like caching (1 hour)
      const res = await fetch(`/api/policies?type=${type}&lang=${lang}`, {
        next: { revalidate: 3600 },
      })
      
      if (!res.ok) throw new Error("Failed to fetch")
      
      const data = await res.json()
      if (data.length > 0) {
        setPolicy(data[0])
      } else {
        setError(lang === "it" ? "Documento non disponibile" : "Document not available")
      }
    } catch {
      setError(lang === "it" ? "Errore nel caricamento" : "Error loading document")
    } finally {
      setLoading(false)
    }
  }

  if (!isOpen || !type) return null

  const title = type === "TERMS" 
    ? (lang === "it" ? "Termini e Condizioni" : "Terms and Conditions")
    : (lang === "it" ? "Privacy Policy" : "Privacy Policy")

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50">
      <div className="bg-white rounded-2xl w-full max-w-3xl max-h-[85vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-brand-light-gray">
          <div className="flex items-center gap-2">
            <FileText className="w-5 h-5 text-brand-primary" />
            <h2 className="text-headline-sm font-bold text-brand-dark">{title}</h2>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-brand-light-gray rounded-full transition-colors"
          >
            <X className="w-5 h-5 text-brand-gray" />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6">
          {loading ? (
            <div className="flex justify-center py-12">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-brand-primary" />
            </div>
          ) : error ? (
            <div className="text-center py-12">
              <p className="text-brand-gray">{error}</p>
              <button
                onClick={fetchPolicy}
                className="mt-4 text-brand-primary hover:underline"
              >
                {lang === "it" ? "Riprova" : "Retry"}
              </button>
            </div>
          ) : policy ? (
            <div className="prose prose-sm max-w-none">
              <div 
                className="text-body-sm text-brand-dark space-y-4"
                dangerouslySetInnerHTML={{ __html: policy.content }}
              />
              <div className="mt-8 pt-4 border-t border-brand-light-gray text-label-sm text-brand-gray">
                {lang === "it" ? "Versione" : "Version"}: {policy.version} | 
                {lang === "it" ? " In vigore dal" : " Effective from"}: {new Date(policy.effectiveDate).toLocaleDateString(lang === "it" ? "it-IT" : "en-US")}
              </div>
            </div>
          ) : null}
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-brand-light-gray">
          <button
            onClick={onClose}
            className="w-full btn-primary py-3"
          >
            {lang === "it" ? "Chiudi" : "Close"}
          </button>
        </div>
      </div>
    </div>
  )
}
