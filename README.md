# 🍸 Lo Scalo - Craft Drinks by the Lake

[![Next.js](https://img.shields.io/badge/Next.js-16.1.6-black)](https://nextjs.org/)
[![React](https://img.shields.io/badge/React-19.2.4-blue)](https://react.dev/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.0-blue)](https://www.typescriptlang.org/)
[![Prisma](https://img.shields.io/badge/Prisma-7.4.1-2D3748)](https://prisma.io/)
[![Tailwind CSS](https://img.shields.io/badge/Tailwind-3.4.1-38B2AC)](https://tailwindcss.com/)
[![Stripe](https://img.shields.io/badge/Stripe-Payments-635BFF)](https://stripe.com/)

> A full-stack e-commerce platform for a cocktail bar in Cremia (Lake Como), Italy.

---

## Features

### For Customers
- **Browse Menu** - View cocktails organized by categories
- **Shop Products** - Purchase merchandise (in-store pickup)
- **Gift Cards** - Buy digital gift cards (€50, €100, €200)
- **Secure Checkout** - Stripe payment with 30-minute sessions
- **Bilingual** - Full Italian/English support

### For Admins
- **Order Management** - Track from payment to delivery
- **Gift Card System** - Issue, track, redeem with receipt upload
- **Daily Accounting** - Export to Excel/PDF
- **Reports & Analytics** - Monthly metrics, top/bottom sellers
- **Legal Policies** - Versioned Terms, Privacy, Cookies (IT/EN)
- **Feature Flags** - Enable/disable sections without deployment

---

## Quick Start

### Prerequisites
- Node.js 20.x
- PostgreSQL database (we use [Neon](https://neon.tech))
- Stripe account
- Google OAuth credentials
- Resend account (for emails)

### Installation

```bash
# Clone repository
git clone https://github.com/giudicesteve/lo_scalo.git
cd lo_scalo

# Install dependencies
npm install

# Set up environment variables
cp .env.example .env
# Edit .env with your values

# Database setup
npx prisma migrate dev

# Start development server
npm run dev
```

### Environment Variables

```bash
# Database (Neon PostgreSQL)
DATABASE_URL="postgresql://user:pass@host-pooler/db?sslmode=require"
DATABASE_URL_UNPOOLED="postgresql://user:pass@host/db?sslmode=require"

# Authentication (NextAuth.js)
NEXTAUTH_URL="http://localhost:3000"
NEXTAUTH_SECRET="your-secret-key"
GOOGLE_CLIENT_ID="..."
GOOGLE_CLIENT_SECRET="..."

# Payments (Stripe)
STRIPE_SECRET_KEY="sk_test_..."
STRIPE_WEBHOOK_SECRET="whsec_..."
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY="pk_test_..."

# Email (Resend)
RESEND_API_KEY="re_..."

# Optional: Rate Limiting
RATE_LIMIT_PUBLIC_API=10
RATE_LIMIT_ADMIN_API=100
```

---

## 🏗️ Architecture

### Tech Stack

| Layer | Technology |
|-------|------------|
| **Framework** | [Next.js 16](https://nextjs.org/) with App Router |
| **Language** | TypeScript 5.x |
| **Styling** | [Tailwind CSS](https://tailwindcss.com/) + shadcn/ui |
| **Database** | [Neon](https://neon.tech) PostgreSQL (Serverless) |
| **ORM** | [Prisma 7](https://prisma.io/) |
| **Auth** | [NextAuth.js](https://next-auth.js.org/) (Google OAuth) |
| **Payments** | [Stripe](https://stripe.com/) Checkout |
| **State** | [Zustand](https://github.com/pmndrs/zustand) |
| **i18n** | [next-intl](https://next-intl-docs.vercel.app/) |

### Project Structure

```
lo_scalo/
├── src/
│   ├── app/              # Next.js App Router
│   │   ├── (routes)/     # Public pages
│   │   ├── admin/        # Admin panel
│   │   ├── api/          # API routes
│   │   └── layout.tsx    # Root layout
│   ├── components/       # Shared components
│   ├── lib/             # Utilities & configs
│   └── store/           # Zustand stores
├── prisma/              # Database schema
└── public/              # Static assets
```

---

## 💳 Stripe Setup

See [STRIPE_SETUP.md](./STRIPE_SETUP.md) for detailed Stripe configuration.

Quick webhook setup:
```bash
# Install Stripe CLI
# https://stripe.com/docs/stripe-cli

# Login
stripe login

# Listen for webhooks locally
stripe listen --forward-to localhost:3000/api/stripe/webhook
```

---

## Testing

### Test Cards (Stripe)

| Card Number | Scenario |
|-------------|----------|
| `4242 4242 4242 4242` | Payment succeeds |
| `4000 0000 0000 0002` | Card declined |
| `4000 0000 0000 3220` | 3D Secure required |

### Local Webhook Testing

```bash
# Terminal 1: Start dev server
npm run dev

# Terminal 2: Start Stripe webhook listener
stripe listen --forward-to localhost:3000/api/stripe/webhook

# Terminal 3: Trigger test events
stripe trigger checkout.session.completed
stripe trigger checkout.session.expired
```

---

## Documentation

- **[AGENTS.md](./AGENTS.md)** - Complete technical documentation for developers/AI
- **[STRIPE_SETUP.md](./STRIPE_SETUP.md)** - Stripe configuration guide

---

## Brand Colors

```css
--brand-primary: #F05A28;      /* Orange - Actions */
--brand-primary-hover: #D94E22;
--brand-cream: #FFF5F0;        /* Backgrounds */
--brand-cream-dark: #F5E6DE;
--brand-dark: #231F20;         /* Text */
--brand-gray: #6B6565;         /* Secondary text */
--brand-light-gray: #E8E0DC;   /* Borders */
```

---

## License

Private - All rights reserved.

---

## Credits

Developed with ❤️ for **Lo Scalo - Craft Drinks by the Lake**  
📍 Frazione San Vito, 9 - 22010 Cremia (CO), Italy

---
