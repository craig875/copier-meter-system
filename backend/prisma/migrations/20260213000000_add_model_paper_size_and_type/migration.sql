-- CreateEnum
CREATE TYPE "PaperSize" AS ENUM ('A3', 'A4');

-- CreateEnum
CREATE TYPE "ModelType" AS ENUM ('mono', 'colour');

-- AlterTable
ALTER TABLE "models" ADD COLUMN "paper_size" "PaperSize" NOT NULL DEFAULT 'A4',
ADD COLUMN "model_type" "ModelType" NOT NULL DEFAULT 'mono';
