-- Aggiunge colonna stripePaymentIntentId per tracciare il Payment Intent ID (pi_...)
-- Lo stripePaymentId esistente verrà usato per la Session ID (cs_...)

ALTER TABLE "Order" ADD COLUMN "stripePaymentIntentId" TEXT;
