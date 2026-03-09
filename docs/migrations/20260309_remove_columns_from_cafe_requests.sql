-- cafe_requests テーブルから status, data, request_type カラムを削除
-- 実行日: 2026-03-09

DROP INDEX IF EXISTS idx_cafe_requests_status;

ALTER TABLE cafe_requests DROP COLUMN IF EXISTS status;
ALTER TABLE cafe_requests DROP COLUMN IF EXISTS data;
ALTER TABLE cafe_requests DROP COLUMN IF EXISTS request_type;
