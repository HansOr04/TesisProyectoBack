-- AlterTable
ALTER TABLE "AssessmentMitigationMeasure" ADD COLUMN     "appliedImprovements" TEXT,
ADD COLUMN     "expectedResult" TEXT;

-- AlterTable
ALTER TABLE "CapacityToolMeasure" ADD COLUMN     "appliedImprovements" TEXT,
ADD COLUMN     "expectedResult" TEXT;

-- AlterTable
ALTER TABLE "OrganizationalToolMeasure" ADD COLUMN     "appliedImprovements" TEXT,
ADD COLUMN     "expectedResult" TEXT;
