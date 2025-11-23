-- ハカドルカフェ DDL (PostgreSQL / Supabase)
-- 作成日: 2025-11-07
-- バージョン: 1.0

-- ==================================================
-- Extension: UUID生成用、全文検索用
-- ==================================================
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pg_trgm";

-- ==================================================
-- 1. accounts (ユーザー)
-- ==================================================
CREATE TABLE accounts (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  display_name VARCHAR(100),
  avatar_url TEXT,
  bio TEXT,
  created_at TIMESTAMP NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP NOT NULL DEFAULT NOW()
);

-- インデックス
CREATE INDEX idx_accounts_created_at ON accounts(created_at DESC);

COMMENT ON TABLE accounts IS 'ユーザー情報';
COMMENT ON COLUMN accounts.id IS 'Supabase Auth のユーザー UUID';
COMMENT ON COLUMN accounts.display_name IS '表示名';
COMMENT ON COLUMN accounts.avatar_url IS 'アバター画像 URL';
COMMENT ON COLUMN accounts.bio IS '自己紹介';
COMMENT ON COLUMN accounts.created_at IS '作成日時';
COMMENT ON COLUMN accounts.updated_at IS '更新日時';

-- ==================================================
-- 2. ssoaccounts (SSO認証情報)
-- ==================================================
CREATE TABLE ssoaccounts (
  account_id UUID PRIMARY KEY REFERENCES accounts(id) ON DELETE CASCADE,
  email VARCHAR(255) NOT NULL UNIQUE,
  provider VARCHAR(50) NOT NULL CHECK (provider IN ('google', 'twitter', 'line')),
  created_at TIMESTAMP NOT NULL DEFAULT NOW()
);

-- インデックス
CREATE INDEX idx_ssoaccounts_email ON ssoaccounts(email);
CREATE INDEX idx_ssoaccounts_provider ON ssoaccounts(provider);

COMMENT ON TABLE ssoaccounts IS 'SSO認証情報';
COMMENT ON COLUMN ssoaccounts.account_id IS 'アカウントID';
COMMENT ON COLUMN ssoaccounts.email IS 'メールアドレス';
COMMENT ON COLUMN ssoaccounts.provider IS '認証プロバイダ（google/twitter/line）';

-- ==================================================
-- 3. accounts_plans (プラン情報)
-- ==================================================
CREATE TABLE accounts_plans (
  account_id UUID PRIMARY KEY REFERENCES accounts(id) ON DELETE CASCADE,
  plan VARCHAR(50) NOT NULL DEFAULT 'free',
  plan_status VARCHAR(20) NOT NULL DEFAULT 'active' CHECK (plan_status IN ('active', 'trialing', 'canceled', 'past_due')),
  plan_provider VARCHAR(50),
  plan_customer_id VARCHAR(255),
  plan_started_at TIMESTAMP,
  plan_current_period_end TIMESTAMP,
  trial_ends_at TIMESTAMP,
  plan_auto_renew BOOLEAN DEFAULT TRUE,
  canceled_at TIMESTAMP,
  created_at TIMESTAMP NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP NOT NULL DEFAULT NOW()
);

-- インデックス
CREATE INDEX idx_accounts_plans_status ON accounts_plans(plan_status);
CREATE INDEX idx_accounts_plans_customer_id ON accounts_plans(plan_customer_id);

COMMENT ON TABLE accounts_plans IS 'プラン・決済情報';
COMMENT ON COLUMN accounts_plans.plan IS 'プラン種別';
COMMENT ON COLUMN accounts_plans.plan_status IS 'プラン状態（active/trialing/canceled/past_due）';
COMMENT ON COLUMN accounts_plans.plan_provider IS '決済プロバイダ（stripe 等）';
COMMENT ON COLUMN accounts_plans.plan_customer_id IS '決済側カスタマーID';
COMMENT ON COLUMN accounts_plans.plan_started_at IS 'プラン開始日';
COMMENT ON COLUMN accounts_plans.plan_current_period_end IS '当期終了日';
COMMENT ON COLUMN accounts_plans.trial_ends_at IS 'トライアル終了日';
COMMENT ON COLUMN accounts_plans.plan_auto_renew IS '自動更新フラグ';
COMMENT ON COLUMN accounts_plans.canceled_at IS '解約日時';

-- ==================================================
-- 4. cafes (カフェ)
-- ==================================================
CREATE TABLE cafes (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name VARCHAR(200) NOT NULL,
  facility_type VARCHAR(20) NOT NULL DEFAULT 'cafe' CHECK (facility_type IN ('cafe', 'coworking', 'hybrid', 'other')),
  area VARCHAR(100) NOT NULL,
  prefecture VARCHAR(20) NOT NULL,
  postal_code VARCHAR(10) NOT NULL,
  address_line1 TEXT NOT NULL,
  address_line2 TEXT,
  address_line3 TEXT,
  address TEXT NOT NULL,
  access TEXT,
  hours_weekday_from TIME,
  hours_weekday_to TIME,
  hours_weekend_from TIME,
  hours_weekend_to TIME,
  hours_note TEXT,
  regular_holidays JSONB NOT NULL DEFAULT '[]'::jsonb,
  time_limit VARCHAR(100),
  status VARCHAR(50) DEFAULT 'open' CHECK (status IN ('open', 'recently_opened', 'closed')),
  website TEXT,
  phone VARCHAR(20),
  seats INT,
  seat_types JSONB NOT NULL DEFAULT '[]'::jsonb,
  wifi BOOLEAN DEFAULT FALSE,
  outlet VARCHAR(20) CHECK (outlet IN ('all', 'most', 'half', 'some', 'none')),
  lighting VARCHAR(20) CHECK (lighting IN ('dark', 'normal', 'bright')),
  meeting_room BOOLEAN DEFAULT FALSE,
  parking BOOLEAN DEFAULT FALSE,
  smoking VARCHAR(30) CHECK (smoking IN ('no_smoking', 'separated', 'e_cigarette', 'allowed')),
  coffee_price INT,
  bring_own_food VARCHAR(30) CHECK (bring_own_food IN ('allowed', 'not_allowed', 'drinks_only')),
  alcohol VARCHAR(30) CHECK (alcohol IN ('available', 'night_only', 'unavailable')),
  services JSONB,
  payment_methods JSONB,
  customer_types JSONB,
  crowd_levels JSONB NOT NULL DEFAULT '{
    "weekdayMorning":"normal",
    "weekdayAfternoon":"normal",
    "weekdayEvening":"normal",
    "weekendMorning":"normal",
    "weekendAfternoon":"normal",
    "weekendEvening":"normal"
  }'::jsonb,
  ambience_casual INT CHECK (ambience_casual >= 1 AND ambience_casual <= 5),
  ambience_modern INT CHECK (ambience_modern >= 1 AND ambience_modern <= 5),
  ambassador_comment TEXT,
  image_main_path TEXT NOT NULL,
  image_exterior_path TEXT NOT NULL,
  image_interior_path TEXT NOT NULL,
  image_power_path TEXT NOT NULL,
  image_drink_path TEXT NOT NULL,
  image_food_path TEXT,
  created_at TIMESTAMP NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP NOT NULL DEFAULT NOW()
);

-- インデックス
CREATE INDEX idx_cafes_area ON cafes(area);
CREATE INDEX idx_cafes_name ON cafes(name);
CREATE INDEX idx_cafes_name_trgm ON cafes USING GIN (name gin_trgm_ops);
CREATE INDEX idx_cafes_address_trgm ON cafes USING GIN (address gin_trgm_ops);
CREATE INDEX idx_cafes_wifi ON cafes(wifi);
CREATE INDEX idx_cafes_outlet ON cafes(outlet);

COMMENT ON TABLE cafes IS 'カフェ情報';
COMMENT ON COLUMN cafes.id IS 'カフェID';
COMMENT ON COLUMN cafes.name IS 'カフェ名';
COMMENT ON COLUMN cafes.facility_type IS '施設タイプ（cafe/coworking/hybrid/other）';
COMMENT ON COLUMN cafes.area IS 'エリア';
COMMENT ON COLUMN cafes.prefecture IS '都道府県';
COMMENT ON COLUMN cafes.postal_code IS '郵便番号';
COMMENT ON COLUMN cafes.address_line1 IS '市区町村';
COMMENT ON COLUMN cafes.address_line2 IS '番地';
COMMENT ON COLUMN cafes.address_line3 IS '建物名・フロア等';
COMMENT ON COLUMN cafes.address IS '住所';
COMMENT ON COLUMN cafes.access IS 'アクセス';
COMMENT ON COLUMN cafes.hours_weekday_from IS '営業時間（平日）開始';
COMMENT ON COLUMN cafes.hours_weekday_to IS '営業時間（平日）終了';
COMMENT ON COLUMN cafes.hours_weekend_from IS '営業時間（休日）開始';
COMMENT ON COLUMN cafes.hours_weekend_to IS '営業時間（休日）終了';
COMMENT ON COLUMN cafes.hours_note IS '営業時間補足';
COMMENT ON COLUMN cafes.regular_holidays IS '定休日（配列）';
COMMENT ON COLUMN cafes.time_limit IS '利用時間制限';
COMMENT ON COLUMN cafes.status IS '開店状況（open/recently_opened/closed）';
COMMENT ON COLUMN cafes.website IS 'ウェブサイトURL';
COMMENT ON COLUMN cafes.phone IS '電話番号';
COMMENT ON COLUMN cafes.seats IS '席数';
COMMENT ON COLUMN cafes.seat_types IS '座席タイプ（配列）';
COMMENT ON COLUMN cafes.wifi IS 'フリーWi-Fi';
COMMENT ON COLUMN cafes.outlet IS 'コンセント（all/most/half/some/none）';
COMMENT ON COLUMN cafes.lighting IS '照明（dark/normal/bright）';
COMMENT ON COLUMN cafes.meeting_room IS '会議室';
COMMENT ON COLUMN cafes.parking IS '駐車場';
COMMENT ON COLUMN cafes.smoking IS '禁煙・喫煙（no_smoking/separated/e_cigarette/allowed）';
COMMENT ON COLUMN cafes.coffee_price IS 'コーヒー1杯の値段';
COMMENT ON COLUMN cafes.bring_own_food IS '飲食物持込（allowed/not_allowed/drinks_only）';
COMMENT ON COLUMN cafes.alcohol IS 'アルコール提供（available/night_only/unavailable）';
COMMENT ON COLUMN cafes.services IS 'サービス（配列）';
COMMENT ON COLUMN cafes.payment_methods IS '支払い方法（配列）';
COMMENT ON COLUMN cafes.customer_types IS '客層（配列）';
COMMENT ON COLUMN cafes.crowd_levels IS '混雑度（平日/休日×朝昼夜）';
COMMENT ON COLUMN cafes.ambience_casual IS '雰囲気：カジュアル度（1-5）';
COMMENT ON COLUMN cafes.ambience_modern IS '雰囲気：モダン度（1-5）';
COMMENT ON COLUMN cafes.ambassador_comment IS 'アンバサダーコメント';
COMMENT ON COLUMN cafes.image_main_path IS 'メイン画像パス';
COMMENT ON COLUMN cafes.image_exterior_path IS '外観画像パス';
COMMENT ON COLUMN cafes.image_interior_path IS '内観画像パス';
COMMENT ON COLUMN cafes.image_power_path IS '電源席画像パス';
COMMENT ON COLUMN cafes.image_drink_path IS 'ドリンク画像パス';
COMMENT ON COLUMN cafes.image_food_path IS 'フード画像パス';

-- ==================================================
-- 5. reports (作業報告)
-- ==================================================
CREATE TABLE reports (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  cafe_id UUID NOT NULL REFERENCES cafes(id) ON DELETE CASCADE,
  account_id UUID NOT NULL REFERENCES accounts(id) ON DELETE CASCADE,
  comment TEXT,
  quietness INT CHECK (quietness >= 1 AND quietness <= 5),
  spaciousness INT CHECK (spaciousness >= 1 AND spaciousness <= 5),
  power_availability INT CHECK (power_availability >= 1 AND power_availability <= 5),
  overall_rating INT NOT NULL CHECK (overall_rating >= 1 AND overall_rating <= 5),
  visit_date DATE,
  visit_time VARCHAR(20) CHECK (visit_time IN ('morning', 'afternoon', 'evening', 'night')),
  stay_duration INT,
  created_at TIMESTAMP NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP NOT NULL DEFAULT NOW()
);

-- インデックス
CREATE INDEX idx_reports_cafe_id ON reports(cafe_id);
CREATE INDEX idx_reports_account_id ON reports(account_id);
CREATE INDEX idx_reports_created_at ON reports(created_at DESC);
CREATE INDEX idx_reports_visit_date ON reports(visit_date DESC);

COMMENT ON TABLE reports IS '作業報告';
COMMENT ON COLUMN reports.id IS '作業報告ID';
COMMENT ON COLUMN reports.cafe_id IS 'カフェID';
COMMENT ON COLUMN reports.account_id IS 'ユーザーID';
COMMENT ON COLUMN reports.comment IS 'コメント';
COMMENT ON COLUMN reports.quietness IS '静かさ（1-5）';
COMMENT ON COLUMN reports.spaciousness IS '席の広さ（1-5）';
COMMENT ON COLUMN reports.power_availability IS '電源利用可能度（1-5）';
COMMENT ON COLUMN reports.overall_rating IS '総合評価（1-5）';
COMMENT ON COLUMN reports.visit_date IS '訪問日';
COMMENT ON COLUMN reports.visit_time IS '訪問時間帯（morning/afternoon/evening/night）';
COMMENT ON COLUMN reports.stay_duration IS '滞在時間（分）';

-- ==================================================
-- 6. favorites (お気に入り)
-- ==================================================
CREATE TABLE favorites (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  account_id UUID NOT NULL REFERENCES accounts(id) ON DELETE CASCADE,
  cafe_id UUID NOT NULL REFERENCES cafes(id) ON DELETE CASCADE,
  created_at TIMESTAMP NOT NULL DEFAULT NOW(),
  UNIQUE(account_id, cafe_id)
);

-- インデックス
CREATE INDEX idx_favorites_account_id ON favorites(account_id);
CREATE INDEX idx_favorites_cafe_id ON favorites(cafe_id);
CREATE UNIQUE INDEX unique_account_cafe ON favorites(account_id, cafe_id);

COMMENT ON TABLE favorites IS 'お気に入り';
COMMENT ON COLUMN favorites.id IS 'お気に入りID';
COMMENT ON COLUMN favorites.account_id IS 'ユーザーID';
COMMENT ON COLUMN favorites.cafe_id IS 'カフェID';

-- ==================================================
-- 7. cafe_requests (カフェ掲載リクエスト)
-- ==================================================
CREATE TABLE cafe_requests (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  account_id UUID NOT NULL REFERENCES accounts(id) ON DELETE CASCADE,
  request_type VARCHAR(50) NOT NULL,
  status VARCHAR(20) NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected')),
  data JSONB NOT NULL,
  admin_comment TEXT,
  created_at TIMESTAMP NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP NOT NULL DEFAULT NOW(),
  reviewed_at TIMESTAMP
);

-- インデックス
CREATE INDEX idx_cafe_requests_account_id ON cafe_requests(account_id);
CREATE INDEX idx_cafe_requests_status ON cafe_requests(status);
CREATE INDEX idx_cafe_requests_created_at ON cafe_requests(created_at DESC);

COMMENT ON TABLE cafe_requests IS 'カフェ掲載リクエスト';
COMMENT ON COLUMN cafe_requests.id IS 'リクエストID';
COMMENT ON COLUMN cafe_requests.account_id IS 'ユーザーID';
COMMENT ON COLUMN cafe_requests.request_type IS 'リクエスト種別（new_cafe）';
COMMENT ON COLUMN cafe_requests.status IS 'ステータス（pending/approved/rejected）';
COMMENT ON COLUMN cafe_requests.data IS 'リクエストデータ（JSON）';
COMMENT ON COLUMN cafe_requests.admin_comment IS '管理者コメント';
COMMENT ON COLUMN cafe_requests.reviewed_at IS 'レビュー日時';

-- ==================================================
-- 8. cafe_edit_requests (カフェ情報修正リクエスト)
-- ==================================================
CREATE TABLE cafe_edit_requests (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  account_id UUID NOT NULL REFERENCES accounts(id) ON DELETE CASCADE,
  cafe_id UUID NOT NULL REFERENCES cafes(id) ON DELETE CASCADE,
  request_type VARCHAR(50) NOT NULL,
  status VARCHAR(20) NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected')),
  changes JSONB NOT NULL,
  reason TEXT,
  admin_comment TEXT,
  created_at TIMESTAMP NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP NOT NULL DEFAULT NOW(),
  reviewed_at TIMESTAMP
);

-- インデックス
CREATE INDEX idx_cafe_edit_requests_account_id ON cafe_edit_requests(account_id);
CREATE INDEX idx_cafe_edit_requests_cafe_id ON cafe_edit_requests(cafe_id);
CREATE INDEX idx_cafe_edit_requests_status ON cafe_edit_requests(status);
CREATE INDEX idx_cafe_edit_requests_created_at ON cafe_edit_requests(created_at DESC);

COMMENT ON TABLE cafe_edit_requests IS 'カフェ情報修正リクエスト';
COMMENT ON COLUMN cafe_edit_requests.id IS '修正リクエストID';
COMMENT ON COLUMN cafe_edit_requests.account_id IS 'ユーザーID';
COMMENT ON COLUMN cafe_edit_requests.cafe_id IS 'カフェID';
COMMENT ON COLUMN cafe_edit_requests.request_type IS 'リクエスト種別（edit_info）';
COMMENT ON COLUMN cafe_edit_requests.status IS 'ステータス（pending/approved/rejected）';
COMMENT ON COLUMN cafe_edit_requests.changes IS '変更内容（JSON）';
COMMENT ON COLUMN cafe_edit_requests.reason IS '修正理由';
COMMENT ON COLUMN cafe_edit_requests.admin_comment IS '管理者コメント';
COMMENT ON COLUMN cafe_edit_requests.reviewed_at IS 'レビュー日時';

-- ==================================================
-- 9. cafe_images (カフェ画像)
-- ==================================================
CREATE TABLE cafe_images (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  cafe_id UUID NOT NULL REFERENCES cafes(id) ON DELETE CASCADE,
  image_url TEXT NOT NULL,
  image_type VARCHAR(20) NOT NULL CHECK (
    image_type IN (
      'main',
      'exterior',
      'interior',
      'power',
      'drink',
      'food',
      'other1',
      'other2',
      'other3',
      'other4',
      'other5',
      'other6',
      'other7',
      'other8',
      'other9',
      'other10'
    )
  ),
  display_order INT DEFAULT 0,
  created_at TIMESTAMP NOT NULL DEFAULT NOW()
);

-- インデックス
CREATE INDEX idx_cafe_images_cafe_id ON cafe_images(cafe_id);
CREATE INDEX idx_cafe_images_display_order ON cafe_images(cafe_id, display_order);

COMMENT ON TABLE cafe_images IS 'カフェ画像';
COMMENT ON COLUMN cafe_images.id IS '画像ID';
COMMENT ON COLUMN cafe_images.cafe_id IS 'カフェID';
COMMENT ON COLUMN cafe_images.image_url IS '画像URL（Supabase Storage）';
COMMENT ON COLUMN cafe_images.image_type IS '画像種別（main/exterior/interior/power/drink/food/other1-10）';
COMMENT ON COLUMN cafe_images.display_order IS '表示順';

-- ==================================================
-- 10. notifications (通知)
-- ==================================================
CREATE TABLE notifications (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  account_id UUID NOT NULL REFERENCES accounts(id) ON DELETE CASCADE,
  type VARCHAR(50) NOT NULL,
  title TEXT NOT NULL,
  message TEXT NOT NULL,
  metadata JSONB,
  is_read BOOLEAN NOT NULL DEFAULT FALSE,
  created_at TIMESTAMP NOT NULL DEFAULT NOW(),
  read_at TIMESTAMP
);

-- インデックス
CREATE INDEX idx_notifications_account_id ON notifications(account_id);
CREATE INDEX idx_notifications_is_read ON notifications(account_id, is_read);
CREATE INDEX idx_notifications_created_at ON notifications(created_at DESC);

COMMENT ON TABLE notifications IS '通知';
COMMENT ON COLUMN notifications.id IS '通知ID';
COMMENT ON COLUMN notifications.account_id IS 'ユーザーID';
COMMENT ON COLUMN notifications.type IS '通知タイプ（request_approved/request_rejected/report_liked）';
COMMENT ON COLUMN notifications.title IS '通知タイトル';
COMMENT ON COLUMN notifications.message IS '通知メッセージ';
COMMENT ON COLUMN notifications.metadata IS 'メタデータ（JSON）';
COMMENT ON COLUMN notifications.is_read IS '既読フラグ';
COMMENT ON COLUMN notifications.read_at IS '既読日時';

-- ==================================================
-- Triggers: updated_at 自動更新
-- ==================================================

-- 関数: updated_atを現在時刻に更新
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- accounts テーブルのトリガー
CREATE TRIGGER trigger_accounts_updated_at
  BEFORE UPDATE ON accounts
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- accounts_plans テーブルのトリガー
CREATE TRIGGER trigger_accounts_plans_updated_at
  BEFORE UPDATE ON accounts_plans
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- cafes テーブルのトリガー
CREATE TRIGGER trigger_cafes_updated_at
  BEFORE UPDATE ON cafes
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- reports テーブルのトリガー
CREATE TRIGGER trigger_reports_updated_at
  BEFORE UPDATE ON reports
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- cafe_requests テーブルのトリガー
CREATE TRIGGER trigger_cafe_requests_updated_at
  BEFORE UPDATE ON cafe_requests
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- cafe_edit_requests テーブルのトリガー
CREATE TRIGGER trigger_cafe_edit_requests_updated_at
  BEFORE UPDATE ON cafe_edit_requests
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- ==================================================
-- Row Level Security (RLS) ポリシー
-- ==================================================

-- RLS有効化
ALTER TABLE accounts ENABLE ROW LEVEL SECURITY;
ALTER TABLE ssoaccounts ENABLE ROW LEVEL SECURITY;
ALTER TABLE accounts_plans ENABLE ROW LEVEL SECURITY;
ALTER TABLE cafes ENABLE ROW LEVEL SECURITY;
ALTER TABLE reports ENABLE ROW LEVEL SECURITY;
ALTER TABLE favorites ENABLE ROW LEVEL SECURITY;
ALTER TABLE cafe_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE cafe_edit_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE cafe_images ENABLE ROW LEVEL SECURITY;
ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;

-- accounts: SELECT/UPDATE (自分の情報のみ)
CREATE POLICY accounts_select_policy ON accounts
  FOR SELECT USING (auth.uid() = id);

CREATE POLICY accounts_update_policy ON accounts
  FOR UPDATE USING (auth.uid() = id);

-- ssoaccounts: SELECT (自分の情報のみ)
CREATE POLICY ssoaccounts_select_policy ON ssoaccounts
  FOR SELECT USING (auth.uid() = account_id);

-- accounts_plans: SELECT/UPDATE (自分の情報のみ)
CREATE POLICY accounts_plans_select_policy ON accounts_plans
  FOR SELECT USING (auth.uid() = account_id);

CREATE POLICY accounts_plans_update_policy ON accounts_plans
  FOR UPDATE USING (auth.uid() = account_id);

-- cafes: SELECT (全ユーザー閲覧可能)
CREATE POLICY cafes_select_policy ON cafes
  FOR SELECT USING (true);

-- cafe_images: SELECT (全ユーザー閲覧可能)
CREATE POLICY cafe_images_select_policy ON cafe_images
  FOR SELECT USING (true);

-- reports: SELECT (全ユーザー閲覧可能)
CREATE POLICY reports_select_policy ON reports
  FOR SELECT USING (true);

-- reports: INSERT (ログインユーザのみ)
CREATE POLICY reports_insert_policy ON reports
  FOR INSERT WITH CHECK (auth.uid() = account_id);

-- reports: UPDATE/DELETE (自分の投稿のみ)
CREATE POLICY reports_update_policy ON reports
  FOR UPDATE USING (auth.uid() = account_id);

CREATE POLICY reports_delete_policy ON reports
  FOR DELETE USING (auth.uid() = account_id);

-- favorites: SELECT (自分のお気に入りのみ)
CREATE POLICY favorites_select_policy ON favorites
  FOR SELECT USING (auth.uid() = account_id);

-- favorites: INSERT/DELETE (自分のお気に入りのみ)
CREATE POLICY favorites_insert_policy ON favorites
  FOR INSERT WITH CHECK (auth.uid() = account_id);

CREATE POLICY favorites_delete_policy ON favorites
  FOR DELETE USING (auth.uid() = account_id);

-- cafe_requests: SELECT (自分のリクエストのみ)
CREATE POLICY cafe_requests_select_policy ON cafe_requests
  FOR SELECT USING (auth.uid() = account_id);

-- cafe_requests: INSERT (ログインユーザのみ)
CREATE POLICY cafe_requests_insert_policy ON cafe_requests
  FOR INSERT WITH CHECK (auth.uid() = account_id);

-- cafe_edit_requests: SELECT (自分のリクエストのみ)
CREATE POLICY cafe_edit_requests_select_policy ON cafe_edit_requests
  FOR SELECT USING (auth.uid() = account_id);

-- cafe_edit_requests: INSERT (ログインユーザのみ)
CREATE POLICY cafe_edit_requests_insert_policy ON cafe_edit_requests
  FOR INSERT WITH CHECK (auth.uid() = account_id);

-- notifications: SELECT (自分の通知のみ)
CREATE POLICY notifications_select_policy ON notifications
  FOR SELECT USING (auth.uid() = account_id);

-- notifications: UPDATE (自分の通知のみ)
CREATE POLICY notifications_update_policy ON notifications
  FOR UPDATE USING (auth.uid() = account_id);

-- ==================================================
-- 完了
-- ==================================================
