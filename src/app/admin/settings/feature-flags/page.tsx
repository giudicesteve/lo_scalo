"use client"

import { useCallback, useEffect, useState } from "react"
import Link from "next/link"
import { ArrowLeft, Shield, ToggleLeft, Loader2 } from "lucide-react"
import { Toast, useToast } from "@/components/Toast"

interface FeatureFlag {
  id: string
  key: string
  name: string
  description: string | null
  enabled: boolean
  updatedAt: string
  updatedBy: string | null
}

// Ordine di visualizzazione dei flag
const FLAG_ORDER = [
  "FRONTEND_ENABLED",
  "SHOP_ENABLED",
  "GIFT_CARDS_ENABLED",
  "GIFT_CARDS_POS_ENABLED",
  "PRINTED_GIFT_CARDS",
  "MENU_ENABLED",
  "STORY_ENABLED",
  "PLAYLIST_ENABLED",
  "LOCATION_ENABLED",
]

function formatTimeAgo(dateString: string): string {
  const date = new Date(dateString)
  const now = new Date()
  const diffInSeconds = Math.floor((now.getTime() - date.getTime()) / 1000)

  if (diffInSeconds < 60) {
    return "pochi secondi fa"
  } else if (diffInSeconds < 3600) {
    const minutes = Math.floor(diffInSeconds / 60)
    return `${minutes} minut${minutes === 1 ? "o" : "i"} fa`
  } else if (diffInSeconds < 86400) {
    const hours = Math.floor(diffInSeconds / 3600)
    return `${hours} or${hours === 1 ? "a" : "e"} fa`
  } else {
    const days = Math.floor(diffInSeconds / 86400)
    return `${days} giorn${days === 1 ? "o" : "i"} fa`
  }
}

export default function FeatureFlagsPage() {
  const [flags, setFlags] = useState<FeatureFlag[]>([])
  const [loading, setLoading] = useState(true)
  const [unauthorized, setUnauthorized] = useState(false)
  const [updating, setUpdating] = useState<string | null>(null)
  const { toast, showToast, hideToast } = useToast()

  const fetchFlags = useCallback(async () => {
    try {
      const res = await fetch("/api/feature-flags")
      if (res.status === 403) {
        setUnauthorized(true)
        return
      }
      if (!res.ok) throw new Error("Failed to fetch")
      const data = await res.json()
      setFlags(data.flags || [])
    } catch {
      showToast("Errore nel caricamento dei feature flags", "error")
    } finally {
      setLoading(false)
    }
  }, [showToast])

  useEffect(() => {
    fetchFlags()
  }, [fetchFlags])

  const handleToggle = async (flag: FeatureFlag) => {
    setUpdating(flag.key)

    // Optimistic update
    setFlags((prev) =>
      prev.map((f) =>
        f.key === flag.key ? { ...f, enabled: !f.enabled } : f
      )
    )

    try {
      const res = await fetch("/api/admin/feature-flags", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          key: flag.key,
          enabled: !flag.enabled,
        }),
      })

      if (res.status === 403) {
        setUnauthorized(true)
        // Revert optimistic update
        setFlags((prev) =>
          prev.map((f) =>
            f.key === flag.key ? { ...f, enabled: flag.enabled } : f
          )
        )
        return
      }

      if (!res.ok) {
        const data = await res.json()
        throw new Error(data.error || "Errore durante l'aggiornamento")
      }

      const updatedFlag = await res.json()
      setFlags((prev) =>
        prev.map((f) => (f.key === updatedFlag.key ? updatedFlag : f))
      )
      showToast(
        `${flag.name} ${
          updatedFlag.enabled ? "abilitato" : "disabilitato"
        }`,
        "success"
      )
    } catch (err) {
      // Revert optimistic update
      setFlags((prev) =>
        prev.map((f) =>
          f.key === flag.key ? { ...f, enabled: flag.enabled } : f
        )
      )
      showToast(
        err instanceof Error ? err.message : "Errore nell'aggiornamento",
        "error"
      )
    } finally {
      setUpdating(null)
    }
  }

  if (loading) {
    return (
      <main className="min-h-screen bg-brand-cream flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-brand-primary" />
      </main>
    )
  }

  if (unauthorized) {
    return (
      <main className="min-h-screen bg-brand-cream flex flex-col items-center justify-center p-6">
        <div className="text-center">
          <Shield className="w-16 h-16 text-brand-gray mx-auto mb-4" />
          <h1 className="text-headline-lg font-bold text-brand-dark mb-2">
            Accesso Negato
          </h1>
          <p className="text-body-lg text-brand-gray mb-6">
            Solo gli utenti con il permesso &quot;Gestione Admin&quot; possono
            modificare i feature flags.
          </p>
          <Link
            href="/admin/settings"
            className="px-6 py-3 rounded-full border-2 border-brand-dark text-brand-dark hover:bg-brand-dark hover:text-white transition-colors"
          >
            Torna alle Impostazioni
          </Link>
        </div>
      </main>
    )
  }

  return (
    <main className="min-h-screen bg-brand-cream">
      {/* Header */}
      <header className="bg-white border-b border-brand-light-gray">
        <div className="flex items-center px-4 py-3 relative">
          <Link href="/admin/settings" className="p-2 -ml-2">
            <ArrowLeft className="w-6 h-6 text-brand-dark" />
          </Link>
          <h1 className="text-headline-sm font-bold text-brand-dark absolute left-1/2 -translate-x-1/2">
            Feature Flags
          </h1>
        </div>
      </header>

      <div className="p-4 max-w-2xl mx-auto">

        {/* Feature Flags List */}
        <div className="space-y-4">
          {[...flags]
            .sort((a, b) => FLAG_ORDER.indexOf(a.key) - FLAG_ORDER.indexOf(b.key))
            .map((flag) => {
            return (
              <div
                key={flag.key}
                className="bg-white rounded-2xl p-5 shadow-card"
              >
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-3 mb-1">
                      <h2 className="text-title-md font-bold text-brand-dark">
                        {flag.name}
                      </h2>
                      <span
                        className={`px-2 py-0.5 text-label-sm rounded-full ${
                          flag.enabled
                            ? "bg-green-100 text-green-700"
                            : "bg-gray-100 text-gray-600"
                        }`}
                      >
                        {flag.enabled ? "Attivo" : "Disattivato"}
                      </span>
                    </div>
                    <p className="text-body-sm text-brand-gray mb-3">
                      {flag.description || ""}
                    </p>
                    {flag.updatedBy && (
                      <p className="text-label-sm text-brand-gray/70">
                        Modificato da: {flag.updatedBy}{" "}
                        {formatTimeAgo(flag.updatedAt)}
                      </p>
                    )}
                  </div>

                  {/* Toggle Switch */}
                  <button
                    onClick={() => handleToggle(flag)}
                    disabled={updating === flag.key}
                    className={`relative inline-flex h-7 w-12 items-center rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-brand-primary focus:ring-offset-2 disabled:opacity-50 ${
                      flag.enabled
                        ? "bg-brand-primary"
                        : "bg-brand-light-gray"
                    }`}
                    role="switch"
                    aria-checked={flag.enabled ? "true" : "false"}
                  >
                    {updating === flag.key ? (
                      <Loader2 className="w-4 h-4 text-brand-gray animate-spin mx-auto" />
                    ) : (
                      <span
                        className={`inline-block h-5 w-5 transform rounded-full bg-white shadow transition-transform ${
                          flag.enabled ? "translate-x-6" : "translate-x-1"
                        }`}
                      />
                    )}
                  </button>
                </div>
              </div>
            )
          })}
        </div>

        {/* Empty State */}
        {flags.length === 0 && !loading && (
          <div className="text-center py-12">
            <ToggleLeft className="w-12 h-12 text-brand-gray mx-auto mb-4" />
            <p className="text-body-lg text-brand-gray">
              Nessun feature flag configurato
            </p>
          </div>
        )}
      </div>

      {/* Toast */}
      <Toast
        isOpen={toast.isOpen}
        message={toast.message}
        type={toast.type}
        onClose={hideToast}
      />
    </main>
  )
}
