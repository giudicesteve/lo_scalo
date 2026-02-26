-- Add bilingual content columns
ALTER TABLE "PolicyDocument" ADD COLUMN "contentIt" TEXT;
ALTER TABLE "PolicyDocument" ADD COLUMN "contentEn" TEXT;

-- Migrate existing content to contentIt (Italian as default)
UPDATE "PolicyDocument" SET "contentIt" = "content";

-- Make contentIt required
ALTER TABLE "PolicyDocument" ALTER COLUMN "contentIt" SET NOT NULL;

-- Remove old content column
ALTER TABLE "PolicyDocument" DROP COLUMN "content";
