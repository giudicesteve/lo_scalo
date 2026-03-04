# Database Indexes - Piano di Ottimizzazione

> Data: 2026-03-04
> Stato: Pronto per migrazione

---

## 📊 Sintesi Indici Aggiunti

| Tabella | # Indici | Query Ottimizzate |
|---------|----------|-------------------|
| **Order** | 6 | Ricerca ordini, filtri tab, report giornalieri |
| **GiftCard** | 5 | Ricerca GC, filtri tab, cron scadenze |
| **OrderItem** | 2 | Restore stock, report prodotti |
| **Product** | 2 | Filtro catalogo, soft delete |
| **GiftCardTransaction** | 2 | Report transazioni mensili |
| **Category** | 2 | Menu pubblico |
| **Cocktail** | 1 | Menu per categoria |
| **GiftCardTemplate** | 1 | Shop GC |

**Totale: 21 nuovi indici**

---

## 🔍 Dettaglio per Tabella

### Order (6 indici)

```prisma
@@index([orderNumber])        // Ricerca per numero ordine
@@index([email])              // Ricerca per email cliente
@@index([phone])              // Ricerca per telefono
@@index([status, isArchived]) // Filtri tab Attivi/Archiviati/Annullati
@@index([createdAt])          // Ordinamento cronologico
@@index([paidAt])             // Report giornalieri/mensili
@@index([orderSource])        // Filtro Online vs Manuale
```

**Query Ottimizzate:**
- `/admin/orders?search=2026-0001` → Ricerca istantanea
- `/admin/orders?tab=archived` → Filtro senza scan completo
- `/admin/accounting?date=2026-03-04` → Report veloce

---

### GiftCard (5 indici)

```prisma
@@index([code])                    // Ricerca per codice
@@index([purchasedAt])             // Ordinamento cronologico
@@index([remainingValue])          // Filtro tab "Attive"
@@index([isExpired, isSoftDeleted]) // Filtro tab "Non Disponibili"
@@index([expiresAt])               // Cron job disattivazione
```

**Query Ottimizzate:**
- `/admin/gift-cards?search=GC-ABC123` → Ricerca istantanea
- `/admin/gift-cards?tab=active` → Filtro credito > 0
- `/admin/gift-cards?tab=unavailable` → Filtro scadute/cancellate

---

### OrderItem (2 indici)

```prisma
@@index([orderId])   // Restore stock, refunds
@@index([productId]) // Report prodotti venduti
```

**Query Ottimizzate:**
- Webhook `restoreStock()` → Join veloce
- Report prodotti più venduti

---

### Product (2 indici)

```prisma
@@index([isActive, isDeleted]) // Catalogo pubblico
@@index([isDeleted, deletedAt]) // Admin prodotti eliminati
```

**Query Ottimizzate:**
- `/shop` → Solo prodotti attivi non eliminati
- `/admin/shop` → Ordinamento per data eliminazione

---

### GiftCardTransaction (2 indici)

```prisma
@@index([giftCardId]) // Storico transazioni GC
@@index([createdAt])  // Report mensili
```

**Query Ottimizzate:**
- Modal uso GC → Transazioni veloci
- Report transazioni mensili

---

### Category (2 indici)

```prisma
@@index([isActive]) // Menu pubblico
@@index([order])    // Ordinamento categorie
```

**Query Ottimizzate:**
- `/menu` → Categorie attive in ordine

---

### Cocktail (1 indice)

```prisma
@@index([isActive, categoryId]) // Menu per categoria
```

**Query Ottimizzate:**
- `/menu` → Cocktail attivi filtrati per categoria

---

### GiftCardTemplate (1 indice)

```prisma
@@index([isActive]) // Shop GC
```

**Query Ottimizzate:**
- `/gift-card` → Template attivi

---

## 🚀 Comandi per Applicare

### 1. Generare migration Prisma

```bash
npx prisma migrate dev --name add_performance_indexes
```

### 2. Verificare indici creati (PostgreSQL)

```sql
-- Lista indici per tabella
SELECT indexname, indexdef 
FROM pg_indexes 
WHERE tablename = 'Order';

-- Verificare uso indici
EXPLAIN ANALYZE 
SELECT * FROM "Order" 
WHERE "status" = 'COMPLETED' AND "isArchived" = false;
-- Dovrebbe mostrare: "Index Scan using Order_status_isArchived_idx"
```

### 3. Verificare performance

```sql
-- Dimensione indici
SELECT 
  tablename,
  indexname,
  pg_size_pretty(pg_relation_size(indexname::regclass)) as size
FROM pg_indexes
WHERE schemaname = 'public'
ORDER BY pg_relation_size(indexname::regclass) DESC;
```

---

## ⚠️ Note Importanti

### Trade-off
- **Pro**: Query molto più veloci (da secondi a millisecondi)
- **Contro**: Leggero overhead in scrittura (INSERT/UPDATE più lenti)
- **Bilanciamento**: Per un e-commerce, le letture sono molto più frequenti delle scritture

### Indici Esistenti (Non modificare)
- Primary Keys (`@id`) → Già indicizzati automaticamente
- Unique constraints (`@unique`) → Già indicizzati automaticamente
- Foreign keys (`@relation`) → Prisma li indica implicitamente ma meglio esplicitare

### Monitoraggio Post-Migrazione
Dopo aver applicato gli indici, monitorare:
1. Tempo di risposta API admin (ordini, gift cards)
2. Utilizzo CPU database
3. Eventuali errori di query

---

## 📈 Impact Atteso

| Sezione | Miglioramento |
|---------|---------------|
| Ricerca ordini | 10x-100x più veloce |
| Filtri tab | Da scan completo a index scan |
| Report giornalieri | Da secondi a millisecondi |
| Menu pubblico | Caricamento istantaneo |
| Cron scadenze GC | Elaborazione più veloce |

---

*Ultimo aggiornamento: 2026-03-04*
