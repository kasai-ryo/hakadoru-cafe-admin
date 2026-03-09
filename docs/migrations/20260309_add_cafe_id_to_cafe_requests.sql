-- cafe_requestsテーブルにcafe_idカラムを追加
-- 承認時に作成されたカフェのIDを紐づけるためのカラム
ALTER TABLE cafe_requests
  ADD COLUMN cafe_id UUID REFERENCES cafes (id) ON DELETE SET NULL;

COMMENT ON COLUMN cafe_requests.cafe_id IS '承認時に作成されたカフェID';

CREATE INDEX idx_cafe_requests_cafe_id ON cafe_requests (cafe_id);
