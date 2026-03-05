"use client"

import { useEffect, useState } from "react"
import Link from "next/link"
import { ArrowLeft, ChevronRight, Scale, Users, Clock, Shield, ToggleLeft, Palette } from "lucide-react"

const settingsItems = [
  { 
    href: "/admin/settings/admins", 
    label: "Gestione Utenti", 
    icon: Users, 
    description: "Gestione utenti, permessi e accessi al pannello"
  },
  { 
    href: "/admin/settings/brand", 
    label: "Brand e Logo", 
    icon: Palette, 
    description: "Configura logo personalizzato per sito, email e PDF"
  },
  { 
    href: "/admin/settings/gift-card-expiry", 
    label: "Impostazioni Scadenza Gift Card", 
    icon: Clock, 
    description: "Configura durata e tipo di scadenza delle Gift Card"
  },
  { 
    href: "/admin/settings/feature-flags", 
    label: "Feature Flags", 
    icon: ToggleLeft, 
    description: "Abilita/disabilita funzionalità del sito"
  },
  { 
    href: "/admin/settings/policies", 
    label: "Documenti Legali", 
    icon: Scale, 
    description: "Gestione Termini e Condizioni, Privacy Policy e Cookie Policy"
  },
]

export default function SettingsMenuPage() {
  const [canManageAdmins, setCanManageAdmins] = useState(false)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    // Verifica se l'admin può gestire altri admin
    fetch("/api/admin/admins")
      .then(res => {
        setCanManageAdmins(res.ok)
        setLoading(false)
      })
      .catch(() => {
        setCanManageAdmins(false)
        setLoading(false)
      })
  }, [])

  if (loading) {
    return (
      <main className="min-h-screen bg-brand-cream flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-brand-primary" />
      </main>
    )
  }

  if (!canManageAdmins) {
    return (
      <main className="min-h-screen bg-brand-cream flex flex-col items-center justify-center p-6">
        <div className="text-center">
          <Shield className="w-16 h-16 text-brand-gray mx-auto mb-4" />
          <h1 className="text-headline-lg font-bold text-brand-dark mb-2">
            Accesso Negato
          </h1>
          <p className="text-body-lg text-brand-gray mb-6">
            Solo gli utenti con il permesso &quot;Gestione Admin&quot; possono accedere a questa sezione.
          </p>
          <Link
            href="/admin"
            className="px-6 py-3 rounded-full border-2 border-brand-dark text-brand-dark hover:bg-brand-dark hover:text-white transition-colors"
          >
            Torna alla Dashboard
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
          <Link href="/admin" className="p-2 -ml-2 relative z-10">
            <ArrowLeft className="w-6 h-6 text-brand-dark" />
          </Link>
          <h1 className="text-headline-sm font-bold text-brand-dark absolute left-1/2 -translate-x-1/2">
            Impostazioni
          </h1>
        </div>
      </header>

      <div className="p-4 max-w-2xl mx-auto">
        {/* Lista impostazioni */}
        <div className="space-y-4">
          {settingsItems.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className="bg-white rounded-2xl p-6 shadow-card hover:shadow-card-hover transition-shadow group block"
            >
              <div className="flex items-start justify-between">
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 bg-brand-primary/10 rounded-xl flex items-center justify-center">
                    <item.icon className="w-6 h-6 text-brand-primary" />
                  </div>
                  <div>
                    <h2 className="text-headline-sm font-bold text-brand-dark group-hover:text-brand-primary transition-colors">
                      {item.label}
                    </h2>
                    <p className="text-body-sm text-brand-gray">
                      {item.description}
                    </p>
                  </div>
                </div>
                <ChevronRight className="w-5 h-5 text-brand-gray group-hover:text-brand-primary transition-colors" />
              </div>
            </Link>
          ))}
        </div>
      </div>
    </main>
  )
}
