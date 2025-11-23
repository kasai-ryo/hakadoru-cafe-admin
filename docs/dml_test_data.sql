-- ハカドルカフェ テストデータ (DML)
-- 作成日: 2025-11-07
-- バージョン: 1.0

-- ==================================================
-- 注意事項
-- ==================================================
-- 1. このスクリプトを実行する前に、DDL (ddl.sql) を実行してテーブルを作成してください
-- 2. Supabase Auth でユーザーを作成してから、そのUUIDをaccountsテーブルに使用してください
-- 3. 画像URLは実際のSupabase StorageのURLに置き換えてください

-- ==================================================
-- 1. テストユーザー（accounts）
-- ==================================================
-- 注意: 実際のSupabase AuthのUUIDに置き換える必要があります
-- 以下はダミーUUIDです
-- アバター画像は public/images/avatars/ 配下に配置してください

INSERT INTO accounts (id, display_name, avatar_url, bio, created_at, updated_at) VALUES
('00000000-0000-0000-0000-000000000001', '田中太郎', '/images/avatars/pexels-pixabay-69932.jpg', 'フリーランスのWebデザイナーです。カフェで作業するのが好きです。', NOW(), NOW()),
('00000000-0000-0000-0000-000000000002', '佐藤花子', '/images/avatars/pexels-pixabay-86596.jpg', '都内でエンジニアをしています。静かなカフェを探しています。', NOW(), NOW()),
('00000000-0000-0000-0000-000000000003', '鈴木一郎', '/images/avatars/pexels-george-desipris-792381.jpg', '大学生です。勉強に集中できるカフェが好きです。', NOW(), NOW()),
('00000000-0000-0000-0000-000000000004', '山田美咲', '/images/avatars/pexels-chevanon-325045.jpg', 'ライターをしています。おしゃれなカフェ巡りが趣味です。', NOW(), NOW()),
('00000000-0000-0000-0000-000000000005', '高橋健太', '/images/avatars/pexels-charlesdeluvio-1851164.jpg', '副業でプログラミングをしています。電源とWi-Fiは必須です。', NOW(), NOW());

-- ==================================================
-- 2. SSO認証情報（ssoaccounts）
-- ==================================================
INSERT INTO ssoaccounts (account_id, email, provider, created_at) VALUES
('00000000-0000-0000-0000-000000000001', 'tanaka@example.com', 'google', NOW()),
('00000000-0000-0000-0000-000000000002', 'sato@example.com', 'twitter', NOW()),
('00000000-0000-0000-0000-000000000003', 'suzuki@example.com', 'line', NOW()),
('00000000-0000-0000-0000-000000000004', 'yamada@example.com', 'google', NOW()),
('00000000-0000-0000-0000-000000000005', 'takahashi@example.com', 'google', NOW());

-- ==================================================
-- 3. プラン情報（accounts_plans）
-- ==================================================
INSERT INTO accounts_plans (account_id, plan, plan_status, created_at, updated_at) VALUES
('00000000-0000-0000-0000-000000000001', 'free', 'active', NOW(), NOW()),
('00000000-0000-0000-0000-000000000002', 'free', 'active', NOW(), NOW()),
('00000000-0000-0000-0000-000000000003', 'free', 'active', NOW(), NOW()),
('00000000-0000-0000-0000-000000000004', 'free', 'active', NOW(), NOW()),
('00000000-0000-0000-0000-000000000005', 'free', 'active', NOW(), NOW());

-- ==================================================
-- 4. カフェ情報（cafes）
-- ==================================================
\ir dml_cafes_only.sql


-- ==================================================
-- 5. カフェ画像（cafe_images）
-- ==================================================
-- 注意: 画像は public/images/cafe/ 配下に配置してください
-- Next.jsでは /images/cafe/xxx.jpg としてアクセスできます

-- Blue Bottle Coffee 日本橋店の画像
INSERT INTO cafe_images (cafe_id, image_url, image_type, display_order, created_at) VALUES
('cafe0000-0000-0000-0000-000000000001', '/images/cafe/pexels-chevanon-302896.jpg', 'main', 1, NOW()),
('cafe0000-0000-0000-0000-000000000001', '/images/cafe/pexels-chevanon-312418.jpg', 'interior', 2, NOW());

-- STREAMER COFFEE COMPANY 渋谷店の画像
INSERT INTO cafe_images (cafe_id, image_url, image_type, display_order, created_at) VALUES
('cafe0000-0000-0000-0000-000000000002', '/images/cafe/pexels-enginakyurt-2299028.jpg', 'main', 1, NOW()),
('cafe0000-0000-0000-0000-000000000002', '/images/cafe/pexels-enginakyurt-2347380.jpg', 'interior', 2, NOW());

-- THE COFFEESHOP 表参道の画像
INSERT INTO cafe_images (cafe_id, image_url, image_type, display_order, created_at) VALUES
('cafe0000-0000-0000-0000-000000000003', '/images/cafe/pexels-fotios-photos-1402407.jpg', 'main', 1, NOW()),
('cafe0000-0000-0000-0000-000000000003', '/images/cafe/pexels-fotios-photos-1833769.jpg', 'interior', 2, NOW());

-- スターバックス 新宿マルイ本館店の画像
INSERT INTO cafe_images (cafe_id, image_url, image_type, display_order, created_at) VALUES
('cafe0000-0000-0000-0000-000000000004', '/images/cafe/pexels-apgpotr-683039.jpg', 'main', 1, NOW()),
('cafe0000-0000-0000-0000-000000000004', '/images/cafe/pexels-cowomen-1058097-2041398.jpg', 'interior', 2, NOW());

-- WIRED CAFE 六本木の画像
INSERT INTO cafe_images (cafe_id, image_url, image_type, display_order, created_at) VALUES
('cafe0000-0000-0000-0000-000000000005', '/images/cafe/pexels-eka-sutrisno-940646-1863622.jpg', 'main', 1, NOW()),
('cafe0000-0000-0000-0000-000000000005', '/images/cafe/pexels-jayoke-851555.jpg', 'interior', 2, NOW());

-- 猿田彦珈琲 恵比寿本店の画像
INSERT INTO cafe_images (cafe_id, image_url, image_type, display_order, created_at) VALUES
('cafe0000-0000-0000-0000-000000000006', '/images/cafe/pexels-igor-starkov-233202-1055054.jpg', 'main', 1, NOW()),
('cafe0000-0000-0000-0000-000000000006', '/images/cafe/pexels-kindelmedia-7651627.jpg', 'interior', 2, NOW());

-- Cafe MUJI 有楽町の画像
INSERT INTO cafe_images (cafe_id, image_url, image_type, display_order, created_at) VALUES
('cafe0000-0000-0000-0000-000000000007', '/images/cafe/pexels-pragyanbezbo-1844228.jpg', 'main', 1, NOW()),
('cafe0000-0000-0000-0000-000000000007', '/images/cafe/pexels-punttim-240223.jpg', 'interior', 2, NOW());

-- TRUNK(HOTEL) KUSHI TART STAND & COFFEE の画像
INSERT INTO cafe_images (cafe_id, image_url, image_type, display_order, created_at) VALUES
('cafe0000-0000-0000-0000-000000000008', '/images/cafe/pexels-andrew-31964013.jpg', 'main', 1, NOW()),
('cafe0000-0000-0000-0000-000000000008', '/images/cafe/pexels-valeriya-827528.jpg', 'interior', 2, NOW());

-- ==================================================
-- 6. 作業報告（reports）
-- ==================================================

-- Blue Bottle Coffee 日本橋店への報告
INSERT INTO reports (
  cafe_id, account_id, comment,
  quietness, spaciousness, power_availability, overall_rating,
  visit_date, visit_time, stay_duration,
  created_at, updated_at
) VALUES
(
  'cafe0000-0000-0000-0000-000000000001',
  '00000000-0000-0000-0000-000000000001',
  '平日の午前中に訪問しました。静かで集中できる環境でした。コーヒーも美味しく、作業が捗りました。',
  5, 4, 4, 5,
  CURRENT_DATE - INTERVAL '3 days', 'morning', 180,
  NOW(), NOW()
),
(
  'cafe0000-0000-0000-0000-000000000001',
  '00000000-0000-0000-0000-000000000002',
  '天井が高く開放感があります。Wi-Fiも安定していて快適でした。',
  5, 5, 4, 5,
  CURRENT_DATE - INTERVAL '7 days', 'afternoon', 240,
  NOW(), NOW()
);

-- STREAMER COFFEE COMPANY 渋谷店への報告
INSERT INTO reports (
  cafe_id, account_id, comment,
  quietness, spaciousness, power_availability, overall_rating,
  visit_date, visit_time, stay_duration,
  created_at, updated_at
) VALUES
(
  'cafe0000-0000-0000-0000-000000000002',
  '00000000-0000-0000-0000-000000000003',
  '朝早くから開いていて便利。ただし午後は混雑します。',
  3, 3, 3, 4,
  CURRENT_DATE - INTERVAL '1 day', 'morning', 120,
  NOW(), NOW()
);

-- THE COFFEESHOP 表参道への報告
INSERT INTO reports (
  cafe_id, account_id, comment,
  quietness, spaciousness, power_availability, overall_rating,
  visit_date, visit_time, stay_duration,
  created_at, updated_at
) VALUES
(
  'cafe0000-0000-0000-0000-000000000003',
  '00000000-0000-0000-0000-000000000004',
  '全席に電源があり、会議室も使えるので打ち合わせにも最適です。',
  4, 5, 5, 5,
  CURRENT_DATE - INTERVAL '5 days', 'afternoon', 300,
  NOW(), NOW()
),
(
  'cafe0000-0000-0000-0000-000000000003',
  '00000000-0000-0000-0000-000000000005',
  '広々としていて長時間作業しても疲れません。Wi-Fi速度も申し分なし。',
  4, 5, 5, 5,
  CURRENT_DATE - INTERVAL '10 days', 'evening', 240,
  NOW(), NOW()
);

-- スターバックス 新宿マルイ本館店への報告
INSERT INTO reports (
  cafe_id, account_id, comment,
  quietness, spaciousness, power_availability, overall_rating,
  visit_date, visit_time, stay_duration,
  created_at, updated_at
) VALUES
(
  'cafe0000-0000-0000-0000-000000000004',
  '00000000-0000-0000-0000-000000000001',
  '駅近で便利ですが、混雑していることが多いです。電源席は争奪戦。',
  2, 3, 2, 3,
  CURRENT_DATE - INTERVAL '2 days', 'afternoon', 90,
  NOW(), NOW()
);

-- WIRED CAFE 六本木への報告
INSERT INTO reports (
  cafe_id, account_id, comment,
  quietness, spaciousness, power_availability, overall_rating,
  visit_date, visit_time, stay_duration,
  created_at, updated_at
) VALUES
(
  'cafe0000-0000-0000-0000-000000000005',
  '00000000-0000-0000-0000-000000000002',
  '夜遅くまで営業しているので、仕事帰りに立ち寄れて便利です。',
  4, 4, 4, 4,
  CURRENT_DATE - INTERVAL '4 days', 'night', 180,
  NOW(), NOW()
);

-- TRUNK(HOTEL) への報告
INSERT INTO reports (
  cafe_id, account_id, comment,
  quietness, spaciousness, power_availability, overall_rating,
  visit_date, visit_time, stay_duration,
  created_at, updated_at
) VALUES
(
  'cafe0000-0000-0000-0000-000000000008',
  '00000000-0000-0000-0000-000000000003',
  '穴場カフェです。静かで作業に集中できます。おしゃれな雰囲気も◎',
  5, 4, 4, 5,
  CURRENT_DATE - INTERVAL '1 day', 'morning', 240,
  NOW(), NOW()
);

-- ==================================================
-- 7. お気に入り（favorites）
-- ==================================================

INSERT INTO favorites (account_id, cafe_id, created_at) VALUES
('00000000-0000-0000-0000-000000000001', 'cafe0000-0000-0000-0000-000000000001', NOW()),
('00000000-0000-0000-0000-000000000001', 'cafe0000-0000-0000-0000-000000000003', NOW()),
('00000000-0000-0000-0000-000000000002', 'cafe0000-0000-0000-0000-000000000001', NOW()),
('00000000-0000-0000-0000-000000000002', 'cafe0000-0000-0000-0000-000000000005', NOW()),
('00000000-0000-0000-0000-000000000003', 'cafe0000-0000-0000-0000-000000000002', NOW()),
('00000000-0000-0000-0000-000000000003', 'cafe0000-0000-0000-0000-000000000008', NOW()),
('00000000-0000-0000-0000-000000000004', 'cafe0000-0000-0000-0000-000000000003', NOW()),
('00000000-0000-0000-0000-000000000005', 'cafe0000-0000-0000-0000-000000000003', NOW()),
('00000000-0000-0000-0000-000000000005', 'cafe0000-0000-0000-0000-000000000008', NOW());

-- ==================================================
-- 8. カフェ掲載リクエスト（cafe_requests）
-- ==================================================

INSERT INTO cafe_requests (
  account_id, request_type, status, data, admin_comment,
  created_at, updated_at, reviewed_at
) VALUES
(
  '00000000-0000-0000-0000-000000000001',
  'new_cafe',
  'pending',
  '{
    "name": "GLITCH COFFEE & ROASTERS",
    "area": "神保町",
    "address": "東京都千代田区神田錦町3-16 香村ビル1F",
    "phone": "03-5244-0000",
    "website": "https://glitchcoffee.com/"
  }',
  NULL,
  NOW() - INTERVAL '2 days',
  NOW() - INTERVAL '2 days',
  NULL
),
(
  '00000000-0000-0000-0000-000000000004',
  'new_cafe',
  'approved',
  '{
    "name": "ABOUT LIFE COFFEE BREWERS",
    "area": "渋谷",
    "address": "東京都渋谷区富ヶ谷1-52-12"
  }',
  '承認しました。素敵なカフェ情報ありがとうございます。',
  NOW() - INTERVAL '10 days',
  NOW() - INTERVAL '5 days',
  NOW() - INTERVAL '5 days'
);

-- ==================================================
-- 9. カフェ情報修正リクエスト（cafe_edit_requests）
-- ==================================================

INSERT INTO cafe_edit_requests (
  account_id, cafe_id, request_type, status, changes, reason, admin_comment,
  created_at, updated_at, reviewed_at
) VALUES
(
  '00000000-0000-0000-0000-000000000002',
  'cafe0000-0000-0000-0000-000000000004',
  'edit_info',
  'pending',
  '{
    "hours_weekday": "8:00～22:00",
    "hours_weekend": "8:00～22:00"
  }',
  '営業時間が22時まで延長されていました。',
  NULL,
  NOW() - INTERVAL '1 day',
  NOW() - INTERVAL '1 day',
  NULL
),
(
  '00000000-0000-0000-0000-000000000003',
  'cafe0000-0000-0000-0000-000000000002',
  'edit_info',
  'approved',
  '{
    "outlet": "half"
  }',
  '電源席が増設されていました。',
  '確認して修正しました。情報提供ありがとうございます。',
  NOW() - INTERVAL '15 days',
  NOW() - INTERVAL '8 days',
  NOW() - INTERVAL '8 days'
);

-- ==================================================
-- 10. 通知（notifications）
-- ==================================================

INSERT INTO notifications (
  account_id, type, title, message, metadata, is_read, created_at, read_at
) VALUES
(
  '00000000-0000-0000-0000-000000000004',
  'request_approved',
  'カフェ掲載リクエストが承認されました',
  'ABOUT LIFE COFFEE BREWERSの掲載リクエストが承認されました。',
  '{"request_id": "uuid-example", "cafe_name": "ABOUT LIFE COFFEE BREWERS"}',
  TRUE,
  NOW() - INTERVAL '5 days',
  NOW() - INTERVAL '4 days'
),
(
  '00000000-0000-0000-0000-000000000001',
  'report_liked',
  'あなたの作業報告にいいねがつきました',
  'Blue Bottle Coffee 日本橋店への作業報告に5件のいいねがつきました。',
  '{"report_id": "uuid-example", "likes_count": 5}',
  FALSE,
  NOW() - INTERVAL '1 day',
  NULL
),
(
  '00000000-0000-0000-0000-000000000003',
  'request_approved',
  '情報修正リクエストが承認されました',
  'STREAMER COFFEE COMPANY 渋谷店の情報修正が反映されました。',
  '{"request_id": "uuid-example", "cafe_name": "STREAMER COFFEE COMPANY 渋谷店"}',
  FALSE,
  NOW() - INTERVAL '8 days',
  NULL
);

-- ==================================================
-- 完了
-- ==================================================

-- テストデータの投入が完了しました
-- 確認用クエリ:
-- SELECT * FROM accounts;
-- SELECT * FROM cafes;
-- SELECT * FROM reports;
-- SELECT * FROM favorites;
-- SELECT * FROM cafe_requests;
-- SELECT * FROM cafe_edit_requests;
-- SELECT * FROM notifications;
