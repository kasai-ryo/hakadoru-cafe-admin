-- cafes テーブルの is_approved (BOOLEAN) を approval_status (VARCHAR) に置き換え
-- 実行日: 2026-03-09

ALTER TABLE cafes ADD COLUMN approval_status VARCHAR(20) NOT NULL DEFAULT 'pending'
  CHECK (approval_status IN ('pending', 'approved', 'rejected', 'withdrawn'));

UPDATE cafes SET approval_status = CASE WHEN is_approved THEN 'approved' ELSE 'pending' END;

ALTER TABLE cafes DROP COLUMN is_approved;

COMMENT ON COLUMN cafes.approval_status IS '承認ステータス（pending/approved/rejected/withdrawn）';
