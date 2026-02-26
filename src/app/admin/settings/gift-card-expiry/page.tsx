"use client"

import { useEffect, useState } from "react"
import Link from "next/link"
import { ArrowLeft, Clock, Calendar, Save } from "lucide-react"
import { Toast, useToast } from "@/components/Toast"

type ExpiryType = "EXACT_DATE" | "END_OF_MONTH"
type ExpiryTime = "SIX_MONTHS" | "ONE_YEAR" | "TWO_YEARS"

interface GiftCardExpirySettings {
  expiryType: ExpiryType
  expiryTime: ExpiryTime
}

export default function GiftCardExpirySettingsPage() {
  const [expirySettings, setExpirySettings] = useState<GiftCardExpirySettings | null>(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const { toast, showToast, hideToast } = useToast()

  useEffect(() => {
    fetchExpirySettings()
  }, [])

  const fetchExpirySettings = async () => {
    try {
      const res = await fetch("/api/admin/settings/gift-card-expiry")
      if (res.ok) {
        const data = await res.json()
        setExpirySettings(data)
      }
    } catch (error) {
      console.error("Error fetching expiry settings:", error)
      showToast("Errore nel caricamento impostazioni", "error")
    } finally {
      setLoading(false)
    }
  }

  const handleSave = async () => {
    if (!expirySettings) return
    
    setSaving(true)
    try {
      const res = await fetch("/api/admin/settings/gift-card-expiry", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(expirySettings)
      })

      if (!res.ok) {
        const data = await res.json()
        throw new Error(data.error || "Errore durante il salvataggio")
      }

      showToast("Impostazioni salvate con successo", "success")
    } catch (err) {
      showToast(err instanceof Error ? err.message : "Errore", "error")
    } finally {
      setSaving(false)
    }
  }

  if (loading) {
    return (
      <main className="min-h-screen bg-brand-cream flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-brand-primary" />
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
            Scadenza Gift Card
          </h1>
        </div>
      </header>

      <div className="p-4 max-w-2xl mx-auto">
        <div className="bg-white rounded-2xl shadow-card p-6">
          <h2 className="text-title-lg font-bold text-brand-dark mb-4 flex items-center gap-2">
            <Clock className="w-5 h-5 text-brand-primary" />
            Impostazioni Scadenza Gift Card
          </h2>
          
          {expirySettings ? (
            <div className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Expiry Type */}
                <div>
                  <label className="block text-label-md text-brand-gray mb-2">
                    Tipo di scadenza
                  </label>
                  <select
                    value={expirySettings.expiryType}
                    onChange={(e) => setExpirySettings({ 
                      ...expirySettings, 
                      expiryType: e.target.value as ExpiryType 
                    })}
                    className="w-full px-4 py-3 rounded-xl border-2 border-brand-light-gray focus:border-brand-primary focus:outline-none"
                  >
                    <option value="EXACT_DATE">Data esatta</option>
                    <option value="END_OF_MONTH">Fine del mese</option>
                  </select>
                  <p className="text-label-sm text-brand-gray mt-1">
                    {expirySettings.expiryType === "EXACT_DATE" 
                      ? "Scade esattamente dopo il periodo selezionato"
                      : "Scade alla fine del mese dopo il periodo selezionato"}
                  </p>
                </div>

                {/* Expiry Time */}
                <div>
                  <label className="block text-label-md text-brand-gray mb-2">
                    Durata validità
                  </label>
                  <select
                    value={expirySettings.expiryTime}
                    onChange={(e) => setExpirySettings({ 
                      ...expirySettings, 
                      expiryTime: e.target.value as ExpiryTime 
                    })}
                    className="w-full px-4 py-3 rounded-xl border-2 border-brand-light-gray focus:border-brand-primary focus:outline-none"
                  >
                    <option value="SIX_MONTHS">6 mesi</option>
                    <option value="ONE_YEAR">1 anno</option>
                    <option value="TWO_YEARS">2 anni</option>
                  </select>
                </div>
              </div>

              {/* Preview */}
              <div className="bg-orange-50 border border-orange-200 rounded-xl p-4">
                <p className="text-body-sm text-orange-800 flex items-center gap-2">
                  <Calendar className="w-4 h-4" />
                  <strong>Esempio:</strong> Se acquistata oggi, una Gift Card scadrebbe il{" "}
                  {expirySettings.expiryType === "END_OF_MONTH" ? "31" : new Date().getDate()}{" "}
                  {new Date().toLocaleDateString("it-IT", { 
                    month: "long",
                    year: "numeric"
                  }).replace(/\d{4}/, () => {
                    const currentYear = new Date().getFullYear()
                    const offset = expirySettings.expiryTime === "SIX_MONTHS" ? 0 
                      : expirySettings.expiryTime === "ONE_YEAR" ? 1 
                      : 2
                    return (currentYear + offset).toString()
                  })}
                </p>
              </div>

              {/* Warning */}
              <div className="bg-yellow-50 border border-yellow-200 rounded-xl p-3">
                <p className="text-label-sm text-yellow-800">
                  <strong>Nota:</strong> Le modifiche si applicano solo alle nuove Gift Card. 
                  Quelle esistenti mantengono la scadenza originale.
                </p>
              </div>

              {/* Save Button */}
              <button
                onClick={handleSave}
                disabled={saving}
                className="btn-primary flex items-center gap-2 disabled:opacity-50"
              >
                <Save className="w-4 h-4" />
                {saving ? "Salvataggio..." : "Salva impostazioni"}
              </button>
            </div>
          ) : (
            <p className="text-brand-gray">Errore nel caricamento delle impostazioni</p>
          )}
        </div>
      </div>

      {/* Toast */}
      <Toast isOpen={toast.isOpen} message={toast.message} type={toast.type} onClose={hideToast} />
    </main>
  )
}
