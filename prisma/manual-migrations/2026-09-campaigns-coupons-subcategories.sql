-- Armoire Bespoke — production schema update
-- Run this ONCE in the Neon SQL editor BEFORE deploying the
-- "sub-categories, campaigns, coupons, filtering & search" release.
--
-- It is idempotent: safe to run twice. Nothing existing is deleted or changed;
-- every new column is nullable or has a default, so the live site keeps working
-- exactly as it does now until an admin uses the new screens.

-- ---------------------------------------------------------------------------
-- 1) Sub-categories (Blazer -> Tuxedo, Suit Set, ...)
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS "SubCategory" (
    "id" TEXT NOT NULL,
    "categoryId" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "order" INTEGER NOT NULL DEFAULT 0,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "SubCategory_pkey" PRIMARY KEY ("id")
);

-- A product may sit in one of its collection's sub-categories. NULL = none,
-- which is how every existing product starts.
ALTER TABLE "Product" ADD COLUMN IF NOT EXISTS "subCategoryId" TEXT;

-- ---------------------------------------------------------------------------
-- 2) Campaigns & discounts
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS "Campaign" (
    "id" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "headline" TEXT,
    "subhead" TEXT,
    "description" TEXT,
    "discountType" TEXT NOT NULL DEFAULT 'none',
    "discountValue" INTEGER NOT NULL DEFAULT 0,
    "badgeText" TEXT,
    "showBadges" BOOLEAN NOT NULL DEFAULT true,
    "accent" TEXT,
    "bannerType" TEXT NOT NULL DEFAULT 'image',
    "bannerUrl" TEXT,
    "posterUrl" TEXT,
    "ctaLabel" TEXT,
    "ctaHref" TEXT,
    "startsAt" TIMESTAMP(3),
    "endsAt" TIMESTAMP(3),
    "active" BOOLEAN NOT NULL DEFAULT false,
    "showOnHome" BOOLEAN NOT NULL DEFAULT true,
    "popupShow" BOOLEAN NOT NULL DEFAULT false,
    "popupImage" TEXT,
    "popupTitle" TEXT,
    "popupBody" TEXT,
    "popupCta" TEXT,
    "popupHref" TEXT,
    "order" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Campaign_pkey" PRIMARY KEY ("id")
);

CREATE TABLE IF NOT EXISTS "CampaignProduct" (
    "id" TEXT NOT NULL,
    "campaignId" TEXT NOT NULL,
    "productId" TEXT NOT NULL,
    "discountType" TEXT,
    "discountValue" INTEGER,
    "badgeText" TEXT,
    "showBadge" BOOLEAN NOT NULL DEFAULT true,
    "order" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "CampaignProduct_pkey" PRIMARY KEY ("id")
);

-- ---------------------------------------------------------------------------
-- 3) Coupon codes
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS "Coupon" (
    "id" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "description" TEXT,
    "type" TEXT NOT NULL DEFAULT 'percent',
    "value" INTEGER NOT NULL DEFAULT 0,
    "minSubtotalTk" INTEGER NOT NULL DEFAULT 0,
    "maxDiscountTk" INTEGER NOT NULL DEFAULT 0,
    "appliesTo" TEXT NOT NULL DEFAULT 'all',
    "categoryIds" TEXT,
    "productIds" TEXT,
    "startsAt" TIMESTAMP(3),
    "expiresAt" TIMESTAMP(3),
    "usageLimit" INTEGER NOT NULL DEFAULT 0,
    "perEmailLimit" INTEGER NOT NULL DEFAULT 0,
    "usedCount" INTEGER NOT NULL DEFAULT 0,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Coupon_pkey" PRIMARY KEY ("id")
);

CREATE TABLE IF NOT EXISTS "CouponRedemption" (
    "id" TEXT NOT NULL,
    "couponId" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "orderId" TEXT,
    "amountTk" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "CouponRedemption_pkey" PRIMARY KEY ("id")
);

-- A code may also be tied to individual pieces rather than whole collections.
ALTER TABLE "Coupon" ADD COLUMN IF NOT EXISTS "productIds" TEXT;

-- The coupon applied to an order. Existing orders keep discountTk = 0.
ALTER TABLE "Order" ADD COLUMN IF NOT EXISTS "couponCode" TEXT;
ALTER TABLE "Order" ADD COLUMN IF NOT EXISTS "discountTk" INTEGER NOT NULL DEFAULT 0;

-- ---------------------------------------------------------------------------
-- 4) Indexes
-- ---------------------------------------------------------------------------
CREATE UNIQUE INDEX IF NOT EXISTS "SubCategory_categoryId_slug_key" ON "SubCategory"("categoryId", "slug");
CREATE UNIQUE INDEX IF NOT EXISTS "Campaign_slug_key" ON "Campaign"("slug");
CREATE UNIQUE INDEX IF NOT EXISTS "CampaignProduct_campaignId_productId_key" ON "CampaignProduct"("campaignId", "productId");
CREATE UNIQUE INDEX IF NOT EXISTS "Coupon_code_key" ON "Coupon"("code");

-- ---------------------------------------------------------------------------
-- 5) Foreign keys (added only if they are not there yet)
-- ---------------------------------------------------------------------------
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'SubCategory_categoryId_fkey') THEN
    ALTER TABLE "SubCategory" ADD CONSTRAINT "SubCategory_categoryId_fkey" FOREIGN KEY ("categoryId") REFERENCES "Category"("id") ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
END $$;
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'Product_subCategoryId_fkey') THEN
    ALTER TABLE "Product" ADD CONSTRAINT "Product_subCategoryId_fkey" FOREIGN KEY ("subCategoryId") REFERENCES "SubCategory"("id") ON DELETE SET NULL ON UPDATE CASCADE;
  END IF;
END $$;
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'CampaignProduct_campaignId_fkey') THEN
    ALTER TABLE "CampaignProduct" ADD CONSTRAINT "CampaignProduct_campaignId_fkey" FOREIGN KEY ("campaignId") REFERENCES "Campaign"("id") ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
END $$;
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'CampaignProduct_productId_fkey') THEN
    ALTER TABLE "CampaignProduct" ADD CONSTRAINT "CampaignProduct_productId_fkey" FOREIGN KEY ("productId") REFERENCES "Product"("id") ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
END $$;
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'CouponRedemption_couponId_fkey') THEN
    ALTER TABLE "CouponRedemption" ADD CONSTRAINT "CouponRedemption_couponId_fkey" FOREIGN KEY ("couponId") REFERENCES "Coupon"("id") ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
END $$;
