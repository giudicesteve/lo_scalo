/**
 * Cache Configuration
 * 
 * Configurazione centralizzata dei tempi di cache per le API.
 * Tutti i valori sono sovrascrivibili tramite variabili d'ambiente.
 * 
 * Esempio .env:
 * CACHE_CATEGORIES_TTL=300
 * CACHE_PRODUCTS_TTL=60
 * CACHE_GIFT_CARDS_TTL=300
 * CACHE_FEATURE_FLAGS_TTL=60
 * CACHE_POLICIES_TTL=300
 */

function parseIntEnv(value: string | undefined, defaultValue: number): number {
  if (!value) return defaultValue;
  const parsed = parseInt(value, 10);
  return isNaN(parsed) || parsed < 0 ? defaultValue : parsed;
}

/**
 * Tempi di cache per API pubbliche (in secondi)
 */
export const cacheConfig = {
  /**
   * Menu categorie/cocktail
   * Default: 300s (5 minuti)
   */
  categories: {
    ttl: parseIntEnv(process.env.CACHE_CATEGORIES_TTL, 300),
    staleWhileRevalidate: parseIntEnv(process.env.CACHE_CATEGORIES_STALE, 3600),
  },

  /**
   * Prodotti shop
   * Default: 60s (1 minuto) - stock può cambiare
   */
  products: {
    ttl: parseIntEnv(process.env.CACHE_PRODUCTS_TTL, 60),
    staleWhileRevalidate: parseIntEnv(process.env.CACHE_PRODUCTS_STALE, 300),
  },

  /**
   * Template gift card
   * Default: 300s (5 minuti)
   */
  giftCardTemplates: {
    ttl: parseIntEnv(process.env.CACHE_GIFT_CARDS_TTL, 300),
    staleWhileRevalidate: parseIntEnv(process.env.CACHE_GIFT_CARDS_STALE, 3600),
  },

  /**
   * Feature flags
   * Default: 60s (1 minuto) - toggle può cambiare
   */
  featureFlags: {
    ttl: parseIntEnv(process.env.CACHE_FEATURE_FLAGS_TTL, 60),
    staleWhileRevalidate: parseIntEnv(process.env.CACHE_FEATURE_FLAGS_STALE, 300),
  },

  /**
   * Policy legali
   * Default: 300s (5 minuti)
   */
  policies: {
    ttl: parseIntEnv(process.env.CACHE_POLICIES_TTL, 300),
    // Note: policies usa max-age (client-side) perché force-dynamic
  },
} as const;

/**
 * Genera header Cache-Control per API con stale-while-revalidate
 */
export function generateCacheHeaders(
  ttl: number,
  staleWhileRevalidate: number
): { 'Cache-Control': string } {
  return {
    'Cache-Control': `public, s-maxage=${ttl}, stale-while-revalidate=${staleWhileRevalidate}`,
  };
}

/**
 * Log della configurazione cache (solo in development)
 */
export function logCacheConfig(): void {
  if (process.env.NODE_ENV === 'development') {
    console.log('═'.repeat(50));
    console.log('📊 Cache Configuration');
    console.log('═'.repeat(50));
    
    Object.entries(cacheConfig).forEach(([key, config]) => {
      const envVar = `CACHE_${key.toUpperCase()}_TTL`;
      const source = process.env[envVar] ? 'ENV' : 'DEFAULT';
      const staleInfo = 'staleWhileRevalidate' in config 
        ? ` / ${config.staleWhileRevalidate}s (stale-while-revalidate)`
        : '';
      console.log(`${key}: ${config.ttl}s (s-maxage)${staleInfo} (${source})`);
    });
    
    console.log('═'.repeat(50));
  }
}
