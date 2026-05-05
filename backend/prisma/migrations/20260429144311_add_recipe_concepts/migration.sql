-- CreateTable
CREATE TABLE "recipe_concepts" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "name" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "tagline" TEXT,
    "description" TEXT,
    "category" TEXT,
    "cuisineStyle" TEXT,
    "proteinType" TEXT,
    "heroImageUrl" TEXT,
    "season" TEXT,
    "trendSource" TEXT,
    "status" TEXT NOT NULL DEFAULT 'draft',
    "publishedAt" DATETIME,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

-- CreateTable
CREATE TABLE "recipe_variants" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "conceptId" TEXT NOT NULL,
    "variantType" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "ingredients" TEXT NOT NULL,
    "instructions" TEXT NOT NULL,
    "nutrition" TEXT,
    "prepTimeMinutes" INTEGER,
    "cookTimeMinutes" INTEGER,
    "totalTimeMinutes" INTEGER,
    "servings" INTEGER NOT NULL DEFAULT 1,
    "difficulty" TEXT,
    "dietaryTags" TEXT,
    "isDefault" BOOLEAN NOT NULL DEFAULT false,
    "status" TEXT NOT NULL DEFAULT 'draft',
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "recipe_variants_conceptId_fkey" FOREIGN KEY ("conceptId") REFERENCES "recipe_concepts" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "admin_actions" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "conceptId" TEXT NOT NULL,
    "variantId" TEXT,
    "action" TEXT NOT NULL,
    "notes" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "admin_actions_conceptId_fkey" FOREIGN KEY ("conceptId") REFERENCES "recipe_concepts" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "admin_actions_variantId_fkey" FOREIGN KEY ("variantId") REFERENCES "recipe_variants" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateIndex
CREATE UNIQUE INDEX "recipe_concepts_slug_key" ON "recipe_concepts"("slug");

-- CreateIndex
CREATE INDEX "recipe_concepts_status_publishedAt_idx" ON "recipe_concepts"("status", "publishedAt");

-- CreateIndex
CREATE INDEX "recipe_concepts_season_idx" ON "recipe_concepts"("season");

-- CreateIndex
CREATE INDEX "recipe_variants_conceptId_variantType_idx" ON "recipe_variants"("conceptId", "variantType");

-- CreateIndex
CREATE INDEX "admin_actions_conceptId_idx" ON "admin_actions"("conceptId");
