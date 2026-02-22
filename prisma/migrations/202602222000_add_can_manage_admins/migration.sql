-- Add canManageAdmins column to Admin table
ALTER TABLE "Admin" ADD COLUMN "canManageAdmins" BOOLEAN NOT NULL DEFAULT false;
