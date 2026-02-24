-- cafe_drafts: 管理画面の一時保存（スナップショット）保存用
-- 実行日: 2026-02-23

CREATE TABLE IF NOT EXISTS cafe_drafts (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  target_cafe_id UUID NULL REFERENCES cafes(id) ON DELETE CASCADE,
  target_cafe_name TEXT NULL,
  cafe_name TEXT NULL,
  payload JSONB NOT NULL,
  created_at TIMESTAMP NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_cafe_drafts_target_cafe_id
  ON cafe_drafts (target_cafe_id);

CREATE INDEX IF NOT EXISTS idx_cafe_drafts_updated_at
  ON cafe_drafts (updated_at DESC);

COMMENT ON TABLE cafe_drafts IS '管理画面カフェフォームの一時保存スナップショット';
COMMENT ON COLUMN cafe_drafts.target_cafe_id IS '編集対象カフェID（新規登録時はNULL）';
COMMENT ON COLUMN cafe_drafts.payload IS 'CafeFormDrawer のシリアライズ済みフォームデータ';
