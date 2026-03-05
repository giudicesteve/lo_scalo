# Stripe Integration Setup Guide

> Complete guide for configuring Stripe payments in Lo Scalo.

---

## Table of Contents

1. [Prerequisites](#1-prerequisites)
2. [Account Configuration](#2-account-configuration)
3. [Environment Setup](#3-environment-setup)
4. [Webhook Configuration](#4-webhook-configuration)
5. [Testing](#5-testing)
6. [Going Live](#6-going-live)

---

## 1. Prerequisites

- Stripe account (test and live modes)
- Stripe CLI installed locally
- Application deployed (for webhook endpoints)

---

## 2. Account Configuration

### 2.1 Get API Keys

1. Go to [Stripe Dashboard](https://dashboard.stripe.com)
2. Switch to **Test mode** (toggle in top right)
3. Developers → API Keys
4. Copy:
   - **Secret key** (starts with `sk_test_`)
   - **Publishable key** (starts with `pk_test_`)

### 2.2 Configure Business Settings

1. Settings → Account settings
2. Add business name: "Lo Scalo"
3. Configure statement descriptor: "LO SCALO"
4. Add support email: `support@loscalo.it`

---

## 3. Environment Setup

### 3.1 Local Development (.env)

```bash
# Stripe Configuration
STRIPE_SECRET_KEY=sk_test_...
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_test_...
STRIPE_WEBHOOK_SECRET=whsec_...  # From CLI or Dashboard
```

### 3.2 Production (Vercel)

Add these environment variables in Vercel Dashboard:

| Variable | Value | Environment |
|----------|-------|-------------|
| `STRIPE_SECRET_KEY` | `sk_live_...` | Production |
| `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY` | `pk_live_...` | Production |
| `STRIPE_WEBHOOK_SECRET` | `whsec_...` | Production |

---

## 4. Webhook Configuration

### 4.1 Local Development (Stripe CLI)

```bash
# Install Stripe CLI
# macOS: brew install stripe/stripe-cli/stripe
# Windows: scoop install stripe
# Linux: https://stripe.com/docs/stripe-cli#install

# Login
stripe login

# Start webhook listener
stripe listen --forward-to localhost:3000/api/stripe/webhook

# Copy the webhook signing secret from output
# Example: whsec_1234567890abcdef...
```

Add the secret to your `.env`:
```bash
STRIPE_WEBHOOK_SECRET=whsec_... # From CLI output
```

### 4.2 Production Webhooks

1. Stripe Dashboard → Developers → Webhooks
2. Click "Add endpoint"
3. Configure:
   - **Endpoint URL**: `https://yourdomain.com/api/stripe/webhook`
   - **Events to listen to**:
     - `checkout.session.completed`
     - `checkout.session.expired`
   - **Description**: "Lo Scalo Production Webhooks"

4. Click "Add endpoint"
5. Copy the **Signing secret** (`whsec_...`)
6. Add to Vercel environment variables

### 4.3 Webhook Events Handled

| Event | Purpose | Action |
|-------|---------|--------|
| `checkout.session.completed` | Payment successful | Activate order & gift cards, send emails |
| `checkout.session.expired` | Payment timeout | Cancel order, restore stock |

---

## 5. Testing

### 5.1 Test Cards

Use these cards in test mode:

| Card Number | Brand | Scenario |
|-------------|-------|----------|
| `4242 4242 4242 4242` | Visa | ✅ Payment succeeds |
| `4000 0000 0000 0002` | Visa | ❌ Card declined |
| `4000 0000 0000 3220` | Visa | ⚠️ 3D Secure required |
| `4000 0000 0000 6975` | Visa | ❌ Insufficient funds |

### 5.2 Test Flow

```bash
# 1. Start local dev
npm run dev

# 2. In another terminal, start webhook listener
stripe listen --forward-to localhost:3000/api/stripe/webhook

# 3. Add items to cart, checkout

# 4. Use test card 4242 4242 4242 4242
#    Any future date, any CVC, any ZIP

# 5. Verify webhook received in terminal
```

### 5.3 Trigger Webhooks Manually

```bash
# Simulate successful payment
stripe trigger checkout.session.completed

# Simulate expired session
stripe trigger checkout.session.expired
```

### 5.4 Verify Integration

Check these in Stripe Dashboard → Developers → Events:
1. Event received from your endpoint
2. HTTP status 200 in response
3. Order updated in database
4. Confirmation email sent

---

## 6. Going Live

### 6.1 Pre-Launch Checklist

- [ ] Switch to live API keys (`sk_live_`, `pk_live_`)
- [ ] Update webhook endpoint to production URL
- [ ] Configure live webhook secret
- [ ] Test with real card (small amount, then refund)
- [ ] Verify email sending works
- [ ] Check order confirmation flow
- [ ] Test gift card generation

### 6.2 Live Mode Activation

1. Stripe Dashboard → Activate account
2. Complete business verification
3. Add bank account for payouts
4. Switch environment variables to live keys
5. Deploy to production

### 6.3 Monitor After Launch

- Stripe Dashboard → Payments (check for failures)
- Vercel Logs (webhook errors)
- Database (order statuses)
- Email delivery (Resend dashboard)

---

## Troubleshooting

### "No signatures found matching the expected signature"

**Cause**: Wrong webhook secret  
**Fix**: Copy fresh secret from `stripe listen` output or Dashboard

### "Checkout session not found"

**Cause**: Mixing test/live mode keys  
**Fix**: Ensure all keys match (test with test, live with live)

### Webhooks not received locally

**Cause**: Stripe CLI not running  
**Fix**: Run `stripe listen --forward-to localhost:3000/api/stripe/webhook`

### Orders stuck in "pending"

**Cause**: Webhook not processed  
**Check**: 
1. Vercel logs for 500 errors
2. Stripe Dashboard → Webhooks → Recent deliveries
3. Database connection

---

## API Reference

### Our Stripe Endpoints

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/api/orders` | POST | Create checkout session |
| `/api/stripe/webhook` | POST | Receive Stripe events |
| `/api/admin/refunds` | POST | Process refunds |

### Stripe Libraries Used

```bash
# Node SDK
npm install stripe

# React Components (if needed)
npm install @stripe/stripe-js @stripe/react-stripe-js
```

---

## Additional Resources

- [Stripe Docs](https://stripe.com/docs)
- [Stripe Testing](https://stripe.com/docs/testing)
- [Webhook Best Practices](https://stripe.com/docs/webhooks/best-practices)
- [Context7 Stripe Reference](https://context7.com/websites/stripe)

---

**Need help?** Contact support@loscalo.it
