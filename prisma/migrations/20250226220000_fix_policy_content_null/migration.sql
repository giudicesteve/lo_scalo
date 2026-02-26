-- Fix null contentEn values by copying contentIt (or setting placeholder)
UPDATE "PolicyDocument" SET "contentEn" = "contentIt" WHERE "contentEn" IS NULL;

-- Ensure both columns are not null
ALTER TABLE "PolicyDocument" ALTER COLUMN "contentIt" SET NOT NULL;
ALTER TABLE "PolicyDocument" ALTER COLUMN "contentEn" SET NOT NULL;
