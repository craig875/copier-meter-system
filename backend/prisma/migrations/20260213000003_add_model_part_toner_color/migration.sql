-- CreateEnum
CREATE TYPE "TonerColor" AS ENUM ('black', 'cyan', 'magenta', 'yellow');

-- AlterTable
ALTER TABLE "model_parts" ADD COLUMN "toner_color" "TonerColor";
