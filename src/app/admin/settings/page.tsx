"use client"

import Link from "next/link"
import { ArrowLeft, ChevronRight, Scale, Users, Clock } from "lucide-react"

const settingsItems = [
  { 
    href: "/admin/settings/admins", 
    label: "Gestione Utenti", 
    icon: Users, 
    description: "Gestione utenti, permessi e accessi al pannello"
  },
  { 
    href: "/admin/settings/gift-card-expiry", 
    label: "Impostazioni Scadenza Gift Card", 
    icon: Clock, 
    description: "Configura durata e tipo di scadenza delle Gift Card"
  },
  { 
    href: "/admin/settings/policies", 
    label: "Documenti Legali", 
    icon: Scale, 
    description: "Gestione Termini e Condizioni, Privacy Policy e Cookie Policy"
  },
]

export default function SettingsMenuPage() {
  return (
    <main className="min-h-screen bg-brand-cream">
      {/* Header */}
      <header className="bg-white border-b border-brand-light-gray">
        <div className="flex items-center px-4 py-3 relative">
          <Link href="/admin" className="p-2 -ml-2">
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
