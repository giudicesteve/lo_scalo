# Configurazione Stripe (Sandbox Mode)

## Passaggi per attivare i pagamenti

### 1. Ottieni le chiavi di test da Stripe
1. Vai su https://dashboard.stripe.com/test/apikeys
2. Crea un account Stripe se non l'hai già fatto
3. Copia le chiavi:
   - **Publishable key**: `pk_test_...`
   - **Secret key**: `sk_test_...`

### 2. Aggiorna il file `.env`
```env
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY="pk_test_tua_chiave_pubblica"
STRIPE_SECRET_KEY="sk_test_tua_chiave_segreta"
STRIPE_WEBHOOK_SECRET="whsec_tua_chiave_webhook"
```

### 3. Configura il Webhook (locale con Stripe CLI)
Per testare i webhook localmente:

1. **Installa Stripe CLI**: https://stripe.com/docs/stripe-cli
2. **Login**: `stripe login`
3. **Avvia il forwarding**:
   ```bash
   stripe listen --forward-to localhost:3000/api/stripe/webhook
   ```
4. **Copia il webhook secret** (inizia con `whsec_`) nel file `.env`

### 4. Testa un pagamento
1. Aggiungi prodotti al carrello
2. Procedi al checkout
3. Inserisci email e telefono
4. Verrai reindirizzato alla pagina di pagamento Stripe
5. Usa la carta di test: `4242 4242 4242 4242`
   - Data: qualsiasi data futura
   - CVC: qualsiasi 3 cifre
   - ZIP: qualsiasi

### 5. Verifica lo stato ordine
- In admin (`/admin/orders`) vedrai lo stato dell'ordine aggiornato
- Se il webhook funziona: stato diventa `COMPLETED`
- Se il webhook non è configurato: rimane `PENDING_PAYMENT`

## Stati degli ordini

| Stato | Descrizione | Colore |
|-------|-------------|--------|
| `PENDING_PAYMENT` | In attesa di pagamento | Giallo |
| `PENDING` | Pagato - Da ritirare | Blu |
| `COMPLETED` | Pagato - Da ritirare | Viola |
| `DELIVERED` | Consegnato al cliente | Verde |
| `CANCELLED` | Annullato | Rosso |

## Carte di test utili

| Carta | Risultato |
|-------|-----------|
| `4242 4242 4242 4242` | Pagamento riuscito |
| `4000 0000 0000 9995` | Pagamento rifiutato |
| `4000 0000 0000 3220` | Richiede 3D Secure |

## Note

- In modalità test, i soldi sono virtuali
- Le email di conferma non vengono inviate (a meno che non configuri Resend)
- I webhook sono necessari per aggiornare automaticamente lo stato degli ordini
