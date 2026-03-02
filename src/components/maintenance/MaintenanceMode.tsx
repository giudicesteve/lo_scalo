"use client";

import { Logo } from "@/components/Logo"
import { Footer } from "@/components/Footer"

/**
 * Maintenance Mode - Visualizzato quando FRONTEND_ENABLED = false
 * Mostra solo il logo e il footer standard
 */
export const metadata = {
  title: "Lo Scalo - Craft Drinks by the Lake",
  description: "Cocktail bar by Lake Como",
};

export function MaintenanceMode() {
  return (
    <div className="min-h-screen flex flex-col bg-brand-cream">
      {/* Logo centrato con messaggio manutenzione */}
      <main className="flex-1 bg-brand-cream flex flex-col items-center justify-center p-6">
        <Logo variant="vertical" className="w-64 h-auto mb-8" />
      </main>

      {/* Footer standard */}
      <Footer />
    </div>
  );
}
