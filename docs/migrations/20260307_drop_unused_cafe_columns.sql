BEGIN;

-- area 依存のインデックスを先に削除
DROP INDEX IF EXISTS idx_cafes_area;

ALTER TABLE public.cafes
  DROP COLUMN IF EXISTS area,
  DROP COLUMN IF EXISTS allow_short_leave,
  DROP COLUMN IF EXISTS parking,
  DROP COLUMN IF EXISTS coffee_price,
  DROP COLUMN IF EXISTS bring_own_food,
  DROP COLUMN IF EXISTS customer_types;

COMMIT;
