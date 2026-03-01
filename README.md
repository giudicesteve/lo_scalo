# Lo Scalo - Craft Drinks by the Lake

[![Next.js](https://img.shields.io/badge/Next.js-14+-000000?logo=next.js)](https://nextjs.org/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.0+-3178C6?logo=typescript)](https://www.typescriptlang.org/)
[![Tailwind CSS](https://img.shields.io/badge/Tailwind-3.0+-06B6D4?logo=tailwindcss)](https://tailwindcss.com/)
[![Prisma](https://img.shields.io/badge/Prisma-5.0+-2D3748?logo=prisma)](https://www.prisma.io/)
[![PostgreSQL](https://img.shields.io/badge/PostgreSQL-14+-4169E1?logo=postgresql)](https://www.postgresql.org/)
[![Stripe](https://img.shields.io/badge/Stripe-Payments-635BFF?logo=stripe)](https://stripe.com/)
[![License](https://img.shields.io/badge/License-Proprietary-ff69b4)](LICENSE)

> A full-stack e-commerce platform for **Lo Scalo**, a cocktail bar on Lake Como, Italy. Built with Next.js, TypeScript, Stripe, and PostgreSQL.

---

## Features

### Customer Experience
- **Bilingual Support**: Full Italian and English language support with persistence
- **Digital Menu**: Browse cocktails organized by categories with detailed descriptions
- **Online Shop**: Purchase merchandise with size selection and stock checking
- **Gift Cards**: Buy digital gift cards (€50, €100, €200) with QR codes and PDF delivery
- **Secure Payments**: Stripe Checkout with 30-minute payment sessions
- **Email Confirmations**: Automated order confirmations with Resend
- **Mobile-First**: Optimized for mobile, tablet, and desktop

### Admin Dashboard
- **Secure Login**: Google OAuth with role-based access control
- **Order Management**: Track orders from payment to delivery with status workflow
- **Gift Card Management**: Activate, redeem, and track gift card usage with receipt upload
- **Refund System**: Process partial refunds for products and full refunds for gift cards
- **Reports & Analytics**: 
  - Daily accounting reports with Excel/PDF export
  - Monthly reports with orders AND refunds (net revenue calculation)
  - **Complete Report**: All reports combined in single Excel/PDF file
  - Top/bottom sellers metrics
  - Gift card transaction reports
  - Expired gift cards tracking
  - Email delivery of complete reports with both Excel and PDF attachments
- **Menu Management**: CRUD for cocktail categories and items
- **Shop Management**: Product inventory with multi-size support
- **Legal Policies**: Versioned Terms, Privacy, and Cookie policies (IT/EN)
- **Settings**: Gift card expiry configuration, user management

### Technical Highlights
- **Real-time Stock**: Atomic stock reservation during checkout
- **Idempotent Webhooks**: Safe Stripe webhook handling with duplicate prevention
- **Gift Card Expiry**: Automated daily cron job for expiration handling
- **Policy Versioning**: Database-driven legal documents with acceptance tracking
- **Responsive Design**: Tailwind CSS with custom Euclid Circular B font

---

## Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                         CLIENT LAYER                            │
├─────────────────────────────────────────────────────────────────┤
│  Public Pages        │  Cart (Zustand)      │  Admin Panel      │
│  • Landing           │  • Persist to        │  • Dashboard      │
│  • Menu              │    localStorage      │  • Orders         │
│  • Shop              │  • Stripe Checkout   │  • Gift Cards     │
│  • Gift Cards        │    integration       │  • Reports        │
│  • Checkout          │                      │  • Settings       │
└──────────┬──────────────────────────────────────┬───────────────┘
           │                                      │
           ▼                                      ▼
┌───────────────────────────────────────────────────────────────────┐
│                      NEXT.JS API LAYER                            │
├───────────────────────────────────────────────────────────────────┤
│  Public API          │  Admin API             │  Webhooks         │
│  • /api/products     │  • /api/admin/orders   │  • Stripe events  │
│  • /api/menu         │  • /api/admin/shop     │  • Cron jobs      │
│  • /api/orders       │  • /api/admin/reports  │                   │
│                      │  • /api/admin/refunds  │                   │
└──────────┬──────────────────────────────────────┬─────────────────┘
           │                                      │
           ▼                                      ▼
┌──────────────────────────────────────────────────────────────────┐
│                    SERVICE LAYER                                 │
├──────────────────────────────────────────────────────────────────┤
│  Stripe             │  Resend              │  Prisma ORM         │
│  • Checkout         │  • Order emails      │  • PostgreSQL       │
│  • Webhooks         │  • Gift card PDFs    │  • Migrations       │
│  • Refunds          │  • Admin alerts      │  • Transactions     │
└──────────────────────────────────────────────────────────────────┘
```

---

## Getting Started

### Prerequisites

- **Node.js** 18.x or higher
- **PostgreSQL** 14.x or higher (or use [Neon](https://neon.tech) for serverless)
- **Stripe Account** (test mode for development)
- **Google OAuth Credentials** (for admin login)
- **Resend Account** (for email sending)

### Installation

1. **Clone the repository**

```bash
git clone https://github.com/yourusername/lo-scalo.git
cd lo-scalo
```

2. **Install dependencies**

```bash
npm install
```

3. **Set up environment variables**

```bash
cp .env.example .env
```

Edit `.env` with your configuration (see [Environment Variables](#-environment-variables) below).

4. **Set up the database**

```bash
# Generate Prisma client
npm run db:generate

# Run migrations
npm run db:migrate

# Seed initial data (optional)
npm run db:seed
```

5. **Run the development server**

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser.

6. **Set up Stripe webhooks (for local development)**

```bash
# Install Stripe CLI: https://stripe.com/docs/stripe-cli

# Login to Stripe
stripe login

# Forward webhooks to your local server
stripe listen --forward-to localhost:3000/api/webhooks/stripe

# Copy the webhook signing secret to your .env file
```

---

## Environment Variables

Create a `.env` file with the following variables:

### Required

| Variable | Description | Example |
|----------|-------------|---------|
| `DATABASE_URL` | PostgreSQL connection string | `postgresql://user:pass@host/db?sslmode=require` |
| `NEXTAUTH_URL` | Your app URL | `http://localhost:3000` |
| `NEXTAUTH_SECRET` | Random secret for JWT | `your-secret-min-32-chars` |
| `GOOGLE_CLIENT_ID` | Google OAuth client ID | `123-abc.apps.googleusercontent.com` |
| `GOOGLE_CLIENT_SECRET` | Google OAuth secret | `GOCSPX-...` |
| `STRIPE_SECRET_KEY` | Stripe secret key | `sk_test_...` or `sk_live_...` |
| `STRIPE_WEBHOOK_SECRET` | Stripe webhook secret | `whsec_...` |
| `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY` | Stripe public key | `pk_test_...` or `pk_live_...` |
| `RESEND_API_KEY` | Resend API key | `re_...` |

### Optional

| Variable | Description | Default |
|----------|-------------|---------|
| `CRON_SECRET` | Secret for cron job authentication | - |
| `ADMIN_EMAIL` | Fallback admin email | - |
| `NODE_ENV` | Environment mode | `development` |

---

## Testing

### Stripe Test Cards

Use these cards for testing payments:

| Card Number           | Scenario                               |
|-----------------------|----------------------------------------|
| `4242 4242 4242 4242` |  Payment succeeds                      |
| `4000 0000 0000 0002` |  Card declined                         |
| `4000 0000 0000 3220` |  3D Secure required                    |
| `4000 0000 0000 6975` |  Card declined (insufficient funds)    |

CVC: any number
Issue date: every Month and Year in the future

### Database Management

```bash
# Open Prisma Studio (visual database editor)
npx prisma studio

# Reset database (⚠️ deletes all data)
npx prisma migrate reset

# Generate Prisma client after schema changes
npx prisma generate
```

### Email Testing

In development, Resend only sends to verified email addresses:

1. Add your email in [Resend Dashboard](https://resend.com) → Senders
2. Verify by clicking the confirmation link
3. Use your verified email for test orders

---

## Deployment

### Vercel (Recommended)

1. **Push to GitHub**

```bash
git push origin main
```

2. **Connect to Vercel**
   - Import project in [Vercel Dashboard](https://vercel.com)
   - Select your repository
   - Framework preset: Next.js

3. **Configure Environment Variables**
   - Add all variables from `.env` in Project Settings

4. **Configure Database**
   - Use [Neon](https://neon.tech) or [Vercel Postgres](https://vercel.com/storage/postgres)
   - Update `DATABASE_URL` with production connection string

5. **Configure Stripe Webhooks**
   - In Stripe Dashboard: Developers → Webhooks
   - Add endpoint: `https://yourdomain.com/api/webhooks/stripe`
   - Select events: `checkout.session.completed`, `checkout.session.expired`
   - Copy signing secret to `STRIPE_WEBHOOK_SECRET`

6. **Configure Cron Jobs**

Add to `vercel.json`:

```json
{
  "crons": [
    {
      "path": "/api/jobs/deactivate-expired-gift-cards",
      "schedule": "0 0 * * *"
    }
  ]
}
```

7. **Deploy**

```bash
vercel --prod
```

### Production Checklist

- [ ] Switch Stripe to live mode (`pk_live_`, `sk_live_`)
- [ ] Verify domain in Resend and update `FROM_EMAIL`
- [ ] Add real admin emails to database
- [ ] Configure gift card expiry settings
- [ ] Verify legal policies are active
- [ ] Test complete purchase flow
- [ ] Check cron job logs after 24 hours

---

## Scripts

| Command | Description |
|---------|-------------|
| `npm run dev` | Start development server |
| `npm run build` | Build for production |
| `npm run start` | Start production server |
| `npm run lint` | Run ESLint |
| `npm run db:generate` | Generate Prisma client |
| `npm run db:migrate` | Run database migrations |
| `npm run db:seed` | Seed database with initial data |
| `npm run db:studio` | Open Prisma Studio |

---

## Documentation

For detailed technical documentation, see [AGENTS.md](./AGENTS.md) which includes:

- Complete business logic specification
- Stripe integration flow diagrams
- Order state machine
- Email template specifications
- Database schema with relationships
- API endpoint documentation

---

## Contributing

This is a proprietary project for Lo Scalo. For issues or feature requests, please contact the development team.

---

## Acknowledgments

- **Design & Development**: [Steve Giudice](mailto:giudice.steve@gmail.com)
- **UI Components**: [shadcn/ui](https://ui.shadcn.com/)
- **Icons**: [Lucide](https://lucide.dev/)

---

## License

Proprietary - All rights reserved by Lo Scalo and Steve Giudice.

---

<p align="center">
  Made with ❤️ for Lo Scalo - Craft Drinks By The Lake, Cremia (CO)
</p>
