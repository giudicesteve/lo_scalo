import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

/**
 * Health Check Endpoint
 * 
 * Usato per monitorare lo stato dell'applicazione.
 * Ritorna 200 se tutto OK, 503 se ci sono problemi.
 * 
 * Endpoint: GET /api/health
 * 
 * Risposta:
 * {
 *   "status": "healthy" | "degraded",
 *   "checks": {
 *     "database": true | false,
 *     "stripe": true | false
 *   },
 *   "timestamp": "2026-03-04T...",
 *   "version": "abc1234"
 * }
 */
export async function GET() {
  const checks = {
    database: false,
    stripe: false,
    timestamp: new Date().toISOString(),
  };

  let status = 200;

  try {
    // Check database - esegue query semplice
    await prisma.$queryRaw`SELECT 1`;
    checks.database = true;
  } catch (error) {
    console.error("[Health Check] Database connection failed:", error);
    checks.database = false;
    status = 503;
  }

  try {
    // Check Stripe - verifica che la chiave sia configurata
    // Non facciamo chiamata API a Stripe per non consumare rate limit
    if (process.env.STRIPE_SECRET_KEY && process.env.STRIPE_SECRET_KEY.startsWith("sk_")) {
      checks.stripe = true;
    } else {
      checks.stripe = false;
      status = 503;
    }
  } catch (error) {
    console.error("[Health Check] Stripe check failed:", error);
    checks.stripe = false;
    status = 503;
  }

  const healthy = status === 200;

  return NextResponse.json(
    {
      status: healthy ? "healthy" : "degraded",
      checks,
      version: process.env.VERCEL_GIT_COMMIT_SHA?.slice(0, 7) || "dev",
    },
    {
      status,
      headers: {
        // No cache per health check - sempre freschi
        "Cache-Control": "no-store",
      },
    }
  );
}
