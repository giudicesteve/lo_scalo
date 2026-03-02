"use client";

import Image from "next/image";

/**
 * Maintenance Mode - Visualizzato quando FRONTEND_ENABLED = false
 * Mostra solo il logo e il footer (senza link funzionanti)
 */
export function MaintenanceMode() {
  return (
    <div className="min-h-screen flex flex-col bg-brand-cream">
      {/* Logo centrato */}
      <main className="flex-1 flex flex-col items-center justify-center px-4">
        <div className="relative w-48 h-48 md:w-64 md:h-64">
          <Image
            src="/images/logo.svg"
            alt="Lo Scalo"
            fill
            className="object-contain"
            priority
          />
        </div>
        <p className="mt-8 text-body-lg text-brand-gray text-center max-w-md">
          Stiamo aggiornando il sito.<br />
          Torniamo presto!
        </p>
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
