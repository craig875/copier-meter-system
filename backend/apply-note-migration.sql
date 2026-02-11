-- Migration: Add note field to readings table
-- Run this SQL script directly on your database if the Prisma migration fails

ALTER TABLE "readings" ADD COLUMN IF NOT EXISTS "note" TEXT;

-- Verify the column was added
SELECT column_name, data_type 
FROM information_schema.columns 
WHERE table_name = 'readings' AND column_name = 'note';
