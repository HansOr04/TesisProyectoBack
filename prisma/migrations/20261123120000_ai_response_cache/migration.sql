-- Caché de respuestas de la IA para los análisis del reporte.
CREATE TABLE "AssessmentAiCache" (
    "key" TEXT NOT NULL,
    "provider" TEXT NOT NULL,
    "model" TEXT,
    "text" TEXT NOT NULL,
    "tokensUsed" INTEGER,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AssessmentAiCache_pkey" PRIMARY KEY ("key")
);

CREATE INDEX "AssessmentAiCache_createdAt_idx" ON "AssessmentAiCache"("createdAt");
