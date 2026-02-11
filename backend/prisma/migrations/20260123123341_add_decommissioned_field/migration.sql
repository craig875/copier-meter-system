-- AlterTable
ALTER TABLE "machines" ADD COLUMN     "is_decommissioned" BOOLEAN NOT NULL DEFAULT false;

-- RenameIndex
ALTER INDEX "machines_identifier_key" RENAME TO "machines_machine_serial_number_key";
