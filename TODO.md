# Lo Scalo - To-Do List

> Lista aggiornata delle attività in corso e pianificate.

---

## ✅ Completati (Ultimi 30 giorni)

| Data | Task | Descrizione |
|------|------|-------------|
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

### 🚨 URGENTE - Testing Completo

| Data | Task | Descrizione | Priorità |
|------|------|-------------|----------|
| 2026-03-04 | **Test Report** | Testare tutti i nuovi report (monthly, metrics, complete, accounting) | 🔴 Altissima |
| 2026-03-04 | **Test Funzionalità** | Verificare tutte le funzionalità modificate (timezone, conversione cents/euro) | 🔴 Altissima |
| 2026-03-04 | **Test Date/Timezone** | Verificare gestione date con DST (ora legale/solare), date passate/future | 🔴 Altissima |

**Checklist Testing:**
- [ ] Report Mensile - visualizzazione corretta dati
- [ ] Report Metrics - vista mese/anno, calcoli corretti
- [ ] Report Complete - export Excel/PDF
- [ ] Contabilità Giornaliera - ordini, rimborsi, totali
- [ ] Gift Card - transazioni, scadute
- [ ] Rimborsi - calcolo importi prodotti e GC
- [ ] Date - verificare cambio ora legale/solare
- [ ] Timezone - ordini a cavallo della mezzanotte
- [ ] Cents/Euro - conversioni corrette in tutte le pagine

---

## 📋 Backlog

### 🔥 Priorità Alta

*No high priority tasks*

### 🔶 Priorità Media

~~#### Paginazione Ordini~~ ✅ **COMPLETATO**
- 50 ordini per pagina
- Paginazione separata per ogni tab (Attivi, Archiviati, Annullati)
- Paginazione anche per Gift Cards (Attive, Credito esaurito, Non Disponibili)

### 🔷 Priorità Bassa

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
