import { PrismaClient } from "@prisma/client";
import { PrismaNeon } from "@prisma/adapter-neon";
import { neonConfig } from "@neondatabase/serverless";
import ws from "ws";

// WebSocket configuration for Neon in Node.js environment
neonConfig.webSocketConstructor = ws;

const connectionString = process.env.DATABASE_URL;

if (!connectionString) {
  throw new Error("DATABASE_URL is not defined in environment variables");
}

/**
 * Connection Pool Configuration
 * 
 * Ottimizzato per Vercel Serverless + Neon:
 * - max: 5 connessioni (Neon free tier: max 20 totali)
 * - connectionTimeoutMillis: 5s (tempo max per acquisire connessione)
 * - idleTimeoutMillis: 30s (chiudi connessioni idle)
 * 
 * Con 5 connessioni max e Vercel che può avere multiple istanze,
 * il totale teorico è 5 * n_istanze. Neon free supporta 20 connessioni.
 * 
 * Per scale-up: aumentare max a 10 o usare Neon con più connessioni.
 */
const adapter = new PrismaNeon({ 
  connectionString,
  // Configurazione pool - disponibile nella maggior parte dei driver Neon
  max: 5,                    // Max 5 connessioni in pool
  connectionTimeoutMillis: 5000,  // 5 secondi timeout
  idleTimeoutMillis: 30000,       // 30 secondi idle timeout
});

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
};

export const prisma =
  globalForPrisma.prisma ??
  new PrismaClient({
    adapter,
    // Log queries solo in development per debug
    log: process.env.NODE_ENV === "development" 
      ? ["query", "error", "warn"] 
      : ["error"],
  });

if (process.env.NODE_ENV !== "production") {
  globalForPrisma.prisma = prisma;
}
