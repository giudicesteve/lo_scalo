"use client";

import { Logo } from "@/components/Logo"

/**
 * Maintenance Mode - Visualizzato quando FRONTEND_ENABLED = false
 * Mostra solo il logo e il footer (senza link funzionanti)
 */
export function MaintenanceMode() {
  return (
    <div className="min-h-screen flex flex-col bg-brand-cream">
      {/* Logo centrato */}
      <main className="min-h-screen bg-brand-cream flex flex-col items-center justify-center p-6">
        <Logo variant="vertical" className="w-64 h-auto mb-12" />
      </main>

      {/* Footer semplificato */}
      <footer className="bg-brand-dark text-brand-cream py-6">
        <div className="max-w-7xl mx-auto px-4 text-center">
          <p className="text-body-sm text-brand-gray">
            © {new Date().getFullYear()} Lo Scalo - Craft Drinks by the Lake
          </p>
        </div>
      </footer>
    </div>
  );
}
