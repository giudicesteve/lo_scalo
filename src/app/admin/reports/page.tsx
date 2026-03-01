"use client"

import Link from "next/link"
import { ArrowLeft, ChevronRight, FileText, Calendar, BarChart3, Gift, AlertCircle } from "lucide-react"

const reportItems = [
  { 
    href: "/admin/reports/metrics", 
    label: "Metriche", 
    icon: BarChart3, 
    description: "Metriche di vendita: totali, medie e statistiche mensili" 
  },
  { 
    href: "/admin/reports/monthly", 
    label: "Report Mensile Prodotti/Gift Card vendute e Rimborsi", 
    icon: Calendar, 
    description: "Riepilogo vendite Prodotti/Gift Card e Rimborsi con export Excel e PDF per contabilità" 
  },
  { 
    href: "/admin/reports/gift-cards", 
    label: "Report Mensile transazioni Gift Card", 
    icon: Gift, 
    description: "Transazioni mensili gift card con dettagli con export Excel e PDF per contabilità" 
  },
  { 
    href: "/admin/reports/expired-gift-cards", 
    label: "Report Mensile Gift Card Scadute", 
    icon: AlertCircle, 
    description: "Gift card scadute nel mese con residuo non utilizzato con export Excel e PDF per contabilità" 
  },
]

export default function ReportsMenuPage() {
  return (
    <main className="min-h-screen bg-brand-cream">
      {/* Header */}
      <header className="bg-white border-b border-brand-light-gray">
        <div className="flex items-center px-4 py-3 relative">
          <Link href="/admin" className="p-2 -ml-2">
            <ArrowLeft className="w-6 h-6 text-brand-dark" />
          </Link>
          <h1 className="text-headline-sm font-bold text-brand-dark absolute left-1/2 -translate-x-1/2">
            Reportistica
          </h1>
        </div>
      </header>

      <div className="p-4 max-w-2xl mx-auto">

        {/* Lista report */}
        <div className="space-y-4">
          {reportItems.map((item) => (
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

        {/* Info box */}
        <div className="mt-8 bg-blue-50 rounded-2xl p-4 border border-blue-100">
          <div className="flex items-start gap-3">
            <FileText className="w-5 h-5 text-blue-500 flex-shrink-0 mt-0.5" />
            <div>
              <h3 className="text-body-md font-bold text-blue-800 mb-1">
                Report Contabili
              </h3>
              <p className="text-body-sm text-blue-700">
                I report includono solo ordini con pagamento completato (stati COMPLETED e DELIVERED), i dati sono filtrati per data di pagamento effettiva.
              </p>
              <p className="text-body-sm text-blue-700">
                Il report sulle Gift Card scadute include solo quelle con residuo non utilizzato al momento della scadenza.
              </p> 
              <p className="text-body-sm text-blue-700">
                Tutti i report sono esportabili in Excel e PDF per facilitare la contabilità.
              </p>
            </div>
          </div>
        </div>
      </div>
    </main>
  )
}
