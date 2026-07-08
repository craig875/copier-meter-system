-- Rename terminal install status to "complete"
ALTER TYPE "OrderStatus" RENAME VALUE 'installed' TO 'complete';
