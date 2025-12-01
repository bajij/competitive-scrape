-- CreateEnum
CREATE TYPE "CompetitorStatus" AS ENUM ('ACTIVE', 'PAUSED', 'ARCHIVED');

-- AlterTable
ALTER TABLE "Competitor" ADD COLUMN     "status" "CompetitorStatus" NOT NULL DEFAULT 'ACTIVE';
