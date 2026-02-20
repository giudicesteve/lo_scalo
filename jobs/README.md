# Job: Cleanup Pending Orders (OPZIONALE - Backup)

⚠️ **NOTA**: Questo job è opzionale. Il webhook Stripe gestisce automaticamente la pulizia degli ordini scaduti con idempotenza.

## Quando usarlo

Usa questo job solo se:
- I webhook di Stripe non funzionano (raro)
- Vuoi fare pulizia manuale
- Serve un backup in caso di problemi webhook

## Cosa fa

Per ogni ordine `PENDING_PAYMENT` più vecchio di 30 minuti:
1. ✅ Ripristina disponibilità prodotti
2. ✅ Setta stato a `CANCELLED`
3. ✅ Archivia l'ordine (`isArchived = true`)

## Come eseguire (manuale)

```bash
cd lo-scalo
npx tsx jobs/cleanup-pending-orders.ts
```

Oppure su Windows:
```bash
jobs\run-cleanup.bat
```

## Idempotenza del webhook

Il webhook principale è ora idempotente:
- Se un evento arriva più volte, il secondo viene ignorato
- Controlla sempre lo stato `PENDING_PAYMENT` prima di agire
- Se ordine è già `COMPLETED`, `CANCELLED`, ecc. → salta
