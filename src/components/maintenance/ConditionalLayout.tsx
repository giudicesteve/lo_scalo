import { prisma } from "@/lib/prisma";
import { MaintenanceMode } from "./MaintenanceMode";
import { ReactNode } from "react";

interface ConditionalLayoutProps {
  children: ReactNode;
  pathname: string;
}

/**
 * Conditional Layout - Gestisce la Maintenance Mode
 * Se FRONTEND_ENABLED = false e non siamo in /admin o /login, mostra MaintenanceMode
 */
export async function ConditionalLayout({ children, pathname }: ConditionalLayoutProps) {
  // Controlla se siamo in una route admin o login (sempre accessibili)
  const isAdminRoute = pathname.startsWith("/admin") || pathname.startsWith("/login");
  
  // Se siamo in admin, mostra sempre il contenuto normale
  if (isAdminRoute) {
    return <>{children}</>;
  }

  // Controlla lo stato del feature flag FRONTEND_ENABLED
  const frontendFlag = await prisma.featureFlag.findUnique({
    where: { key: "FRONTEND_ENABLED" },
  });

  const isFrontendEnabled = frontendFlag?.enabled ?? true;

  // Se il frontend è disabilitato, mostra la Maintenance Mode
  if (!isFrontendEnabled) {
    return <MaintenanceMode />;
  }

  // Altrimenti mostra il contenuto normale
  return <>{children}</>;
}
