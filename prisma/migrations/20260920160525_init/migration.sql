-- CreateEnum
CREATE TYPE "AssessmentTool" AS ENUM ('ORGANIZATIONAL', 'CAPACITY', 'RISK');

-- CreateEnum
CREATE TYPE "AssessmentEvaluationStatus" AS ENUM ('DRAFT', 'IN_PROGRESS', 'COMPLETED', 'ARCHIVED');

-- CreateEnum
CREATE TYPE "AssessmentRiskClass" AS ENUM ('NEGLIGIBLE', 'NON_NEGLIGIBLE');

-- CreateEnum
CREATE TYPE "AssessmentMeasureStatus" AS ENUM ('PENDING', 'IN_PROGRESS', 'DONE');

-- CreateTable
CREATE TABLE "Organisation" (
    "id" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "deletedAt" TIMESTAMP(3),
    "name" TEXT NOT NULL,

    CONSTRAINT "Organisation_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "User" (
    "id" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "deletedAt" TIMESTAMP(3),
    "email" TEXT NOT NULL,
    "passwordHash" TEXT,
    "name" TEXT,
    "isSuperAdmin" BOOLEAN NOT NULL DEFAULT false,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "oauthProvider" TEXT,
    "oauthSubject" TEXT,

    CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "OrganisationMember" (
    "id" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "organisationId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,

    CONSTRAINT "OrganisationMember_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AppModule" (
    "id" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "deletedAt" TIMESTAMP(3),
    "code" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "isActive" BOOLEAN NOT NULL DEFAULT true,

    CONSTRAINT "AppModule_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AppModulePermission" (
    "id" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "deletedAt" TIMESTAMP(3),
    "moduleId" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,

    CONSTRAINT "AppModulePermission_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AuthRole" (
    "id" TEXT NOT NULL,
    "organisation" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "deletedAt" TIMESTAMP(3),
    "code" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "isSystem" BOOLEAN NOT NULL DEFAULT false,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "AuthRole_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AuthRolePermission" (
    "id" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "roleId" TEXT NOT NULL,
    "permissionId" TEXT NOT NULL,
    "grantedBy" TEXT,

    CONSTRAINT "AuthRolePermission_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AuthUserRole" (
    "id" TEXT NOT NULL,
    "organisation" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "deletedAt" TIMESTAMP(3),
    "userId" TEXT NOT NULL,
    "roleId" TEXT NOT NULL,
    "assignedBy" TEXT,
    "customPermissions" JSONB,

    CONSTRAINT "AuthUserRole_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ActivityLog" (
    "id" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "organisation" TEXT NOT NULL,
    "createdById" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "note" TEXT NOT NULL,
    "level" TEXT NOT NULL DEFAULT 'INFO',
    "sourceType" TEXT NOT NULL DEFAULT 'UI',
    "dataPreview" JSONB NOT NULL,
    "data" JSONB NOT NULL,
    "ipAddress" TEXT,
    "userAgent" TEXT,
    "requestId" TEXT,

    CONSTRAINT "ActivityLog_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AssessmentOrganisationProfile" (
    "id" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "deletedAt" TIMESTAMP(3),
    "organisation" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "tradeName" TEXT,
    "type" TEXT NOT NULL,
    "associationLevel" TEXT,
    "country" TEXT NOT NULL,
    "region" TEXT,
    "yearStarted" INTEGER,
    "memberCount" INTEGER,
    "mainActivity" TEXT,
    "mainProduct" TEXT NOT NULL,
    "secondaryProducts" TEXT,
    "certifications" TEXT,
    "mainMarkets" TEXT,
    "legalRep" TEXT,
    "contactEmail" TEXT,
    "contactPhone" TEXT,
    "evaluatorId" TEXT,
    "confidential" BOOLEAN NOT NULL DEFAULT false,
    "parentProfileId" TEXT,

    CONSTRAINT "AssessmentOrganisationProfile_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AssessmentTemplate" (
    "id" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "deletedAt" TIMESTAMP(3),
    "organisation" TEXT NOT NULL,
    "tool" "AssessmentTool" NOT NULL,
    "version" INTEGER NOT NULL DEFAULT 1,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "labels" JSONB,
    "createdBy" TEXT,
    "riskThreshold" DECIMAL(65,30) DEFAULT 5,

    CONSTRAINT "AssessmentTemplate_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AssessmentSection" (
    "id" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "deletedAt" TIMESTAMP(3),
    "templateId" TEXT NOT NULL,
    "number" INTEGER NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "weight" DECIMAL(65,30) NOT NULL DEFAULT 1,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "AssessmentSection_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AssessmentIndicator" (
    "id" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "deletedAt" TIMESTAMP(3),
    "sectionId" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "helpText" TEXT,
    "scoringRubric" TEXT,
    "weight" DECIMAL(65,30) NOT NULL DEFAULT 1,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "AssessmentIndicator_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AssessmentProfileSectionExclusion" (
    "id" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdBy" TEXT NOT NULL,
    "profileId" TEXT NOT NULL,
    "sectionId" TEXT NOT NULL,

    CONSTRAINT "AssessmentProfileSectionExclusion_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AssessmentProfileIndicatorExclusion" (
    "id" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdBy" TEXT NOT NULL,
    "profileId" TEXT NOT NULL,
    "indicatorId" TEXT NOT NULL,

    CONSTRAINT "AssessmentProfileIndicatorExclusion_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AssessmentEvaluation" (
    "id" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "deletedAt" TIMESTAMP(3),
    "organisation" TEXT NOT NULL,
    "templateId" TEXT NOT NULL,
    "profileId" TEXT NOT NULL,
    "status" "AssessmentEvaluationStatus" NOT NULL DEFAULT 'DRAFT',
    "startedBy" TEXT NOT NULL,
    "startedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "completedAt" TIMESTAMP(3),
    "globalScore" DECIMAL(65,30),
    "sectionScores" JSONB,
    "executiveSummary" TEXT,

    CONSTRAINT "AssessmentEvaluation_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AssessmentResponse" (
    "id" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "evaluationId" TEXT NOT NULL,
    "indicatorId" TEXT NOT NULL,
    "score" INTEGER NOT NULL,
    "observation" TEXT NOT NULL,
    "isCritical" BOOLEAN NOT NULL DEFAULT false,
    "scoredBy" TEXT NOT NULL,
    "scoredAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AssessmentResponse_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AssessmentRisk" (
    "id" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "evaluationId" TEXT NOT NULL,
    "indicatorId" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "riskType" TEXT,
    "class" "AssessmentRiskClass" NOT NULL,
    "identifiedBy" TEXT NOT NULL,

    CONSTRAINT "AssessmentRisk_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AssessmentMitigationMeasure" (
    "id" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "deletedAt" TIMESTAMP(3),
    "riskId" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "responsible" TEXT NOT NULL,
    "support" TEXT,
    "startWeek" TIMESTAMP(3) NOT NULL,
    "durationDays" INTEGER NOT NULL,
    "endDate" TIMESTAMP(3) NOT NULL,
    "resources" TEXT,
    "budgetUsd" DECIMAL(65,30),
    "verificationLink" TEXT,
    "progressPct" INTEGER NOT NULL DEFAULT 0,
    "status" "AssessmentMeasureStatus" NOT NULL DEFAULT 'PENDING',
    "updatedBy" TEXT NOT NULL,

    CONSTRAINT "AssessmentMitigationMeasure_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "OrganizationalToolMeasure" (
    "id" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "deletedAt" TIMESTAMP(3),
    "organisation" TEXT NOT NULL,
    "evaluationId" TEXT NOT NULL,
    "indicatorId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "responsible" TEXT NOT NULL,
    "support" TEXT,
    "startDate" TIMESTAMP(3) NOT NULL,
    "endDate" TIMESTAMP(3) NOT NULL,
    "budgetUsd" DECIMAL(65,30),
    "verificationLink" TEXT,
    "progressPct" INTEGER NOT NULL DEFAULT 0,
    "status" "AssessmentMeasureStatus" NOT NULL DEFAULT 'PENDING',
    "updatedBy" TEXT NOT NULL,

    CONSTRAINT "OrganizationalToolMeasure_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CapacityToolMeasure" (
    "id" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "deletedAt" TIMESTAMP(3),
    "organisation" TEXT NOT NULL,
    "evaluationId" TEXT NOT NULL,
    "indicatorId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "responsible" TEXT NOT NULL,
    "support" TEXT,
    "startDate" TIMESTAMP(3) NOT NULL,
    "endDate" TIMESTAMP(3) NOT NULL,
    "budgetUsd" DECIMAL(65,30),
    "verificationLink" TEXT,
    "progressPct" INTEGER NOT NULL DEFAULT 0,
    "status" "AssessmentMeasureStatus" NOT NULL DEFAULT 'PENDING',
    "updatedBy" TEXT NOT NULL,

    CONSTRAINT "CapacityToolMeasure_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "User_email_key" ON "User"("email");

-- CreateIndex
CREATE UNIQUE INDEX "User_oauthProvider_oauthSubject_key" ON "User"("oauthProvider", "oauthSubject");

-- CreateIndex
CREATE INDEX "OrganisationMember_userId_idx" ON "OrganisationMember"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "OrganisationMember_organisationId_userId_key" ON "OrganisationMember"("organisationId", "userId");

-- CreateIndex
CREATE UNIQUE INDEX "AppModule_code_key" ON "AppModule"("code");

-- CreateIndex
CREATE INDEX "AppModule_code_idx" ON "AppModule"("code");

-- CreateIndex
CREATE INDEX "AppModulePermission_moduleId_idx" ON "AppModulePermission"("moduleId");

-- CreateIndex
CREATE UNIQUE INDEX "AppModulePermission_moduleId_code_key" ON "AppModulePermission"("moduleId", "code");

-- CreateIndex
CREATE INDEX "AuthRole_organisation_idx" ON "AuthRole"("organisation");

-- CreateIndex
CREATE INDEX "AuthRole_code_idx" ON "AuthRole"("code");

-- CreateIndex
CREATE UNIQUE INDEX "AuthRole_organisation_code_key" ON "AuthRole"("organisation", "code");

-- CreateIndex
CREATE INDEX "AuthRolePermission_roleId_idx" ON "AuthRolePermission"("roleId");

-- CreateIndex
CREATE INDEX "AuthRolePermission_permissionId_idx" ON "AuthRolePermission"("permissionId");

-- CreateIndex
CREATE UNIQUE INDEX "AuthRolePermission_roleId_permissionId_key" ON "AuthRolePermission"("roleId", "permissionId");

-- CreateIndex
CREATE INDEX "AuthUserRole_organisation_idx" ON "AuthUserRole"("organisation");

-- CreateIndex
CREATE INDEX "AuthUserRole_userId_idx" ON "AuthUserRole"("userId");

-- CreateIndex
CREATE INDEX "AuthUserRole_roleId_idx" ON "AuthUserRole"("roleId");

-- CreateIndex
CREATE UNIQUE INDEX "AuthUserRole_organisation_userId_roleId_key" ON "AuthUserRole"("organisation", "userId", "roleId");

-- CreateIndex
CREATE INDEX "ActivityLog_organisation_type_createdAt_idx" ON "ActivityLog"("organisation", "type", "createdAt");

-- CreateIndex
CREATE INDEX "ActivityLog_organisation_level_createdAt_idx" ON "ActivityLog"("organisation", "level", "createdAt");

-- CreateIndex
CREATE INDEX "AssessmentOrganisationProfile_organisation_idx" ON "AssessmentOrganisationProfile"("organisation");

-- CreateIndex
CREATE INDEX "AssessmentOrganisationProfile_evaluatorId_idx" ON "AssessmentOrganisationProfile"("evaluatorId");

-- CreateIndex
CREATE INDEX "AssessmentOrganisationProfile_parentProfileId_idx" ON "AssessmentOrganisationProfile"("parentProfileId");

-- CreateIndex
CREATE UNIQUE INDEX "AssessmentOrganisationProfile_organisation_name_key" ON "AssessmentOrganisationProfile"("organisation", "name");

-- CreateIndex
CREATE INDEX "AssessmentTemplate_organisation_tool_idx" ON "AssessmentTemplate"("organisation", "tool");

-- CreateIndex
CREATE UNIQUE INDEX "AssessmentTemplate_organisation_tool_version_key" ON "AssessmentTemplate"("organisation", "tool", "version");

-- CreateIndex
CREATE INDEX "AssessmentSection_templateId_idx" ON "AssessmentSection"("templateId");

-- CreateIndex
CREATE UNIQUE INDEX "AssessmentSection_templateId_number_key" ON "AssessmentSection"("templateId", "number");

-- CreateIndex
CREATE INDEX "AssessmentIndicator_sectionId_idx" ON "AssessmentIndicator"("sectionId");

-- CreateIndex
CREATE UNIQUE INDEX "AssessmentIndicator_sectionId_code_key" ON "AssessmentIndicator"("sectionId", "code");

-- CreateIndex
CREATE INDEX "AssessmentProfileSectionExclusion_profileId_idx" ON "AssessmentProfileSectionExclusion"("profileId");

-- CreateIndex
CREATE UNIQUE INDEX "AssessmentProfileSectionExclusion_profileId_sectionId_key" ON "AssessmentProfileSectionExclusion"("profileId", "sectionId");

-- CreateIndex
CREATE INDEX "AssessmentProfileIndicatorExclusion_profileId_idx" ON "AssessmentProfileIndicatorExclusion"("profileId");

-- CreateIndex
CREATE UNIQUE INDEX "AssessmentProfileIndicatorExclusion_profileId_indicatorId_key" ON "AssessmentProfileIndicatorExclusion"("profileId", "indicatorId");

-- CreateIndex
CREATE INDEX "AssessmentEvaluation_organisation_idx" ON "AssessmentEvaluation"("organisation");

-- CreateIndex
CREATE INDEX "AssessmentEvaluation_profileId_idx" ON "AssessmentEvaluation"("profileId");

-- CreateIndex
CREATE INDEX "AssessmentEvaluation_templateId_idx" ON "AssessmentEvaluation"("templateId");

-- CreateIndex
CREATE INDEX "AssessmentEvaluation_organisation_status_updatedAt_idx" ON "AssessmentEvaluation"("organisation", "status", "updatedAt");

-- CreateIndex
CREATE INDEX "AssessmentResponse_evaluationId_idx" ON "AssessmentResponse"("evaluationId");

-- CreateIndex
CREATE INDEX "AssessmentResponse_evaluationId_isCritical_idx" ON "AssessmentResponse"("evaluationId", "isCritical");

-- CreateIndex
CREATE UNIQUE INDEX "AssessmentResponse_evaluationId_indicatorId_key" ON "AssessmentResponse"("evaluationId", "indicatorId");

-- CreateIndex
CREATE INDEX "AssessmentRisk_evaluationId_idx" ON "AssessmentRisk"("evaluationId");

-- CreateIndex
CREATE UNIQUE INDEX "AssessmentRisk_evaluationId_indicatorId_key" ON "AssessmentRisk"("evaluationId", "indicatorId");

-- CreateIndex
CREATE INDEX "AssessmentMitigationMeasure_riskId_idx" ON "AssessmentMitigationMeasure"("riskId");

-- CreateIndex
CREATE INDEX "OrganizationalToolMeasure_evaluationId_idx" ON "OrganizationalToolMeasure"("evaluationId");

-- CreateIndex
CREATE INDEX "OrganizationalToolMeasure_indicatorId_idx" ON "OrganizationalToolMeasure"("indicatorId");

-- CreateIndex
CREATE INDEX "CapacityToolMeasure_evaluationId_idx" ON "CapacityToolMeasure"("evaluationId");

-- CreateIndex
CREATE INDEX "CapacityToolMeasure_indicatorId_idx" ON "CapacityToolMeasure"("indicatorId");

-- AddForeignKey
ALTER TABLE "OrganisationMember" ADD CONSTRAINT "OrganisationMember_organisationId_fkey" FOREIGN KEY ("organisationId") REFERENCES "Organisation"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "OrganisationMember" ADD CONSTRAINT "OrganisationMember_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AppModulePermission" ADD CONSTRAINT "AppModulePermission_moduleId_fkey" FOREIGN KEY ("moduleId") REFERENCES "AppModule"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AuthRolePermission" ADD CONSTRAINT "AuthRolePermission_roleId_fkey" FOREIGN KEY ("roleId") REFERENCES "AuthRole"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AuthRolePermission" ADD CONSTRAINT "AuthRolePermission_permissionId_fkey" FOREIGN KEY ("permissionId") REFERENCES "AppModulePermission"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AuthUserRole" ADD CONSTRAINT "AuthUserRole_organisation_fkey" FOREIGN KEY ("organisation") REFERENCES "Organisation"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AuthUserRole" ADD CONSTRAINT "AuthUserRole_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AuthUserRole" ADD CONSTRAINT "AuthUserRole_roleId_fkey" FOREIGN KEY ("roleId") REFERENCES "AuthRole"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ActivityLog" ADD CONSTRAINT "ActivityLog_organisation_fkey" FOREIGN KEY ("organisation") REFERENCES "Organisation"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ActivityLog" ADD CONSTRAINT "ActivityLog_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AssessmentOrganisationProfile" ADD CONSTRAINT "AssessmentOrganisationProfile_parentProfileId_fkey" FOREIGN KEY ("parentProfileId") REFERENCES "AssessmentOrganisationProfile"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AssessmentSection" ADD CONSTRAINT "AssessmentSection_templateId_fkey" FOREIGN KEY ("templateId") REFERENCES "AssessmentTemplate"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AssessmentIndicator" ADD CONSTRAINT "AssessmentIndicator_sectionId_fkey" FOREIGN KEY ("sectionId") REFERENCES "AssessmentSection"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AssessmentProfileSectionExclusion" ADD CONSTRAINT "AssessmentProfileSectionExclusion_profileId_fkey" FOREIGN KEY ("profileId") REFERENCES "AssessmentOrganisationProfile"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AssessmentProfileSectionExclusion" ADD CONSTRAINT "AssessmentProfileSectionExclusion_sectionId_fkey" FOREIGN KEY ("sectionId") REFERENCES "AssessmentSection"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AssessmentProfileIndicatorExclusion" ADD CONSTRAINT "AssessmentProfileIndicatorExclusion_profileId_fkey" FOREIGN KEY ("profileId") REFERENCES "AssessmentOrganisationProfile"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AssessmentProfileIndicatorExclusion" ADD CONSTRAINT "AssessmentProfileIndicatorExclusion_indicatorId_fkey" FOREIGN KEY ("indicatorId") REFERENCES "AssessmentIndicator"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AssessmentEvaluation" ADD CONSTRAINT "AssessmentEvaluation_templateId_fkey" FOREIGN KEY ("templateId") REFERENCES "AssessmentTemplate"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AssessmentEvaluation" ADD CONSTRAINT "AssessmentEvaluation_profileId_fkey" FOREIGN KEY ("profileId") REFERENCES "AssessmentOrganisationProfile"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AssessmentResponse" ADD CONSTRAINT "AssessmentResponse_evaluationId_fkey" FOREIGN KEY ("evaluationId") REFERENCES "AssessmentEvaluation"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AssessmentResponse" ADD CONSTRAINT "AssessmentResponse_indicatorId_fkey" FOREIGN KEY ("indicatorId") REFERENCES "AssessmentIndicator"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AssessmentRisk" ADD CONSTRAINT "AssessmentRisk_evaluationId_fkey" FOREIGN KEY ("evaluationId") REFERENCES "AssessmentEvaluation"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AssessmentMitigationMeasure" ADD CONSTRAINT "AssessmentMitigationMeasure_riskId_fkey" FOREIGN KEY ("riskId") REFERENCES "AssessmentRisk"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "OrganizationalToolMeasure" ADD CONSTRAINT "OrganizationalToolMeasure_evaluationId_fkey" FOREIGN KEY ("evaluationId") REFERENCES "AssessmentEvaluation"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "OrganizationalToolMeasure" ADD CONSTRAINT "OrganizationalToolMeasure_indicatorId_fkey" FOREIGN KEY ("indicatorId") REFERENCES "AssessmentIndicator"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CapacityToolMeasure" ADD CONSTRAINT "CapacityToolMeasure_evaluationId_fkey" FOREIGN KEY ("evaluationId") REFERENCES "AssessmentEvaluation"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CapacityToolMeasure" ADD CONSTRAINT "CapacityToolMeasure_indicatorId_fkey" FOREIGN KEY ("indicatorId") REFERENCES "AssessmentIndicator"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
