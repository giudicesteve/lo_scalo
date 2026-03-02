import { prisma } from "@/lib/prisma";
import { MaintenanceMode } from "./MaintenanceMode";
import { ReactNode } from "react";

interface PublicPageWrapperProps {
  children: ReactNode;
  requiredFlag?: string; // Flag specifico richiesto oltre a FRONTEND_ENABLED
}

/**
 * PublicPageWrapper - Wrappa le pagine pubbliche per controllare i feature flags
 * Se FRONTEND_ENABLED = false, mostra MaintenanceMode
 * Se requiredFlag è specificato e disabilitato, mostra 404 o messaggio
 */
export async function PublicPageWrapper({ 
  children, 
  requiredFlag 
}: PublicPageWrapperProps) {
  // Controlla sempre FRONTEND_ENABLED prima
  const frontendFlag = await prisma.featureFlag.findUnique({
    where: { key: "FRONTEND_ENABLED" },
  });

  const isFrontendEnabled = frontendFlag?.enabled ?? true;

  // Se il frontend è disabilitato, mostra la Maintenance Mode
  if (!isFrontendEnabled) {
    return <MaintenanceMode />;
  }

  // Se c'è un flag specifico richiesto, controllalo
  if (requiredFlag) {
    const specificFlag = await prisma.featureFlag.findUnique({
      where: { key: requiredFlag },
    });

    const isSpecificEnabled = specificFlag?.enabled ?? true;

    if (!isSpecificEnabled) {
      // Sezione disabilitata - mostra 404 semplice o redirect a home
      return (
        <div className="min-h-screen flex flex-col items-center justify-center bg-brand-cream px-4">
          <h1 className="text-display-md text-brand-dark mb-4">404</h1>
          <p className="text-body-lg text-brand-gray text-center">
            Pagina non trovata
          </p>
        </div>
      );
    }
  }

  // Tutto abilitato, mostra il contenuto
  return <>{children}</>;
}
