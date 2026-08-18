-- Armoire Bespoke — production schema update
-- Run this ONCE in the Neon SQL editor BEFORE (or right after) deploying the
-- "delivery charge + admin-managed bespoke options" release.
--
-- It is idempotent: safe to run twice. No data is deleted.
--
-- 1) Delivery charge on orders
--    Existing orders keep deliveryTk = 0 and deliveryZone = NULL.
ALTER TABLE "Order" ADD COLUMN IF NOT EXISTS "deliveryZone" TEXT;
ALTER TABLE "Order" ADD COLUMN IF NOT EXISTS "deliveryTk" INTEGER NOT NULL DEFAULT 0;

-- 2) Bespoke option groups can be scoped to one collection (blazer fabrics
--    differ from shirt fabrics). NULL = available to every collection, which
--    is how all existing options start, so nothing changes on the live site.
ALTER TABLE "CustomizationGroup" ADD COLUMN IF NOT EXISTS "categoryId" TEXT;

-- `kind` is no longer globally unique — each collection may have its own
-- "fabric" group.
DROP INDEX IF EXISTS "CustomizationGroup_kind_key";

-- Deleting a collection removes the options scoped to it.
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'CustomizationGroup_categoryId_fkey'
  ) THEN
    ALTER TABLE "CustomizationGroup"
      ADD CONSTRAINT "CustomizationGroup_categoryId_fkey"
      FOREIGN KEY ("categoryId") REFERENCES "Category"("id")
      ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
END $$;
