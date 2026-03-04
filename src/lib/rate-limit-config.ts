/**
 * Rate Limiting Configuration
 * 
 * Configurazioni centralizzate che possono essere sovrascritte
 * tramite environment variables.
 * 
 * Esempio .env:
 * RATE_LIMIT_PUBLIC_API=10
 * RATE_LIMIT_PUBLIC_WINDOW=60
 * RATE_LIMIT_ADMIN_API=100
 * RATE_LIMIT_ADMIN_WINDOW=60
 */

function parseIntEnv(value: string | undefined, defaultValue: number): number {
  if (!value) return defaultValue;
  const parsed = parseInt(value, 10);
  return isNaN(parsed) ? defaultValue : parsed;
}

/**
 * Configurazioni Rate Limiting
 * 
 * Tutte le configurazioni possono essere sovrascritte
 * tramite variabili d'ambiente.
 */
export const rateLimitEnvConfig = {
  /**
   * API Pubbliche (creazione ordini, cancellazione)
   * Default: 3 richieste per minuto (nessuno fa più di 3 ordini in 60s legittimamente)
   */
  publicApi: {
    limit: parseIntEnv(process.env.RATE_LIMIT_PUBLIC_API, 3),
    windowInSeconds: parseIntEnv(process.env.RATE_LIMIT_PUBLIC_WINDOW, 60),
  },

  /**
   * API Admin (operazioni sensibili)
   * Default: 100 richieste per minuto
   */
  adminApi: {
    limit: parseIntEnv(process.env.RATE_LIMIT_ADMIN_API, 100),
    windowInSeconds: parseIntEnv(process.env.RATE_LIMIT_ADMIN_WINDOW, 60),
  },

  /**
   * Webhook Stripe (molto permissivo)
   * Default: 1000 richieste per minuto
   */
  webhook: {
    limit: parseIntEnv(process.env.RATE_LIMIT_WEBHOOK, 1000),
    windowInSeconds: parseIntEnv(process.env.RATE_LIMIT_WEBHOOK_WINDOW, 60),
  },

  /**
   * Auth (login) - anti brute force
   * Default: 5 tentativi per minuto
   */
  auth: {
    limit: parseIntEnv(process.env.RATE_LIMIT_AUTH, 5),
    windowInSeconds: parseIntEnv(process.env.RATE_LIMIT_AUTH_WINDOW, 60),
  },
} as const;

/**
 * Restituisce la configurazione effettiva per il tipo specificato
 * con messaggi di log per debug
 */
export function getRateLimitConfig(
  type: keyof typeof rateLimitEnvConfig
): { limit: number; windowInSeconds: number } {
  const config = rateLimitEnvConfig[type];
  
  // Log in development per vedere quale config viene usata
  if (process.env.NODE_ENV === 'development') {
    console.log(`[RATE LIMIT] Using ${type} config:`, config);
  }
  
  return config;
}

/**
 * Verifica se il rate limiting è abilitato
 * Disabilitabile in sviluppo o per testing
 */
export function isRateLimitingEnabled(): boolean {
  return process.env.RATE_LIMITING_ENABLED !== 'false';
}

/**
 * Stampa la configurazione attuale (utile per debug all'avvio)
 */
export function logRateLimitConfig(): void {
  console.log('═'.repeat(50));
  console.log('📊 Rate Limiting Configuration');
  console.log('═'.repeat(50));
  
  Object.entries(rateLimitEnvConfig).forEach(([key, config]) => {
    const envVarLimit = {
      publicApi: 'RATE_LIMIT_PUBLIC_API',
      adminApi: 'RATE_LIMIT_ADMIN_API',
      webhook: 'RATE_LIMIT_WEBHOOK',
      auth: 'RATE_LIMIT_AUTH',
    }[key];
    
    const envVarWindow = {
      publicApi: 'RATE_LIMIT_PUBLIC_WINDOW',
      adminApi: 'RATE_LIMIT_ADMIN_WINDOW',
      webhook: 'RATE_LIMIT_WEBHOOK_WINDOW',
      auth: 'RATE_LIMIT_AUTH_WINDOW',
    }[key];
    
    const limitSource = envVarLimit && process.env[envVarLimit] ? 'ENV' : 'DEFAULT';
    const windowSource = envVarWindow && process.env[envVarWindow] ? 'ENV' : 'DEFAULT';
    
    console.log(`${key}:`);
    console.log(`  Limit: ${config.limit}/min (${limitSource})`);
    console.log(`  Window: ${config.windowInSeconds}s (${windowSource})`);
  });
  
  console.log(`Enabled: ${isRateLimitingEnabled()}`);
  console.log('═'.repeat(50));
}
