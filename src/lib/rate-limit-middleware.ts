/**
 * Rate Limiting Middleware - Wrapper per API Routes
 * 
 * Uso:
 * ```typescript
 * import { withRateLimit, rateLimitConfigs } from '@/lib/rate-limit-middleware';
 * 
 * export async function POST(req: Request) {
 *   const rateLimitResponse = await withRateLimit(req, rateLimitConfigs.publicApi);
 *   if (rateLimitResponse) return rateLimitResponse;
 *   
 *   // ... resto della logica ...
 * }
 * ```
 */

import {
  rateLimit,
  getIdentifier,
  createRateLimitResponse,
  rateLimitConfigs,
  type RateLimitConfig,
} from './rate-limit';

export { rateLimitConfigs };

/**
 * Applica rate limiting a una request
 * 
 * @param req - La Request Next.js
 * @param config - Configurazione rate limiting
 * @returns Response 429 se rate limit exceeded, null altrimenti
 */
export function withRateLimit(
  req: Request,
  config: RateLimitConfig
): Response | null {
  const identifier = getIdentifier(req);
  const result = rateLimit(identifier, config);

  if (!result.success) {
    console.warn(`[RATE LIMIT] Blocked request from ${identifier}`);
    return createRateLimitResponse(result.remaining, result.reset);
  }

  // Log per debug (solo in development)
  if (process.env.NODE_ENV === 'development') {
    console.log(
      `[RATE LIMIT] ${identifier}: ${result.remaining}/${result.limit} remaining`
    );
  }

  return null;
}

/**
 * Versione per API Routes che accetta anche custom identifier
 * Utile per rate limiting basato su user ID (autenticato)
 */
export function withRateLimitCustom(
  identifier: string,
  config: RateLimitConfig
): { blocked: false } | { blocked: true; response: Response } {
  const result = rateLimit(identifier, config);

  if (!result.success) {
    console.warn(`[RATE LIMIT] Blocked request from ${identifier}`);
    return {
      blocked: true,
      response: createRateLimitResponse(result.remaining, result.reset),
    };
  }

  return { blocked: false };
}
