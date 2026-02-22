-- Add receiveNotifications column to Admin table
ALTER TABLE "Admin" ADD COLUMN "receiveNotifications" BOOLEAN NOT NULL DEFAULT true;
