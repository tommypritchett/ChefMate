-- CreateTable
CREATE TABLE "users" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "email" TEXT NOT NULL,
    "passwordHash" TEXT NOT NULL,
    "firstName" TEXT,
    "lastName" TEXT,
    "profileImageUrl" TEXT,
    "subscriptionTier" TEXT NOT NULL DEFAULT 'free',
    "subscriptionExpiresAt" DATETIME,
    "preferences" TEXT,
    "notificationSettings" TEXT,
    "onboardingCompleted" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    "lastLoginAt" DATETIME,
    "krogerAccessToken" TEXT,
    "krogerRefreshToken" TEXT,
    "krogerTokenExpiresAt" DATETIME
);

-- CreateTable
CREATE TABLE "recipes" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "title" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "description" TEXT,
    "brand" TEXT,
    "category" TEXT,
    "originalItemName" TEXT,
    "ingredients" TEXT NOT NULL,
    "instructions" TEXT NOT NULL,
    "prepTimeMinutes" INTEGER,
    "cookTimeMinutes" INTEGER,
    "totalTimeMinutes" INTEGER,
    "servings" INTEGER NOT NULL DEFAULT 1,
    "difficulty" TEXT,
    "nutrition" TEXT,
    "originalNutrition" TEXT,
    "dietaryTags" TEXT,
    "proteinType" TEXT,
    "cuisineStyle" TEXT,
    "cookingMethod" TEXT,
    "isAiGenerated" BOOLEAN NOT NULL DEFAULT false,
    "generatedByUserId" TEXT,
    "generationPrompt" TEXT,
    "imageUrl" TEXT,
    "imageUrls" TEXT,
    "viewCount" INTEGER NOT NULL DEFAULT 0,
    "saveCount" INTEGER NOT NULL DEFAULT 0,
    "makeCount" INTEGER NOT NULL DEFAULT 0,
    "averageRating" REAL,
    "metaDescription" TEXT,
    "metaKeywords" TEXT,
    "isPublished" BOOLEAN NOT NULL DEFAULT true,
    "isFeatured" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "recipes_generatedByUserId_fkey" FOREIGN KEY ("generatedByUserId") REFERENCES "users" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "user_saved_recipes" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "userId" TEXT NOT NULL,
    "recipeId" TEXT NOT NULL,
    "folderId" TEXT,
    "personalNotes" TEXT,
    "rating" INTEGER,
    "tags" TEXT,
    "timesMade" INTEGER NOT NULL DEFAULT 0,
    "lastMadeAt" DATETIME,
    "savedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "user_saved_recipes_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "user_saved_recipes_recipeId_fkey" FOREIGN KEY ("recipeId") REFERENCES "recipes" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "user_saved_recipes_folderId_fkey" FOREIGN KEY ("folderId") REFERENCES "recipe_folders" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "recipe_folders" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "userId" TEXT NOT NULL,
    "parentFolderId" TEXT,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "icon" TEXT,
    "color" TEXT,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "recipe_folders_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "recipe_folders_parentFolderId_fkey" FOREIGN KEY ("parentFolderId") REFERENCES "recipe_folders" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "inventory_items" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "userId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "category" TEXT,
    "storageLocation" TEXT NOT NULL,
    "quantity" REAL,
    "unit" TEXT,
    "purchasedAt" DATETIME,
    "expiresAt" DATETIME,
    "openedAt" DATETIME,
    "predictedExpiryDate" DATETIME,
    "shelfLifeDays" INTEGER,
    "imageUrl" TEXT,
    "isExpired" BOOLEAN NOT NULL DEFAULT false,
    "isRunningLow" BOOLEAN NOT NULL DEFAULT false,
    "brand" TEXT,
    "barcode" TEXT,
    "price" REAL,
    "notes" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "inventory_items_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "shopping_lists" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "userId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "sourceType" TEXT,
    "sourceRecipeId" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "isRecurring" BOOLEAN NOT NULL DEFAULT false,
    "recurrencePattern" TEXT,
    "preferredStore" TEXT,
    "estimatedTotal" REAL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    "completedAt" DATETIME,
    CONSTRAINT "shopping_lists_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "shopping_lists_sourceRecipeId_fkey" FOREIGN KEY ("sourceRecipeId") REFERENCES "recipes" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "shopping_list_items" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "shoppingListId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "quantity" REAL,
    "unit" TEXT,
    "category" TEXT,
    "isChecked" BOOLEAN NOT NULL DEFAULT false,
    "checkedAt" DATETIME,
    "estimatedPrice" REAL,
    "actualPrice" REAL,
    "storeUrls" TEXT,
    "krogerProductId" TEXT,
    "addedToKrogerCartAt" DATETIME,
    "krogerCartQuantity" REAL,
    "notes" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "shopping_list_items_shoppingListId_fkey" FOREIGN KEY ("shoppingListId") REFERENCES "shopping_lists" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "meal_log" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "userId" TEXT NOT NULL,
    "mealType" TEXT NOT NULL,
    "mealDate" DATETIME NOT NULL,
    "mealTime" DATETIME,
    "recipeId" TEXT,
    "recipeServings" REAL DEFAULT 1,
    "mealName" TEXT,
    "calories" INTEGER,
    "proteinGrams" REAL,
    "carbsGrams" REAL,
    "fatGrams" REAL,
    "notes" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "meal_log_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "meal_log_recipeId_fkey" FOREIGN KEY ("recipeId") REFERENCES "recipes" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "chat_messages" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "userId" TEXT NOT NULL,
    "threadId" TEXT,
    "role" TEXT NOT NULL,
    "message" TEXT NOT NULL,
    "contextType" TEXT,
    "contextData" TEXT,
    "generatedRecipeId" TEXT,
    "tokensUsed" INTEGER,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "chat_messages_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "chat_messages_generatedRecipeId_fkey" FOREIGN KEY ("generatedRecipeId") REFERENCES "recipes" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "chat_messages_threadId_fkey" FOREIGN KEY ("threadId") REFERENCES "conversation_threads" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "conversation_threads" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "userId" TEXT NOT NULL,
    "title" TEXT NOT NULL DEFAULT 'New Conversation',
    "contextType" TEXT NOT NULL DEFAULT 'chat',
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "conversation_threads_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "meal_plans" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "userId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "startDate" DATETIME NOT NULL,
    "endDate" DATETIME NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "notes" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "meal_plans_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "meal_plan_slots" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "mealPlanId" TEXT NOT NULL,
    "recipeId" TEXT,
    "date" DATETIME NOT NULL,
    "mealType" TEXT NOT NULL,
    "servings" INTEGER,
    "customName" TEXT,
    "notes" TEXT,
    "isCompleted" BOOLEAN NOT NULL DEFAULT false,
    "completedAt" DATETIME,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "meal_plan_slots_mealPlanId_fkey" FOREIGN KEY ("mealPlanId") REFERENCES "meal_plans" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "meal_plan_slots_recipeId_fkey" FOREIGN KEY ("recipeId") REFERENCES "recipes" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "health_goals" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "userId" TEXT NOT NULL,
    "goalType" TEXT NOT NULL,
    "targetValue" REAL NOT NULL,
    "currentValue" REAL,
    "unit" TEXT,
    "startingWeight" REAL,
    "startWeightDate" DATETIME,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "startDate" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "targetDate" DATETIME,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "health_goals_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "weight_logs" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "userId" TEXT NOT NULL,
    "weight" REAL NOT NULL,
    "unit" TEXT NOT NULL DEFAULT 'lbs',
    "logDate" DATETIME NOT NULL,
    "notes" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "weight_logs_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "notifications" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "userId" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "message" TEXT NOT NULL,
    "actionUrl" TEXT,
    "actionType" TEXT,
    "actionData" TEXT,
    "isRead" BOOLEAN NOT NULL DEFAULT false,
    "isSent" BOOLEAN NOT NULL DEFAULT false,
    "sentAt" DATETIME,
    "readAt" DATETIME,
    "relatedInventoryId" TEXT,
    "relatedRecipeId" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "notifications_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "notifications_relatedInventoryId_fkey" FOREIGN KEY ("relatedInventoryId") REFERENCES "inventory_items" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "notifications_relatedRecipeId_fkey" FOREIGN KEY ("relatedRecipeId") REFERENCES "recipes" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "payments" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "userId" TEXT NOT NULL,
    "stripePaymentIntentId" TEXT,
    "stripeSubscriptionId" TEXT,
    "amount" REAL NOT NULL,
    "currency" TEXT NOT NULL DEFAULT 'USD',
    "paymentMethod" TEXT,
    "status" TEXT NOT NULL,
    "subscriptionTier" TEXT,
    "billingPeriod" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "payments_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "price_history" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "item" TEXT NOT NULL,
    "store" TEXT NOT NULL,
    "locationId" TEXT,
    "price" REAL NOT NULL,
    "promoPrice" REAL,
    "fetchedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- CreateTable
CREATE TABLE "password_reset_tokens" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "userId" TEXT NOT NULL,
    "token" TEXT NOT NULL,
    "expiresAt" DATETIME NOT NULL,
    "used" BOOLEAN NOT NULL DEFAULT false,
    "usedAt" DATETIME,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "password_reset_tokens_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "refresh_tokens" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "userId" TEXT NOT NULL,
    "token" TEXT NOT NULL,
    "expiresAt" DATETIME NOT NULL,
    "revoked" BOOLEAN NOT NULL DEFAULT false,
    "revokedAt" DATETIME,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "refresh_tokens_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "audit_logs" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "userId" TEXT,
    "action" TEXT NOT NULL,
    "resource" TEXT NOT NULL,
    "resourceId" TEXT,
    "changes" TEXT,
    "ipAddress" TEXT,
    "userAgent" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- CreateIndex
CREATE UNIQUE INDEX "users_email_key" ON "users"("email");

-- CreateIndex
CREATE UNIQUE INDEX "recipes_slug_key" ON "recipes"("slug");

-- CreateIndex
CREATE UNIQUE INDEX "user_saved_recipes_userId_recipeId_key" ON "user_saved_recipes"("userId", "recipeId");

-- CreateIndex
CREATE UNIQUE INDEX "recipe_folders_userId_name_parentFolderId_key" ON "recipe_folders"("userId", "name", "parentFolderId");

-- CreateIndex
CREATE INDEX "inventory_items_userId_expiresAt_idx" ON "inventory_items"("userId", "expiresAt");

-- CreateIndex
CREATE INDEX "inventory_items_userId_storageLocation_idx" ON "inventory_items"("userId", "storageLocation");

-- CreateIndex
CREATE INDEX "shopping_lists_userId_isActive_idx" ON "shopping_lists"("userId", "isActive");

-- CreateIndex
CREATE INDEX "meal_log_userId_mealDate_idx" ON "meal_log"("userId", "mealDate");

-- CreateIndex
CREATE INDEX "conversation_threads_userId_contextType_updatedAt_idx" ON "conversation_threads"("userId", "contextType", "updatedAt");

-- CreateIndex
CREATE INDEX "health_goals_userId_goalType_isActive_idx" ON "health_goals"("userId", "goalType", "isActive");

-- CreateIndex
CREATE UNIQUE INDEX "weight_logs_userId_logDate_key" ON "weight_logs"("userId", "logDate");

-- CreateIndex
CREATE INDEX "price_history_item_store_idx" ON "price_history"("item", "store");

-- CreateIndex
CREATE INDEX "price_history_item_fetchedAt_idx" ON "price_history"("item", "fetchedAt");

-- CreateIndex
CREATE UNIQUE INDEX "password_reset_tokens_token_key" ON "password_reset_tokens"("token");

-- CreateIndex
CREATE INDEX "password_reset_tokens_token_expiresAt_idx" ON "password_reset_tokens"("token", "expiresAt");

-- CreateIndex
CREATE UNIQUE INDEX "refresh_tokens_token_key" ON "refresh_tokens"("token");

-- CreateIndex
CREATE INDEX "refresh_tokens_token_expiresAt_idx" ON "refresh_tokens"("token", "expiresAt");

-- CreateIndex
CREATE INDEX "refresh_tokens_userId_revoked_idx" ON "refresh_tokens"("userId", "revoked");

-- CreateIndex
CREATE INDEX "audit_logs_userId_createdAt_idx" ON "audit_logs"("userId", "createdAt");

-- CreateIndex
CREATE INDEX "audit_logs_resource_createdAt_idx" ON "audit_logs"("resource", "createdAt");
