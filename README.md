# Lo Scalo - Craft Drinks by the Lake

Sito web per il cocktail bar "Lo Scalo" sul Lago di Como.

## Stack Tecnologico

- **Framework**: Next.js 14+ (App Router)
- **Styling**: Tailwind CSS
- **Database**: PostgreSQL + Prisma ORM
- **Autenticazione**: NextAuth.js con Google Provider
- **Stato**: Zustand
- **Font**: Euclid Circular B (locale)

## Requisiti

- Node.js 18+
- PostgreSQL 14+

## Installazione

1. **Clona il repository e installa le dipendenze:**

```bash
cd lo-scalo
npm install
```

2. **Configura le variabili d'ambiente:**

Copia il file `.env.example` in `.env` e configura le variabili:

```bash
cp .env.example .env
```

Modifica il file `.env` con i tuoi dati:

```env
# Database
DATABASE_URL="postgresql://user:password@localhost:5432/loscalo?schema=public"

# NextAuth
NEXTAUTH_URL="http://localhost:3000"
NEXTAUTH_SECRET="your-secret-key-here"

# Google OAuth (opzionale per l'admin)
GOOGLE_CLIENT_ID="your-google-client-id"
GOOGLE_CLIENT_SECRET="your-google-client-secret"
```

3. **Configura il database:**

```bash
# Genera il client Prisma
npm run db:generate

# Esegui le migrazioni
npm run db:migrate

# Popola il database con i dati iniziali
npm run db:seed
```

4. **Avvia il server di sviluppo:**

```bash
npm run dev
```

Il sito sarà disponibile all'indirizzo [http://localhost:3000](http://localhost:3000)

## Struttura del Progetto

```
lo-scalo/
├── src/
│   ├── app/                    # Route App Router
│   │   ├── api/                # API Routes
│   │   ├── admin/              # Admin dashboard
│   │   ├── cart/               # Carrello
│   │   ├── gift-card/          # Gift card
│   │   ├── menu/               # Menu cocktail
│   │   ├── shop/               # Negozio
│   │   ├── layout.tsx          # Layout principale
│   │   └── page.tsx            # Landing page
│   ├── components/             # Componenti React
│   ├── lib/                    # Utils e config
│   ├── store/                  # Zustand stores
│   └── types/                  # TypeScript types
├── prisma/
│   ├── schema.prisma           # Schema database
│   └── seed.ts                 # Dati iniziali
├── public/
│   ├── fonts/                  # Font Euclid Circular B
│   └── resources/              # Immagini e assets
└── ...
```

## Funzionalità

### Frontend
- **Landing Page**: Selezione lingua (IT/EN) e navigazione
- **Menu**: Visualizzazione categorie e cocktail con indicazioni stradali
- **Negozio**: Prodotti con selezione taglie e carrello
- **Gift Card**: Acquisto gift card con valori predefiniti
- **Carrello**: Gestione ordini condiviso tra negozio e gift card

### Backend Admin
- **Autenticazione**: Login con Google OAuth
- **Gestione Menu**: Categorie e cocktail (CRUD)
- **Gestione Negozio**: Prodotti e inventario per taglia
- **Gestione Ordini**: Visualizzazione e aggiornamento stato
- **Gestione Gift Card**: Template e verifica saldo

## API Endpoints

### Public
- `GET /api/categories` - Lista categorie e cocktail
- `GET /api/products` - Lista prodotti
- `GET /api/gift-card-templates` - Lista gift card disponibili
- `POST /api/orders` - Crea nuovo ordine

### Admin (richiede autenticazione)
- `GET/POST/PUT/DELETE /api/admin/categories` - Gestione categorie
- `GET/POST/PUT/DELETE /api/admin/cocktails` - Gestione cocktail
- `GET/POST/PUT/DELETE /api/admin/products` - Gestione prodotti
- `GET/PUT /api/admin/orders` - Gestione ordini
- `GET/POST/PUT/DELETE /api/admin/gift-card-templates` - Template gift card

## Script Disponibili

- `npm run dev` - Avvia server di sviluppo
- `npm run build` - Build di produzione
- `npm run start` - Avvia server di produzione
- `npm run db:generate` - Genera client Prisma
- `npm run db:migrate` - Esegui migrazioni database
- `npm run db:seed` - Popola database con dati iniziali
- `npm run db:studio` - Apri Prisma Studio

## Configurazione Stripe (produzione)

Per abilitare i pagamenti reali:

1. Crea un account su [Stripe](https://stripe.com)
2. Ottieni le API keys
3. Aggiorna il file `.env`:

```env
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY="pk_live_..."
STRIPE_SECRET_KEY="sk_live_..."
```

4. Implementa l'integrazione Stripe nel componente checkout

## Configurazione Email (produzione)

Il progetto utilizza Resend per l'invio email. Configura:

```env
RESEND_API_KEY="your-resend-api-key"
```

## Note

- Il sito è ottimizzato per mobile (design mobile-first)
- Il mock di Stripe è attivo per i test
- Le immagini dei prodotti vanno inserite in `public/resources/`

## Licenza

Proprietà di Lo Scalo.
