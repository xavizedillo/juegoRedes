CREATE TABLE "MatchTelemetry" (
    "id" TEXT NOT NULL,
    "playerId" TEXT NOT NULL,
    "partySize" INTEGER NOT NULL,
    "floorReached" INTEGER NOT NULL,
    "bossesDefeated" INTEGER NOT NULL,
    "goldCollected" INTEGER NOT NULL,
    "status" TEXT NOT NULL,
    "playtimeMinutes" INTEGER NOT NULL,
    "inventory" JSONB NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "MatchTelemetry_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "MatchTelemetry_createdAt_idx" ON "MatchTelemetry"("createdAt");
