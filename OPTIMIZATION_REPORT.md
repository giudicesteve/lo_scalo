# Lo Scalo - Rapporto di Ottimizzazione

> Analisi completa basata su Context7 (Next.js 16, Prisma 7, Stripe) e review del codice
> **Data analisi**: 2026-03-04

---

## 📊 Sintesi delle Priorità

| Categoria | Priorità | Stima Impact | Stima Sforzo |
|-----------|----------|--------------|--------------|
| 🔴 **Critico** | Sicurezza API, Rate Limiting | Alto | Medio |
| 🟠 **Alto** | Performance DB, N+1 Queries | Alto | Medio |
| 🟡 **Medio** | Caching, Image Optimization | Medio | Basso |
| 🟢 **Basso** | DX, Monitoring | Medio | Basso |

---

## 🔴 CRITICO - Sicurezza

### 1. Rate Limiting Mancante
**Problema**: Nessun rate limiting su API pubbliche e admin
**Rischio**: Vulnerabile a brute force, DoS, abuse

**Endpoint vulnerabili**:
- `/api/orders` (POST) - Creazione ordini
- `/api/admin/*` - Tutte le API admin
- `/api/stripe/webhook` - Webhook (ma qui è meno critico)

**Soluzione proposta**:
```typescript
// Install: npm install @upstash/ratelimit @upstash/redis
// o implementazione custom con Redis/memory

// src/lib/rate-limit.ts
import { Ratelimit } from "@upstash/ratelimit";
import { Redis } from "@upstash/redis";

const ratelimit = new Ratelimit({
  redis: Redis.fromEnv(),
  limiter: Ratelimit.slidingWindow(10, "10 s"),
});

// Per API admin (più restrittivo)
const adminRatelimit = new Ratelimit({
  redis: Redis.fromEnv(),
  limiter: Ratelimit.slidingWindow(50, "1 m"),
});
```

**Priorità**: 🔴 Alta | **Stima**: 4-6 ore

---

### 2. Content Security Policy (CSP) Mancante
**Problema**: Nessun header CSP configurato
**Rischio**: XSS attacks, data injection

**Soluzione** (in `next.config.ts`):
```typescript
async headers() {
  return [
    {
      source: '/:path*',
      headers: [
        {
          key: 'Content-Security-Policy',
          value: [
            "default-src 'self'",
            "script-src 'self' 'unsafe-inline' 'unsafe-eval' https://js.stripe.com",
            "style-src 'self' 'unsafe-inline'",
            "img-src 'self' blob: data: https://*.stripe.com",
            "connect-src 'self' https://api.stripe.com",
            "frame-src https://js.stripe.com https://hooks.stripe.com",
          ].join('; '),
        },
        {
          key: 'X-Frame-Options',
          value: 'DENY',
        },
        {
          key: 'X-Content-Type-Options',
          value: 'nosniff',
        },
        {
          key: 'Referrer-Policy',
          value: 'strict-origin-when-cross-origin',
        },
      ],
    },
  ];
}
```

**Priorità**: 🔴 Alta | **Stima**: 2-3 ore

---

### 3. Webhook Idempotency Key
**Problema**: Gli webhook Stripe non tracciano l'event ID per idempotenza
**File**: `src/app/api/stripe/webhook/route.ts`

**Rischio**: Doppio processamento se Stripe ritenta

**Soluzione**:
```typescript
// Aggiungi in Prisma schema
model ProcessedEvent {
  id        String   @id
  eventId   String   @unique
  type      String
  processedAt DateTime @default(now())
  
  @@index([processedAt])
}

// Nel webhook handler
const eventId = event.id;
const existing = await prisma.processedEvent.findUnique({
  where: { eventId }
});
if (existing) {
  return NextResponse.json({ received: true, alreadyProcessed: true });
}
// ... processa evento ...
await prisma.processedEvent.create({ data: { eventId, type: event.type } });
```

**Priorità**: 🔴 Alta | **Stima**: 2-3 ore

---

## 🟠 ALTO - Performance Database

### 4. N+1 Query Problem
**Problema**: Molte query annidate nei loop
**Esempi trovati**:

In `src/app/api/orders/route.ts`:
```typescript
// RIGHE 147-197 - Loop con query individuali
for (const item of productItems) {
  const product = await prisma.product.findFirst({...}); // ❌ N+1
}

// RIGHE 217-250 - Loop con update individuali
for (const item of productItems) {
  await tx.productVariant.update({...}); // ❌ N+1
}
```

**Soluzione**:
```typescript
// Pre-fetch tutti i prodotti in una query
const productIds = productItems.map(i => i.id);
const products = await tx.product.findMany({
  where: { id: { in: productIds } },
  include: { ProductVariant: true },
});
const productMap = new Map(products.map(p => [p.id, p]));

// Ora accedi dal Map
for (const item of productItems) {
  const product = productMap.get(item.id); // ✅ O(1)
}
```

**Priorità**: 🟠 Alta | **Stima**: 4-6 ore | **Impact**: Riduce query del 70-90%

---

### 5. Indici Mancanti sulle Query di Ricerca
**Problema**: Ricerche testuali (`contains`, `mode: 'insensitive'`) su grandi tabelle senza indici

**File analizzati**:
- `/api/admin/orders` - ricerca su `orderNumber`, `email`, `phone`
- `/api/admin/gift-cards` - ricerca su `code`, `email`, `orderNumber`

**Soluzione** (Prisma schema):
```prisma
model Order {
  // ... existing fields ...
  
  @@index([orderNumber])
  @@index([email])
  @@index([phone])
  @@index([status, isArchived])
  @@index([createdAt]) // Per ORDER BY
}

model GiftCard {
  // ... existing fields ...
  
  @@index([code])
  @@index([purchasedAt]) // Per ORDER BY
  @@index([isExpired, isSoftDeleted]) // Per filtro tab
}
```

**Priorità**: 🟠 Alta | **Stima**: 1-2 ore + migration | **Impact**: Query da secondi a millisecondi

---

### 6. Connection Pool Tuning
**Problema**: Nessuna configurazione esplicita del connection pool Neon
**File**: `src/lib/prisma.ts`

**Soluzione**:
```typescript
const adapter = new PrismaNeon({ 
  connectionString,
  // Ottimizza per Vercel serverless
  max: 10,              // Max connections
  connectionTimeoutMillis: 5000,
  idleTimeoutMillis: 30000,
});
```

**Priorità**: 🟠 Alta | **Stima**: 1 ora | **Impact**: Previene pool exhaustion

---

## 🟡 MEDIO - Caching & Performance

### 7. Caching API Pubbliche
**Problema**: API pubbliche senza cache headers
**Esempi**: `/api/categories`, `/api/products`

**Soluzione**:
```typescript
// src/app/api/categories/route.ts
export async function GET() {
  const categories = await prisma.category.findMany({...});
  
  return NextResponse.json(categories, {
    headers: {
      'Cache-Control': 'public, s-maxage=60, stale-while-revalidate=300',
    },
  });
}
```

**Priorità**: 🟡 Media | **Stima**: 2-3 ore | **Impact**: Riduce DB load

---

### 8. React Query / SWR per Client Data Fetching
**Problema**: Nessun caching lato client per dati frequenti

**Soluzione**:
```bash
npm install @tanstack/react-query
```

Setup per feature flags, configurazioni, etc.:
```typescript
// Cache feature flags per 5 minuti
const { data: flags } = useQuery({
  queryKey: ['feature-flags'],
  queryFn: fetchFeatureFlags,
  staleTime: 5 * 60 * 1000,
});
```

**Priorità**: 🟡 Media | **Stima**: 4-6 ore | **Impact**: Migliora UX, riduce API calls

---

### 9. Image Optimization
**Problema**: `unoptimized: true` in next.config.ts

**Soluzione**:
```typescript
// next.config.ts
images: {
  unoptimized: false, // ✅ Abilita ottimizzazione
  minimumCacheTTL: 2678400, // 31 giorni
  formats: ['image/webp', 'image/avif'],
  remotePatterns: [
    // Aggiungi domini se usi immagini esterne
  ],
}
```

**Nota**: Richiede Vercel Image Optimization o configurazione self-hosted

**Priorità**: 🟡 Media | **Stima**: 1-2 ore | **Impact**: Riduce bandwidth 30-50%

---

### 10. Bundle Size Optimization
**Problema**: Nessuna analisi del bundle

**Soluzione**:
```bash
# Installa bundle analyzer
npm install -D @next/bundle-analyzer
```

```typescript
// next.config.ts
const withBundleAnalyzer = require('@next/bundle-analyzer')({
  enabled: process.env.ANALYZE === 'true',
});

module.exports = withBundleAnalyzer(nextConfig);
```

**Priorità**: 🟡 Media | **Stima**: 2 ore | **Impact**: Identifica librerie pesanti

---

## 🟢 BASSO - DX & Monitoring

### 11. Error Tracking (Sentry)
**Problema**: Nessun tracking errori in produzione

**Soluzione**:
```bash
npx @sentry/wizard@latest -i nextjs
```

**Priorità**: 🟢 Bassa | **Stima**: 2-3 ore | **Impact**: Debugging produzione

---

### 12. Logging Strutturato
**Problema**: Console.log sparsi, nessun formato strutturato

**Soluzione**:
```typescript
// src/lib/logger.ts
import pino from 'pino';

export const logger = pino({
  level: process.env.LOG_LEVEL || 'info',
  transport: process.env.NODE_ENV === 'development' 
    ? { target: 'pino-pretty' }
    : undefined,
  base: {
    service: 'lo-scalo-api',
    env: process.env.NODE_ENV,
  },
});

// Uso
logger.info({ orderId, total }, 'Order created');
logger.error({ err, orderId }, 'Order failed');
```

**Priorità**: 🟢 Bassa | **Stima**: 3-4 ore | **Impact**: Debugging più facile

---

### 13. Health Check Endpoint
**Problema**: Nessun endpoint per monitoring

**Soluzione**:
```typescript
// src/app/api/health/route.ts
export async function GET() {
  const checks = await Promise.all([
    checkDatabase(),
    checkStripe(),
    checkRedis(), // se aggiungi Redis
  ]);
  
  const healthy = checks.every(c => c.healthy);
  
  return NextResponse.json(
    { status: healthy ? 'ok' : 'degraded', checks },
    { status: healthy ? 200 : 503 }
  );
}
```

**Priorità**: 🟢 Bassa | **Stima**: 1 ora | **Impact**: Monitoring uptime

---

### 14. TypeScript Strict Mode
**Problema**: `ignoreBuildErrors: true` nel config

**Soluzione**:
```typescript
// tsconfig.json
{
  "compilerOptions": {
    "strict": true,
    // ... altre opzioni
  }
}
```

Rimuovi anche dal next.config.ts:
```typescript
typescript: {
  ignoreBuildErrors: false, // ✅ Rimosso
},
```

**Priorità**: 🟢 Bassa | **Stima**: 4-8 ore (fix errori) | **Impact**: Cattura bug a compile time

---

## 📋 Piano d'Azione Raccomandato

### Sprint 1 (Sicurezza) - 2-3 giorni
1. ✅ Implementare CSP headers
2. ✅ Aggiungere rate limiting (Upstash Redis)
3. ✅ Webhook idempotency key

### Sprint 2 (Performance DB) - 2-3 giorni
4. ✅ Fix N+1 queries in order creation
5. ✅ Aggiungere indici mancanti
6. ✅ Tune connection pool

### Sprint 3 (Caching & UX) - 2 giorni
7. ✅ Cache headers per API pubbliche
8. ✅ Aggiungere React Query
9. ✅ Abilitare image optimization

### Sprint 4 (Monitoring) - 1-2 giorni
10. ✅ Setup Sentry
11. ✅ Logging strutturato
12. ✅ Health check endpoint

---

## 📈 Metriche di Successo

| Metrica | Target | Come Misurare |
|---------|--------|---------------|
| API Response Time (p95) | < 200ms | Vercel Analytics |
| DB Query Time (p95) | < 50ms | Prisma logs |
| Lighthouse Performance | > 90 | Lighthouse CI |
| Error Rate | < 0.1% | Sentry |
| Bundle Size | < 200KB (initial) | Bundle analyzer |

---

## 🔧 Quick Wins (Immediati)

Questi possono essere fatti subito (30 min - 1 ora ciascuno):

1. **Aggiungere indici DB** - Migration Prisma veloce
2. **Cache headers API pubbliche** - Aggiungere headers alle response
3. **Rimuovere ignoreBuildErrors** - Fix eventuali errori TS
4. **CSP headers base** - Copia/incolla configurazione

---

*Report generato con Context7 (Next.js 16.1.6, Prisma 7.4, Stripe API)*
*Ultimo aggiornamento: 2026-03-04*
