-- Migration: Aggiunta indici performance per ottimizzare query
-- Data: 2026-03-04

-- ============================================
-- ORDER - Indici per ricerca e filtri
-- ============================================

-- Indice per ricerca per orderNumber (prefix search)
CREATE INDEX IF NOT EXISTS "Order_orderNumber_idx" ON "Order"("orderNumber");

-- Indice per ricerca per email
CREATE INDEX IF NOT EXISTS "Order_email_idx" ON "Order"("email");

-- Indice per ricerca per phone
CREATE INDEX IF NOT EXISTS "Order_phone_idx" ON "Order"("phone");

-- Indice composito per filtri tab (Attivi/Archiviati/Annullati)
CREATE INDEX IF NOT EXISTS "Order_status_isArchived_idx" ON "Order"("status", "isArchived");

-- Indice per ordinamento cronologico
CREATE INDEX IF NOT EXISTS "Order_createdAt_idx" ON "Order"("createdAt" DESC);

-- Indice per report (ordini pagati in un periodo)
CREATE INDEX IF NOT EXISTS "Order_paidAt_idx" ON "Order"("paidAt");

-- Indice per orderSource (filtro Online/Manuale)
CREATE INDEX IF NOT EXISTS "Order_orderSource_idx" ON "Order"("orderSource");

-- ============================================
-- GIFT CARD - Indici per ricerca e filtri tab
-- ============================================

-- Indice per ricerca per code (già unique, ma serve per LIKE search)
CREATE INDEX IF NOT EXISTS "GiftCard_code_idx" ON "GiftCard"("code");

-- Indice per ordinamento cronologico
CREATE INDEX IF NOT EXISTS "GiftCard_purchasedAt_idx" ON "GiftCard"("purchasedAt" DESC);

-- Indice per filtro tab "Attive" (remainingValue > 0)
CREATE INDEX IF NOT EXISTS "GiftCard_remainingValue_idx" ON "GiftCard"("remainingValue");

-- Indice composito per filtro tab "Non Disponibili" (isExpired OR isSoftDeleted)
CREATE INDEX IF NOT EXISTS "GiftCard_isExpired_isSoftDeleted_idx" ON "GiftCard"("isExpired", "isSoftDeleted");

-- Indice per scadenza (cron job disattivazione)
CREATE INDEX IF NOT EXISTS "GiftCard_expiresAt_idx" ON "GiftCard"("expiresAt");

-- ============================================
-- ORDER ITEM - Indici per relazioni
-- ============================================

-- Indice per relazione order (usato in restoreStock, refunds)
CREATE INDEX IF NOT EXISTS "OrderItem_orderId_idx" ON "OrderItem"("orderId");

-- Indice per relazione product
CREATE INDEX IF NOT EXISTS "OrderItem_productId_idx" ON "OrderItem"("productId");

-- ============================================
-- PRODUCT - Indici per filtri catalogo
-- ============================================

-- Indice composito per filtro prodotti attivi non eliminati
CREATE INDEX IF NOT EXISTS "Product_isActive_isDeleted_idx" ON "Product"("isActive", "isDeleted");

-- Indice per soft delete (ordinamento prodotti eliminati)
CREATE INDEX IF NOT EXISTS "Product_isDeleted_deletedAt_idx" ON "Product"("isDeleted", "deletedAt");

-- ============================================
-- GIFT CARD TRANSACTION - Indici per report
-- ============================================

-- Indice per relazione giftCard (usato in query transazioni)
CREATE INDEX IF NOT EXISTS "GiftCardTransaction_giftCardId_idx" ON "GiftCardTransaction"("giftCardId");

-- Indice per report transazioni mensili
CREATE INDEX IF NOT EXISTS "GiftCardTransaction_createdAt_idx" ON "GiftCardTransaction"("createdAt");

-- ============================================
-- CATEGORY - Indici per menu
-- ============================================

-- Indice per filtro categorie attive
CREATE INDEX IF NOT EXISTS "Category_isActive_idx" ON "Category"("isActive");

-- Indice per ordinamento categorie
CREATE INDEX IF NOT EXISTS "Category_order_idx" ON "Category"("order");

-- ============================================
-- COCKTAIL - Indici per menu
-- ============================================

-- Indice per filtro cocktail attivi per categoria
CREATE INDEX IF NOT EXISTS "Cocktail_isActive_categoryId_idx" ON "Cocktail"("isActive", "categoryId");

-- ============================================
-- GIFT CARD TEMPLATE - Indici per shop
-- ============================================

-- Indice per filtro template attivi
CREATE INDEX IF NOT EXISTS "GiftCardTemplate_isActive_idx" ON "GiftCardTemplate"("isActive");

-- ============================================
-- ANALISI PERFORMANCE
-- ============================================

-- Per verificare che gli indici vengano usati:
-- EXPLAIN ANALYZE SELECT * FROM "Order" WHERE "status" = 'COMPLETED' AND "isArchived" = false;

-- Per vedere la dimensione degli indici:
-- SELECT pg_size_pretty(pg_relation_size('Order_status_isArchived_idx'));
