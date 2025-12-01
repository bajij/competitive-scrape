-- CreateEnum
CREATE TYPE "Frequency" AS ENUM ('MANUAL', 'DAILY', 'WEEKLY', 'MONTHLY');

-- CreateEnum
CREATE TYPE "PageType" AS ENUM ('PRICING', 'LANDING', 'PRODUCT', 'BLOG', 'OTHER');

-- CreateEnum
CREATE TYPE "ChangeType" AS ENUM ('TEXT', 'PRICE', 'SECTION_ADDED', 'SECTION_REMOVED', 'OTHER');

-- CreateTable
CREATE TABLE "Project" (
    "id" SERIAL NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "frequency" "Frequency" NOT NULL DEFAULT 'MANUAL',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Project_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Competitor" (
    "id" SERIAL NOT NULL,
    "projectId" INTEGER NOT NULL,
    "name" TEXT NOT NULL,
    "websiteUrl" TEXT,
    "description" TEXT,
    "tags" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Competitor_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "MonitoredPage" (
    "id" SERIAL NOT NULL,
    "competitorId" INTEGER NOT NULL,
    "url" TEXT NOT NULL,
    "pageType" "PageType" NOT NULL DEFAULT 'OTHER',
    "note" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "MonitoredPage_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Snapshot" (
    "id" SERIAL NOT NULL,
    "monitoredPageId" INTEGER NOT NULL,
    "capturedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "rawHtml" TEXT,
    "extractedText" TEXT,
    "extractedPricing" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Snapshot_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Change" (
    "id" SERIAL NOT NULL,
    "monitoredPageId" INTEGER NOT NULL,
    "oldSnapshotId" INTEGER,
    "newSnapshotId" INTEGER,
    "changeType" "ChangeType" NOT NULL,
    "field" TEXT,
    "oldValue" TEXT,
    "newValue" TEXT,
    "changeSummary" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Change_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Report" (
    "id" SERIAL NOT NULL,
    "projectId" INTEGER NOT NULL,
    "periodStart" TIMESTAMP(3),
    "periodEnd" TIMESTAMP(3),
    "generatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "aiSummary" TEXT,
    "highlights" JSONB,
    "pdfUrl" TEXT,

    CONSTRAINT "Report_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "idx_project_frequency" ON "Project"("frequency");

-- CreateIndex
CREATE INDEX "idx_competitor_project" ON "Competitor"("projectId");

-- CreateIndex
CREATE INDEX "idx_page_competitor" ON "MonitoredPage"("competitorId");

-- CreateIndex
CREATE INDEX "idx_page_type" ON "MonitoredPage"("pageType");

-- CreateIndex
CREATE INDEX "idx_snapshot_page_captured" ON "Snapshot"("monitoredPageId", "capturedAt");

-- CreateIndex
CREATE INDEX "idx_change_page" ON "Change"("monitoredPageId");

-- CreateIndex
CREATE INDEX "idx_change_type" ON "Change"("changeType");

-- CreateIndex
CREATE INDEX "idx_change_created_at" ON "Change"("createdAt");

-- CreateIndex
CREATE INDEX "idx_report_project" ON "Report"("projectId");

-- CreateIndex
CREATE INDEX "idx_report_generated_at" ON "Report"("generatedAt");

-- AddForeignKey
ALTER TABLE "Competitor" ADD CONSTRAINT "Competitor_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MonitoredPage" ADD CONSTRAINT "MonitoredPage_competitorId_fkey" FOREIGN KEY ("competitorId") REFERENCES "Competitor"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Snapshot" ADD CONSTRAINT "Snapshot_monitoredPageId_fkey" FOREIGN KEY ("monitoredPageId") REFERENCES "MonitoredPage"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Change" ADD CONSTRAINT "Change_monitoredPageId_fkey" FOREIGN KEY ("monitoredPageId") REFERENCES "MonitoredPage"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Change" ADD CONSTRAINT "Change_oldSnapshotId_fkey" FOREIGN KEY ("oldSnapshotId") REFERENCES "Snapshot"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Change" ADD CONSTRAINT "Change_newSnapshotId_fkey" FOREIGN KEY ("newSnapshotId") REFERENCES "Snapshot"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Report" ADD CONSTRAINT "Report_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project"("id") ON DELETE CASCADE ON UPDATE CASCADE;
