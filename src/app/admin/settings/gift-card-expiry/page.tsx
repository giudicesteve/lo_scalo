"use client"

import { useEffect, useState, useCallback } from "react"
import Link from "next/link"
import { ArrowLeft, Clock, Calendar, Save, AlertTriangle, X, FileText, Shield } from "lucide-react"
import { Toast, useToast } from "@/components/Toast"

type ExpiryType = "EXACT_DATE" | "END_OF_MONTH"
type ExpiryTime = "SIX_MONTHS" | "ONE_YEAR" | "TWO_YEARS"

interface GiftCardExpirySettings {
  expiryType: ExpiryType
  expiryTime: ExpiryTime
}

export default function GiftCardExpirySettingsPage() {
  const [expirySettings, setExpirySettings] = useState<GiftCardExpirySettings | null>(null)
  const [originalSettings, setOriginalSettings] = useState<GiftCardExpirySettings | null>(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [showConfirmModal, setShowConfirmModal] = useState(false)
  const [unauthorized, setUnauthorized] = useState(false)
  const { toast, showToast, hideToast } = useToast()

  const fetchExpirySettings = useCallback(async () => {
    try {
      const res = await fetch("/api/admin/settings/gift-card-expiry")
      if (res.status === 403) {
        setUnauthorized(true)
        return
      }
      if (res.ok) {
        const data = await res.json()
        setExpirySettings(data)
        setOriginalSettings(data)
      }
    } catch (error) {
      console.error("Error fetching expiry settings:", error)
      showToast("Errore nel caricamento impostazioni", "error")
    } finally {
      setLoading(false)
    }
  }, [showToast])

  useEffect(() => {
    fetchExpirySettings()
  }, [fetchExpirySettings])

  const hasSettingsChanged = (): boolean => {
    if (!expirySettings || !originalSettings) return false
    return expirySettings.expiryType !== originalSettings.expiryType ||
           expirySettings.expiryTime !== originalSettings.expiryTime
  }

  const handleSaveClick = () => {
    if (!expirySettings) return
    
    // Show confirmation modal if settings have changed
    if (hasSettingsChanged()) {
      setShowConfirmModal(true)
      return
    }
    
    // If no changes, save directly
    performSave()
  }

  const performSave = async () => {
    if (!expirySettings) return
    
    setShowConfirmModal(false)
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

      // Update original settings after successful save
      setOriginalSettings(expirySettings)
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

  if (unauthorized) {
    return (
      <main className="min-h-screen bg-brand-cream flex flex-col items-center justify-center p-6">
        <div className="text-center">
          <Shield className="w-16 h-16 text-brand-gray mx-auto mb-4" />
          <h1 className="text-headline-lg font-bold text-brand-dark mb-2">
            Accesso Negato
          </h1>
          <p className="text-body-lg text-brand-gray mb-6">
            Solo gli utenti con il permesso &quot;Gestione Admin&quot; possono modificare le impostazioni di scadenza Gift Card.
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
          <Link href="/admin/settings" className="p-2 -ml-2 relative z-10">
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
                onClick={handleSaveClick}
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

      {/* Confirmation Modal */}
      {showConfirmModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50">
          <div className="bg-white rounded-3xl w-full max-w-md p-6 shadow-2xl">
            <div className="text-center mb-6">
              <div className="w-16 h-16 bg-amber-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <AlertTriangle className="w-8 h-8 text-amber-600" />
              </div>
              <h3 className="text-headline-sm font-bold text-brand-dark mb-2">
                Conferma modifica scadenza
              </h3>
              <p className="text-body-md text-brand-gray mb-4">
                Stai modificando le regole di scadenza delle Gift Card. Prima di procedere, assicurati di:
              </p>
              <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 text-left">
                <ul className="space-y-2 text-body-sm text-amber-900">
                  <li className="flex items-start gap-2">
                    <FileText className="w-4 h-4 mt-0.5 flex-shrink-0" />
                    <span>Verificare e aggiornare la <strong>documentazione legale</strong> (Termini e Condizioni)</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <FileText className="w-4 h-4 mt-0.5 flex-shrink-0" />
                    <span>Controllare che le policy siano coerenti con la nuova configurazione</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="text-amber-700">💡</span>
                    <span>Le modifiche si applicano solo alle <strong>nuove</strong> Gift Card</span>
                  </li>
                </ul>
              </div>
            </div>
            <div className="flex gap-3">
              <button
                onClick={() => setShowConfirmModal(false)}
                className="flex-1 py-3 px-4 bg-brand-light-gray/50 text-brand-dark rounded-full font-medium hover:bg-brand-light-gray transition-colors flex items-center justify-center gap-2"
              >
                <X className="w-4 h-4" />
                Annulla
              </button>
              <button
                onClick={performSave}
                className="flex-1 py-3 px-4 bg-brand-primary text-white rounded-full font-medium hover:bg-brand-dark transition-colors flex items-center justify-center gap-2"
              >
                <Save className="w-4 h-4" />
                Conferma e salva
              </button>
            </div>
          </div>
        </div>
      )}
    </main>
  )
}
