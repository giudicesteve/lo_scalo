/**
 * Rate Limiting - Implementazione In-Memory (Gratuita)
 * 
 * NOTA: Su Vercel (serverless), ogni function ha memoria isolata,
 * quindi il rate limiting è "per instance". Per traffico moderato va bene.
 * Per alta scalabilità, migrare a Redis (Upstash/etc).
 * 
 * Configurazione: Vedi src/lib/rate-limit-config.ts
 * Env vars: RATE_LIMIT_PUBLIC_API, RATE_LIMIT_ADMIN_API, etc.
 */

import { rateLimitEnvConfig, isRateLimitingEnabled } from './rate-limit-config';

export type RateLimitConfig = {
  // Numero massimo di richieste
  limit: number;
  // Finestra temporale in secondi
  windowInSeconds: number;
};

type RateLimitEntry = {
  count: number;
  resetTime: number;
  requests: number[]; // Timestamp delle richieste (sliding window)
};

// Store in-memory globale
const store = new Map<string, RateLimitEntry>();

// Pulizia periodica delle entry scadute (ogni 5 minuti)
if (typeof global !== 'undefined') {
  setInterval(() => {
    const now = Date.now();
    for (const [key, entry] of store.entries()) {
      if (now > entry.resetTime) {
        store.delete(key);
      }
    }
  }, 5 * 60 * 1000);
}

/**
 * Rate limiting con Sliding Window
 * 
 * @param identifier - Identificatore univoco (IP, userId, etc.)
 * @param config - Configurazione limit/window
 * @returns Risultato del rate limiting
 */
export function rateLimit(
  identifier: string,
  config: RateLimitConfig
): {
  success: boolean;
  limit: number;
  remaining: number;
  reset: number;
} {
  // Se il rate limiting è disabilitato, permetti sempre
  if (!isRateLimitingEnabled()) {
    return {
      success: true,
      limit: config.limit,
      remaining: config.limit,
      reset: Date.now() + config.windowInSeconds * 1000,
    };
  }

  const now = Date.now();
  const windowMs = config.windowInSeconds * 1000;
  const key = identifier;

  let entry = store.get(key);

  // Se non esiste o è scaduto, crea nuova entry
  if (!entry || now > entry.resetTime) {
    entry = {
      count: 1,
      resetTime: now + windowMs,
      requests: [now],
    };
    store.set(key, entry);

    return {
      success: true,
      limit: config.limit,
      remaining: config.limit - 1,
      reset: entry.resetTime,
    };
  }

  // Sliding window: rimuovi richieste vecchie
  const windowStart = now - windowMs;
  entry.requests = entry.requests.filter((timestamp) => timestamp > windowStart);

  // Verifica limite
  if (entry.requests.length >= config.limit) {
    return {
      success: false,
      limit: config.limit,
      remaining: 0,
      reset: entry.resetTime,
    };
  }

  // Aggiungi richiesta corrente
  entry.requests.push(now);
  entry.count = entry.requests.length;

  return {
    success: true,
    limit: config.limit,
    remaining: config.limit - entry.requests.length,
    reset: entry.resetTime,
  };
}

/**
 * Configurazioni per diversi scenari
 * 
 * NOTA: Questi valori possono essere sovrascritti tramite
 * variabili d'ambiente (vedi src/lib/rate-limit-config.ts)
 * 
 * Env vars disponibili:
 * - RATE_LIMIT_PUBLIC_API / RATE_LIMIT_PUBLIC_WINDOW
 * - RATE_LIMIT_ADMIN_API / RATE_LIMIT_ADMIN_WINDOW
 * - RATE_LIMIT_WEBHOOK / RATE_LIMIT_WEBHOOK_WINDOW
 * - RATE_LIMIT_AUTH / RATE_LIMIT_AUTH_WINDOW
 * - RATE_LIMITING_ENABLED=false (per disabilitare)
 */
export const rateLimitConfigs = rateLimitEnvConfig;

/**
 * Estrae l'identificatore dalla request
 * Usa X-Forwarded-For se dietro proxy (Vercel), altrimenti IP diretto
 */
export function getIdentifier(req: Request): string {
  // Per Vercel, l'IP reale è in x-forwarded-for
  const forwarded = req.headers.get('x-forwarded-for');
  if (forwarded) {
    // Prendi il primo IP (client originale)
    return forwarded.split(',')[0].trim();
  }

  // Fallback: usa l'URL come identificatore (meno preciso ma funziona)
  // In produzione, Vercel fornisce sempre x-forwarded-for
  return req.headers.get('x-real-ip') || 'unknown';
}

/**
 * Formatta la risposta di errore 429 (Too Many Requests)
 */
export function createRateLimitResponse(
  remaining: number,
  reset: number
): Response {
  const retryAfter = Math.ceil((reset - Date.now()) / 1000);

  return new Response(
    JSON.stringify({
      error: 'Too Many Requests',
      message: `Rate limit exceeded. Try again in ${retryAfter} seconds.`,
      retryAfter,
    }),
    {
      status: 429,
      headers: {
        'Content-Type': 'application/json',
        'X-RateLimit-Limit': '10',
        'X-RateLimit-Remaining': remaining.toString(),
        'X-RateLimit-Reset': reset.toString(),
        'Retry-After': retryAfter.toString(),
      },
    }
  );
}
