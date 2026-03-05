-- CreateTable
CREATE TABLE "PageView" (
    "id" TEXT NOT NULL,
    "siteId" TEXT NOT NULL,
    "visitorId" TEXT NOT NULL,
    "path" TEXT NOT NULL,
    "referrer" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "PageView_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "PageView_siteId_idx" ON "PageView"("siteId");

-- CreateIndex
CREATE INDEX "PageView_siteId_createdAt_idx" ON "PageView"("siteId", "createdAt");

-- CreateIndex
CREATE INDEX "PageView_siteId_visitorId_idx" ON "PageView"("siteId", "visitorId");

-- AddForeignKey
ALTER TABLE "PageView" ADD CONSTRAINT "PageView_siteId_fkey" FOREIGN KEY ("siteId") REFERENCES "Site"("id") ON DELETE CASCADE ON UPDATE CASCADE;
