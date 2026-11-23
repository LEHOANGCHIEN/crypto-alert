-- CreateEnum
CREATE TYPE "user_role" AS ENUM ('user', 'admin');

-- CreateEnum
CREATE TYPE "locale" AS ENUM ('vi', 'en');

-- CreateEnum
CREATE TYPE "theme" AS ENUM ('dark', 'light');

-- CreateEnum
CREATE TYPE "alert_condition" AS ENUM ('ABOVE', 'BELOW');

-- CreateEnum
CREATE TYPE "alert_status" AS ENUM ('ACTIVE', 'TRIGGERED');

-- CreateEnum
CREATE TYPE "notification_type" AS ENUM ('ALERT_TRIGGERED');

-- CreateTable
CREATE TABLE "users" (
    "id" SERIAL NOT NULL,
    "email" VARCHAR(254) NOT NULL,
    "password_hash" TEXT NOT NULL,
    "display_name" VARCHAR(50) NOT NULL,
    "role" "user_role" NOT NULL DEFAULT 'user',
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "users_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "user_settings" (
    "user_id" INTEGER NOT NULL,
    "locale" "locale" NOT NULL DEFAULT 'vi',
    "theme" "theme" NOT NULL DEFAULT 'dark',
    "timezone" VARCHAR(64) NOT NULL DEFAULT 'Asia/Ho_Chi_Minh',
    "updated_at" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "user_settings_pkey" PRIMARY KEY ("user_id")
);

-- CreateTable
CREATE TABLE "refresh_tokens" (
    "id" SERIAL NOT NULL,
    "user_id" INTEGER NOT NULL,
    "token_hash" CHAR(64) NOT NULL,
    "expires_at" TIMESTAMPTZ(3) NOT NULL,
    "revoked_at" TIMESTAMPTZ(3),
    "replaced_by_id" INTEGER,
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "refresh_tokens_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "watchlist_items" (
    "id" SERIAL NOT NULL,
    "user_id" INTEGER NOT NULL,
    "symbol" VARCHAR(20) NOT NULL,
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "watchlist_items_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "alerts" (
    "id" SERIAL NOT NULL,
    "user_id" INTEGER NOT NULL,
    "symbol" VARCHAR(20) NOT NULL,
    "condition" "alert_condition" NOT NULL,
    "target_price" DECIMAL(24,8) NOT NULL,
    "status" "alert_status" NOT NULL DEFAULT 'ACTIVE',
    "triggered_price" DECIMAL(24,8),
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "triggered_at" TIMESTAMPTZ(3),

    CONSTRAINT "alerts_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "notifications" (
    "id" SERIAL NOT NULL,
    "user_id" INTEGER NOT NULL,
    "alert_id" INTEGER,
    "type" "notification_type" NOT NULL,
    "payload" JSONB NOT NULL,
    "read_at" TIMESTAMPTZ(3),
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "notifications_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "candles" (
    "symbol" VARCHAR(20) NOT NULL,
    "interval" VARCHAR(3) NOT NULL,
    "open_time" TIMESTAMPTZ(3) NOT NULL,
    "close_time" TIMESTAMPTZ(3) NOT NULL,
    "open" DECIMAL(24,8) NOT NULL,
    "high" DECIMAL(24,8) NOT NULL,
    "low" DECIMAL(24,8) NOT NULL,
    "close" DECIMAL(24,8) NOT NULL,
    "volume" DECIMAL(36,8) NOT NULL,
    "quote_volume" DECIMAL(36,8) NOT NULL,

    CONSTRAINT "candles_pkey" PRIMARY KEY ("symbol","interval","open_time")
);

-- CreateIndex
CREATE UNIQUE INDEX "users_email_key" ON "users"("email");

-- CreateIndex
CREATE UNIQUE INDEX "refresh_tokens_token_hash_key" ON "refresh_tokens"("token_hash");

-- CreateIndex
CREATE INDEX "refresh_tokens_user_id_idx" ON "refresh_tokens"("user_id");

-- CreateIndex
CREATE INDEX "watchlist_items_user_id_created_at_idx" ON "watchlist_items"("user_id", "created_at");

-- CreateIndex
CREATE UNIQUE INDEX "watchlist_items_user_id_symbol_key" ON "watchlist_items"("user_id", "symbol");

-- CreateIndex
CREATE INDEX "alerts_status_symbol_idx" ON "alerts"("status", "symbol");

-- CreateIndex
CREATE INDEX "alerts_user_id_created_at_idx" ON "alerts"("user_id", "created_at");

-- CreateIndex
CREATE INDEX "notifications_user_id_created_at_idx" ON "notifications"("user_id", "created_at" DESC);

-- CreateIndex
CREATE INDEX "notifications_user_id_read_at_idx" ON "notifications"("user_id", "read_at");

-- AddForeignKey
ALTER TABLE "user_settings" ADD CONSTRAINT "user_settings_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "refresh_tokens" ADD CONSTRAINT "refresh_tokens_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "watchlist_items" ADD CONSTRAINT "watchlist_items_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "alerts" ADD CONSTRAINT "alerts_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "notifications" ADD CONSTRAINT "notifications_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "notifications" ADD CONSTRAINT "notifications_alert_id_fkey" FOREIGN KEY ("alert_id") REFERENCES "alerts"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "users"   ADD CONSTRAINT "users_email_lowercase" CHECK ("email" = lower("email"));
ALTER TABLE "alerts"  ADD CONSTRAINT "alerts_target_price_positive" CHECK ("target_price" > 0);
ALTER TABLE "alerts"  ADD CONSTRAINT "alerts_trigger_consistency" CHECK (
  ("status" = 'ACTIVE'    AND "triggered_at" IS NULL     AND "triggered_price" IS NULL) OR
  ("status" = 'TRIGGERED' AND "triggered_at" IS NOT NULL AND "triggered_price" IS NOT NULL));
ALTER TABLE "candles" ADD CONSTRAINT "candles_interval_valid" CHECK ("interval" IN ('1m','5m','15m','1h','4h','1d'));
