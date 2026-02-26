"use client"

import { useEffect, useState } from "react"
import Link from "next/link"
import { 
  ShoppingBag, 
  Wine, 
  Store, 
  ChevronRight,
  ArrowLeft,
  Wallet,
  CreditCard,
  ExternalLink,
  Shield,
  Calculator,
  FileText,
  Settings
} from "lucide-react"

const quickAccessItems = [
  { href: "/admin/orders", label: "Ordini", icon: ShoppingBag, description: "Gestisci tutti gli ordini" },
  { href: "/admin/gift-cards", label: "Gift Card", icon: Wallet, description: "Gestisci le gift card" },
  { href: "/admin/accounting", label: "Contabilità", icon: Calculator, description: "Riepilogo giornaliero ordini" },
]

const configItems = [
  { href: "/admin/menu", label: "Menu", icon: Wine, description: "Configura categorie e cocktail" },
  { href: "/admin/shop", label: "Negozio", icon: Store, description: "Configura Prodotti, Gift Card e magazzino" },
]

export default function AdminDashboard() {
  const [canManageAdmins, setCanManageAdmins] = useState(false)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    // Verifica se l'admin può gestire altri admin (stesso check del layout)
    fetch("/api/admin/admins")
      .then(res => res.ok ? setCanManageAdmins(true) : setCanManageAdmins(false))
      .catch(() => setCanManageAdmins(false))
      .finally(() => setLoading(false))
  }, [])

  return (
    <main className="min-h-screen bg-brand-cream">
      {/* Header */}
      <header className="bg-white border-b border-brand-light-gray">
        <div className="flex items-center px-4 py-3 relative">
          <Link href="/home" className="p-2 -ml-2 pointer-events-none">
            <ArrowLeft className="w-6 h-6 text-brand-dark invisible" />
          </Link>
          <h1 className="text-headline-sm font-bold text-brand-dark absolute left-1/2 -translate-x-1/2">
            Dashboard
          </h1>
        </div>
      </header>

      <div className="p-4">
        {/* Quick Access Section */}
        <div className="mb-8">
          <h2 className="text-title-md font-bold text-brand-dark mb-4 flex items-center gap-2">
            <span className="w-2 h-2 bg-brand-primary rounded-full"></span>
            Gestione giornaliera
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {quickAccessItems.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                className="bg-white rounded-2xl p-6 shadow-card hover:shadow-card-hover transition-shadow group"
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

        {/* Configuration Section */}
        <div className="mb-8">
          <h2 className="text-title-md font-bold text-brand-dark mb-4 flex items-center gap-2">
            <span className="w-2 h-2 bg-brand-gray rounded-full"></span>
            Configurazione sito
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {configItems.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                className="bg-white rounded-2xl p-6 shadow-card hover:shadow-card-hover transition-shadow group"
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

        {/* Admin Tools Section - Only for canManageAdmins */}
        {!loading && canManageAdmins && (
          <>
            <div>
              <h2 className="text-title-md font-bold text-brand-dark mb-4 flex items-center gap-2">
                <Shield className="w-5 h-5 text-brand-primary" />
                Strumenti Admin
              </h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Gestione Admin Link */}
                <Link
                  href="/admin/reports"
                  className="bg-white rounded-2xl p-6 shadow-card hover:shadow-card-hover transition-shadow group"
                >
                  <div className="flex items-start justify-between">
                    <div className="flex items-center gap-4">
                      <div className="w-12 h-12 bg-brand-primary/10 rounded-xl flex items-center justify-center">
                        <FileText className="w-6 h-6 text-brand-primary" />
                      </div>
                      <div>
                        <h2 className="text-headline-sm font-bold text-brand-dark group-hover:text-brand-primary transition-colors">
                          Reportistica
                        </h2>
                        <p className="text-body-sm text-brand-gray">
                          Reportistica a supporto contabile
                        </p>
                      </div>
                    </div>
                    <ChevronRight className="w-5 h-5 text-brand-gray group-hover:text-brand-primary transition-colors" />
                  </div>
                </Link>

                <Link
                  href="/admin/settings"
                  className="bg-white rounded-2xl p-6 shadow-card hover:shadow-card-hover transition-shadow group"
                >
                  <div className="flex items-start justify-between">
                    <div className="flex items-center gap-4">
                      <div className="w-12 h-12 bg-brand-primary/10 rounded-xl flex items-center justify-center">
                        <Settings className="w-6 h-6 text-brand-primary" />
                      </div>
                      <div>
                        <h2 className="text-headline-sm font-bold text-brand-dark group-hover:text-brand-primary transition-colors">
                          Impostazioni
                        </h2>
                        <p className="text-body-sm text-brand-gray">
                          Gestione utenti, impostazioni Gift Card, documenti legali e altro
                        </p>
                      </div>
                    </div>
                    <ChevronRight className="w-5 h-5 text-brand-gray group-hover:text-brand-primary transition-colors" />
                  </div>
                </Link>
                
                {/* Stripe Dashboard Link */}
                <a
                  href="https://dashboard.stripe.com"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="bg-white rounded-2xl p-6 shadow-card hover:shadow-card-hover transition-shadow group"
                >
                  <div className="flex items-start justify-between">
                    <div className="flex items-center gap-4">
                      <div className="w-12 h-12 bg-[#635BFF]/10 rounded-xl flex items-center justify-center">
                        <CreditCard className="w-6 h-6 text-[#635BFF] group-hover:scale-110 transition-transform" />
                      </div>
                      <div>
                        <h2 className="text-headline-sm font-bold text-brand-dark group-hover:text-[#635BFF] transition-colors">
                          Stripe Dashboard
                        </h2>
                        <p className="text-body-sm text-brand-gray">
                          Transazioni, rimborsi e report
                        </p>
                      </div>
                    </div>
                    <ExternalLink className="w-5 h-5 text-brand-gray group-hover:text-[#635BFF] transition-colors" />
                  </div>
                </a>
              </div>
            </div>
          </>
        )}
      </div>
    </main>
  )
}
