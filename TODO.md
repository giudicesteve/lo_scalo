# Lo Scalo - To-Do List

> Lista aggiornata delle attività in corso e pianificate.

---

## ✅ Completati (Ultimi 30 giorni)

| Data | Task | Descrizione |
|------|------|-------------|
| 2026-03-04 | **Testing Completo** | Test di tutti i report, funzionalità, timezone, conversioni cents/euro |
| 2026-03-04 | **POS Gift Cards** | Decoupled da DB, valori hardcoded [10,25,50,75,100,150,200,250,500] |
| 2026-03-03 | **Gift Card Cartacee** | Sistema PG: generazione CSV, attivazione, guida stampa PDF |
| 2026-03-02 | **Paginazione** | 50 item/pagina per Ordini e Gift Cards, separata per tab |
| 2026-03-02 | **Feature Flag System** | 9 flag configurabili, maintenance mode, menu admin dinamico |
| 2026-03-02 | Tab Annullati Ordini | 3 tab in /admin/orders con auto-switch su ricerca |
| 2026-03-02 | Gift Card Non Disponibili | Tab dedicato per GC scadute/cancellate |
| 2026-03-01 | Contabilità con Rimborsi | Pagina rinnovata con ordini + rimborsi unificati |
| 2026-02-28 | Stripe Rimborso Automatico | Rimborso via API Stripe con salvataggio ID |
| 2026-02-27 | Database Currency Migration | Float → Int (cents) per precisione monetaria |
| 2026-02-26 | Complete Report | Report contabile multi-sezione con email |

---

## 🚧 In Progress

*No tasks in progress*

---

## 📋 Backlog

### 🔥 Priorità Alta (Ottimizzazione & Sicurezza)

~~#### Rate Limiting~~ ✅ **COMPLETATO**
- Implementato rate limiting in-memory configurabile via env vars
- Default: 3 req/min pubbliche, 100/min admin, 1000/min webhook
- API protette: orders, refunds, pos/gift-cards, webhook

~~#### Content Security Policy~~ ✅ **COMPLETATO**
- Headers CSP configurati per Stripe, Google OAuth
- Voto A su securityheaders.com
- X-Frame-Options, X-Content-Type-Options, Referrer-Policy attivi

#### Performance Database
- **Fix N+1 Queries**: Ottimizzare order creation e webhook stock restore
- ~~**Indici DB**~~ ✅ **COMPLETATO** - 21 indici applicati su Neon
  - `Order`: 6 indici (ricerca, filtri, report)
  - `GiftCard`: 5 indici (ricerca, filtri tab, scadenze)
  - `Product`, `OrderItem`, `GiftCardTransaction`, `Category`, `Cocktail`, `GiftCardTemplate`
  - Documentazione: `DATABASE_INDEXES.md`
- ~~**Connection Pool**~~ ✅ **COMPLETATO** - Configurato pool Neon (max: 5, timeout: 5s/30s)

#### Performance Database
- **Fix N+1 Queries**: Ottimizzare order creation e webhook stock restore
- **Indici DB**: Aggiungere indici su Order (orderNumber, email, phone) e GiftCard (code, purchasedAt)
- **Connection Pool**: Configurare pool Neon esplicitamente

### 🔶 Priorità Media (Caching & Performance)

- ~~**Cache Headers**~~ ✅ **COMPLETATO** - Cache aggiunta a 5 API pubbliche
- **React Query**: Implementare caching lato client
- ~~**Image Optimization**~~ ✅ **COMPLETATO** - Ottimizzazione abilitata, cache 31 giorni, formati webp/avif
- **Bundle Analyzer**: Analizzare e ottimizzare bundle size

### 🔶 Priorità Media

*No medium priority tasks*

### 🔷 Priorità Bassa

~~#### TypeScript Strict~~ ✅ **COMPLETATO** - `ignoreBuildErrors` rimosso, build passa con strict mode

#### Miglioramenti Webhook (Futuro)
- **Stripe Webhook Idempotency Completa**: Tracciare event ID per prevenire doppie email
  - Problema: Se Stripe ritenta `checkout.session.completed`, email viene inviata di nuovo
  - Soluzione: Tabella `ProcessedStripeEvent` con event ID tracciati
  - Campo aggiuntivo: `Order.processedStripeEventId`
  - Priorità: Bassa (probabilità retry Stripe bassa per bar locale)

#### Shop Enhancements

#### Shop Enhancements
- **Guida alle taglie**: Aggiungere guida taglie nel negozio

#### Gestione Stock
- **Alert automatici**: Notifica email quando prodotto < soglia minima

#### Reportistica Avanzata
- **Export Multi-mese**: Selezione range di mesi per export
- **Dashboard Analytics**: Grafici vendite con trend mensili
- **Report Annuale**: Resoconto annuale con grafici avanzati

#### Policy Legali
- **Editor WYSIWYG**: Sostituire textarea HTML con editor rich text
- **Report accettazioni**: Statistiche su chi ha accettato cosa

- ~~**Health Check**~~ ✅ **COMPLETATO** - Endpoint `/api/health` per monitoraggio
- ~~**Favicon**~~ ✅ **COMPLETATO** - Aggiunto favicon.ico in public/

---

## ✅ Completati - Accessibilità (A11y)

| Data | Task | File modificati |
|------|------|-----------------|
| 2026-03-02 | **Fix A11y Warnings** | Aggiunti `title` e `aria-label` a bottoni e input senza testo/label |

### Dettaglio modifiche:
- `/admin/accounting` - Bottoni navigazione data, input date
- `/admin/gift-cards` - Bottone chiudi modale, input file foto, bottone chiudi fullscreen
- `/admin/pos/gift-cards` - Bottone annulla creazione
- `/admin/reports/metrics` - Bottoni navigazione, input month, select anno
- `/admin/reports/monthly` - Bottoni navigazione, input month
- `/admin/settings/feature-flags` - Fix `aria-checked` valore booleano esplicito
- `/components/admin/refunds/StepSelection` - Checkbox items, bottoni +/- quantità

---

## 🐛 Bugs Noti

*No known bugs at the moment*

---

## 💡 Idee Future

*No ideas at the moment*

---

*Ultimo aggiornamento: 2026-03-04*
