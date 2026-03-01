ALTER TABLE public.cafes
ADD COLUMN IF NOT EXISTS equipment_note TEXT;

COMMENT ON COLUMN public.cafes.equipment_note IS '設備補足（自由入力）';
