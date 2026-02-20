"use client"

import Link from "next/link"
import { Logo } from "@/components/Logo"
import { 
  ShoppingBag, 
  Wine, 
  Store, 
  ChevronRight,
  ArrowLeft,
  Gift,
  Wallet
} from "lucide-react"

const quickAccessItems = [
  { href: "/admin/orders", label: "Ordini", icon: ShoppingBag, description: "Gestisci tutti gli ordini" },
  { href: "/admin/gift-cards", label: "Gestione Gift Card", icon: Wallet, description: "Gestisci le card acquistate" },
]

const configItems = [
  { href: "/admin/menu", label: "Menu", icon: Wine, description: "Categorie e cocktail" },
  { href: "/admin/shop", label: "Negozio", icon: Store, description: "Prodotti e inventario" },
  { href: "/admin/gift-card-templates", label: "Tagli Gift Card", icon: Gift, description: "Crea e modifica i tagli disponibili" },
]

export default function AdminDashboard() {
  return (
    <main className="min-h-screen bg-brand-cream">
      {/* Header */}
      <header className="bg-white border-b border-brand-light-gray">
        <div className="flex items-center px-4 py-3 relative">
          <Link href="/home" className="p-2 -ml-2">
            <ArrowLeft className="w-6 h-6 text-brand-dark" />
          </Link>
          <h1 className="text-headline-sm font-bold text-brand-dark absolute left-1/2 -translate-x-1/2">
            Dashboard
          </h1>
          <Logo variant="solo" className="h-3 w-auto ml-auto" />
        </div>
      </header>

      <div className="p-4">
        {/* Quick Access Section */}
        <div className="mb-8">
          <h2 className="text-title-md font-bold text-brand-dark mb-4 flex items-center gap-2">
            <span className="w-2 h-2 bg-brand-primary rounded-full"></span>
            Accesso Rapido
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

        {/* Divider */}
        <div className="border-t border-brand-light-gray my-6"></div>

        {/* Configuration Section */}
        <div>
          <h2 className="text-title-md font-bold text-brand-dark mb-4 flex items-center gap-2">
            <span className="w-2 h-2 bg-brand-gray rounded-full"></span>
            Configurazione
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
                    <div className="w-12 h-12 bg-brand-gray/10 rounded-xl flex items-center justify-center">
                      <item.icon className="w-6 h-6 text-brand-gray group-hover:text-brand-primary transition-colors" />
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
      </div>
    </main>
  )
}
