-- Add isArchived column to PolicyDocument
ALTER TABLE "PolicyDocument" ADD COLUMN "isArchived" BOOLEAN NOT NULL DEFAULT false;

-- Create index for archived queries
CREATE INDEX "PolicyDocument_type_isArchived_idx" ON "PolicyDocument"("type", "isArchived");
