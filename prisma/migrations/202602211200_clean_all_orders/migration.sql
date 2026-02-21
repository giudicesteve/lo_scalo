-- Pulizia completa del database: ordini, gift card, transazioni
-- Eliminazione in ordine per rispettare i vincoli di foreign key

-- 1. Elimina transazioni gift card (dipende da GiftCard)
DELETE FROM "GiftCardTransaction";

-- 2. Elimina gift card (dipende da Order)
DELETE FROM "GiftCard";

-- 3. Elimina item ordini (dipende da Order)
DELETE FROM "OrderItem";

-- 4. Elimina ordini
DELETE FROM "Order";
