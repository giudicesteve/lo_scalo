"use client"

import { useEffect, useState } from "react"
import Link from "next/link"
import { ArrowLeft, Save, Image, ExternalLink, Shield } from "lucide-react"
import { Toast, useToast } from "@/components/Toast"

interface LogoConfig {
  logoVertical: string
  logoHorizontal: string
  logoSolo: string
  logoEmail: string
}

const DEFAULT_LOGOS = {
  logoVertical: "/resources/Lo_Scalo_vertical.svg",
  logoHorizontal: "/resources/Lo_Scalo_horizontal.svg",
  logoSolo: "/resources/Lo_Scalo_solo_logo.svg",
  logoEmail: "https://raw.githubusercontent.com/giudicesteve/lo_scalo/main/public/resources/Lo_Scalo_vertical_black.png",
}

export default function BrandSettingsPage() {
  const [config, setConfig] = useState<LogoConfig>(DEFAULT_LOGOS)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [unauthorized, setUnauthorized] = useState(false)
  const { toast, showToast, hideToast } = useToast()

  useEffect(() => {
    fetch("/api/site-config")
      .then(res => {
        if (res.status === 403) {
          setUnauthorized(true)
          return null
        }
        return res.json()
      })
      .then(data => {
        if (data) {
          setConfig({
            logoVertical: data.logoVertical || DEFAULT_LOGOS.logoVertical,
            logoHorizontal: data.logoHorizontal || DEFAULT_LOGOS.logoHorizontal,
            logoSolo: data.logoSolo || DEFAULT_LOGOS.logoSolo,
            logoEmail: data.logoEmail || DEFAULT_LOGOS.logoEmail,
          })
        }
      })
      .catch(err => {
        console.error("Failed to load config:", err)
        showToast("Errore nel caricamento configurazione", "error")
      })
      .finally(() => setLoading(false))
  }, [showToast])

  const handleSave = async (key: keyof LogoConfig) => {
    setSaving(true)
    try {
      const res = await fetch("/api/site-config", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ key, value: config[key] }),
      })

      if (!res.ok) {
        const data = await res.json()
        throw new Error(data.error || "Failed to save")
      }

      showToast("Logo aggiornato con successo", "success")
    } catch (err) {
      showToast(err instanceof Error ? err.message : "Errore", "error")
    } finally {
      setSaving(false)
    }
  }

  const handleReset = (key: keyof LogoConfig) => {
    setConfig(prev => ({ ...prev, [key]: DEFAULT_LOGOS[key] }))
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
            Solo gli utenti con il permesso &quot;Gestione Admin&quot; possono modificare le impostazioni brand.
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

  const logoFields: { key: keyof LogoConfig; label: string; description: string }[] = [
    {
      key: "logoVertical",
      label: "Logo Verticale",
      description: "Usato nella homepage, landing page, admin login",
    },
    {
      key: "logoHorizontal",
      label: "Logo Orizzontale",
      description: "Usato in header compatti (se necessario)",
    },
    {
      key: "logoSolo",
      label: "Logo Solo (icona)",
      description: "Usato in header navigazione, checkout, footer",
    },
    {
      key: "logoEmail",
      label: "Logo Email",
      description: "Usato nelle email di conferma ordine e PDF (formato PNG consigliato)",
    },
  ]

  return (
    <main className="min-h-screen bg-brand-cream">
      <Toast isOpen={toast.isOpen} message={toast.message} type={toast.type} onClose={hideToast} />

      {/* Header */}
      <header className="bg-white border-b border-brand-light-gray">
        <div className="flex items-center px-4 py-3 relative">
          <Link href="/admin/settings" className="p-2 -ml-2 relative z-10">
            <ArrowLeft className="w-6 h-6 text-brand-dark" />
          </Link>
          <h1 className="text-headline-sm font-bold text-brand-dark absolute left-1/2 -translate-x-1/2">
            Brand e Logo
          </h1>
        </div>
      </header>

      <div className="p-4 max-w-3xl mx-auto">
        {/* Info Box */}
        <div className="bg-blue-50 border border-blue-200 rounded-xl p-4 mb-6">
          <p className="text-body-sm text-blue-800">
            <strong>Come configurare:</strong> Carica i tuoi logo su un servizio di hosting immagini 
            (consigliato: <a href="https://cloudinary.com" target="_blank" rel="noopener noreferrer" className="underline">Cloudinary</a>, 
            <a href="https://imgbb.com" target="_blank" rel="noopener noreferrer" className="underline">ImgBB</a>, o 
            <a href="https://github.com" target="_blank" rel="noopener noreferrer" className="underline">GitHub</a>) 
            e incolla qui l&apos;URL diretto all&apos;immagine.
          </p>
        </div>

        {/* Logo Fields */}
        <div className="space-y-6">
          {logoFields.map(({ key, label, description }) => (
            <div key={key} className="bg-white rounded-2xl p-6 shadow-card">
              <div className="flex items-start gap-4">
                <div className="w-12 h-12 bg-brand-primary/10 rounded-xl flex items-center justify-center flex-shrink-0">
                  <Image className="w-6 h-6 text-brand-primary" />
                </div>
                <div className="flex-1">
                  <h2 className="text-headline-sm font-bold text-brand-dark mb-1">{label}</h2>
                  <p className="text-body-sm text-brand-gray mb-4">{description}</p>
                  
                  <div className="space-y-3">
                    <div>
                      <label className="block text-label-sm text-brand-gray mb-2">
                        URL immagine
                      </label>
                      <input
                        type="url"
                        value={config[key]}
                        onChange={(e) => setConfig(prev => ({ ...prev, [key]: e.target.value }))}
                        placeholder="https://..."
                        className="w-full px-4 py-3 rounded-xl border-2 border-brand-light-gray focus:border-brand-primary focus:outline-none text-brand-dark"
                      />
                    </div>

                    {/* Preview */}
                    {config[key] && (
                      <div className="bg-brand-cream rounded-xl p-4">
                        <p className="text-label-sm text-brand-gray mb-2">Anteprima:</p>
                        <div className="flex items-center justify-center bg-white rounded-lg p-4">
                          {/* eslint-disable-next-line @next/next/no-img-element */}
                          <img
                            src={config[key]}
                            alt={label}
                            className="max-h-24 w-auto object-contain"
                            onError={(e) => {
                              (e.target as HTMLImageElement).style.display = "none"
                            }}
                          />
                        </div>
                      </div>
                    )}

                    <div className="flex gap-3">
                      <button
                        onClick={() => handleSave(key)}
                        disabled={saving}
                        className="flex-1 py-3 px-4 rounded-xl bg-brand-primary text-white font-medium hover:bg-brand-dark transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
                      >
                        <Save className="w-4 h-4" />
                        {saving ? "Salvataggio..." : "Salva"}
                      </button>
                      <button
                        onClick={() => handleReset(key)}
                        className="px-4 py-3 rounded-xl border-2 border-brand-light-gray text-brand-gray font-medium hover:bg-brand-light-gray/30 transition-colors"
                      >
                        Reset
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Default Resources Info */}
        <div className="mt-8 bg-gray-50 border border-gray-200 rounded-xl p-4">
          <p className="text-label-sm text-gray-600">
            <strong>Default:</strong> Se lasci vuoto o l&apos;URL non funziona, verranno usati i logo 
            originali di Lo Scalo da <code>/resources/</code>.
          </p>
        </div>
      </div>
    </main>
  )
}
