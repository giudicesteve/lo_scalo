import { cookies } from "next/headers";
import { MaintenanceMode } from "./MaintenanceMode";
import { ReactNode } from "react";

interface MaintenanceCheckProps {
  children: ReactNode;
}

const FRONTEND_COOKIE = "frontend_enabled";
const FLAGS_TIMESTAMP_COOKIE = "flags_timestamp";

/**
 * MaintenanceCheck - Server Component che controlla se il frontend è abilitato
 * Se FRONTEND_ENABLED = false, mostra MaintenanceMode
 * Altrimenti mostra i children
 * 
 * NOTA: Admin routes sono sempre accessibili (controllato dal pathname)
 * NOTA: Durante la build, assume frontend sempre abilitato (default true)
 */
export async function MaintenanceCheck({ children }: MaintenanceCheckProps) {
  // Ottieni pathname dai headers (disponibile in Next.js 15+)
  const headersList = await import("next/headers").then(mod => mod.headers());
  const pathname = headersList.get("x-invoke-path") || "";
  
  // Admin routes sono sempre accessibili
  if (pathname.startsWith("/admin") || pathname.startsWith("/login")) {
    return <>{children}</>;
  }

  let isFrontendEnabled = true; // Default: abilitato

  try {
    // Import dinamico per evitare errori durante la build
    const { prisma } = await import("@/lib/prisma");
    
    // Verifica che prisma esista
    if (prisma && prisma.featureFlag) {
      // Controlla il feature flag
      const frontendFlag = await prisma.featureFlag.findUnique({
        where: { key: "FRONTEND_ENABLED" },
      });
      
      isFrontendEnabled = frontendFlag?.enabled ?? true;
    }
  } catch (error) {
    // Durante la build o in caso di errore, assumi frontend abilitato
    console.warn("MaintenanceCheck: assuming frontend enabled (database unavailable)");
  }

  // Imposta i cookie per il middleware (client-side check)
  try {
    const cookieStore = await cookies();
    cookieStore.set(FRONTEND_COOKIE, String(isFrontendEnabled), {
      maxAge: 60 * 5, // 5 minuti
      path: "/",
    });
    cookieStore.set(FLAGS_TIMESTAMP_COOKIE, String(Date.now()), {
      maxAge: 60 * 5,
      path: "/",
    });
  } catch {
    // Ignora errori cookie durante la build
  }

  // Se il frontend è disabilitato, mostra Maintenance Mode
  if (!isFrontendEnabled) {
    return <MaintenanceMode />;
  }

  // Altrimenti mostra il contenuto normale
  return <>{children}</>;
}
