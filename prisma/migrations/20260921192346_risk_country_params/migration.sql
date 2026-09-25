-- CreateTable
CREATE TABLE "AssessmentRiskCountryParam" (
    "id" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "organisation" TEXT NOT NULL,
    "country" TEXT NOT NULL,
    "riskThreshold" DECIMAL(65,30) NOT NULL,
    "updatedBy" TEXT,

    CONSTRAINT "AssessmentRiskCountryParam_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "AssessmentRiskCountryParam_organisation_country_key" ON "AssessmentRiskCountryParam"("organisation", "country");

-- AddForeignKey
ALTER TABLE "AssessmentRiskCountryParam" ADD CONSTRAINT "AssessmentRiskCountryParam_organisation_fkey" FOREIGN KEY ("organisation") REFERENCES "Organisation"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
