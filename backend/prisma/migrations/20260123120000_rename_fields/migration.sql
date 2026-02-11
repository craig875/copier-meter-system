-- Rename identifier to machine_serial_number
ALTER TABLE "machines" RENAME COLUMN "identifier" TO "machine_serial_number";

-- Rename description to customer
ALTER TABLE "machines" RENAME COLUMN "description" TO "customer";
