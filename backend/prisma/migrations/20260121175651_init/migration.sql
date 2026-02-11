-- CreateEnum
CREATE TYPE "Role" AS ENUM ('admin', 'user');

-- CreateTable
CREATE TABLE "users" (
    "id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "password_hash" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "role" "Role" NOT NULL DEFAULT 'user',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "users_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "machines" (
    "id" TEXT NOT NULL,
    "identifier" TEXT NOT NULL,
    "description" TEXT,
    "model" TEXT,
    "contract_reference" TEXT,
    "max_monthly_volume" INTEGER NOT NULL DEFAULT 0,
    "mono_enabled" BOOLEAN NOT NULL DEFAULT true,
    "colour_enabled" BOOLEAN NOT NULL DEFAULT false,
    "scan_enabled" BOOLEAN NOT NULL DEFAULT false,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "machines_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "readings" (
    "id" TEXT NOT NULL,
    "machine_id" TEXT NOT NULL,
    "year" INTEGER NOT NULL,
    "month" INTEGER NOT NULL,
    "mono_reading" INTEGER,
    "colour_reading" INTEGER,
    "scan_reading" INTEGER,
    "mono_usage" INTEGER,
    "colour_usage" INTEGER,
    "scan_usage" INTEGER,
    "over_volume" BOOLEAN NOT NULL DEFAULT false,
    "captured_by" TEXT NOT NULL,
    "captured_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "readings_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "users_email_key" ON "users"("email");

-- CreateIndex
CREATE UNIQUE INDEX "machines_identifier_key" ON "machines"("identifier");

-- CreateIndex
CREATE INDEX "machines_contract_reference_idx" ON "machines"("contract_reference");

-- CreateIndex
CREATE INDEX "readings_machine_id_idx" ON "readings"("machine_id");

-- CreateIndex
CREATE INDEX "readings_year_month_idx" ON "readings"("year", "month");

-- CreateIndex
CREATE UNIQUE INDEX "readings_machine_id_year_month_key" ON "readings"("machine_id", "year", "month");

-- AddForeignKey
ALTER TABLE "readings" ADD CONSTRAINT "readings_machine_id_fkey" FOREIGN KEY ("machine_id") REFERENCES "machines"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "readings" ADD CONSTRAINT "readings_captured_by_fkey" FOREIGN KEY ("captured_by") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
