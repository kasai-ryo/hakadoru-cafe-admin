BEGIN;

-- cafes.regular_holidays: 日本語の曜日/祝日を英字キーへ正規化
UPDATE cafes AS c
SET regular_holidays = COALESCE(
  (
    SELECT jsonb_agg(to_jsonb(mapped_item.mapped) ORDER BY mapped_item.first_ord)
    FROM (
      SELECT mapped, MIN(ord) AS first_ord
      FROM (
        SELECT
          e.ord,
          CASE regexp_replace(trim(e.raw), '\\s+', '', 'g')
            WHEN '月曜日' THEN 'monday'
            WHEN '月' THEN 'monday'
            WHEN 'monday' THEN 'monday'
            WHEN '火曜日' THEN 'tuesday'
            WHEN '火' THEN 'tuesday'
            WHEN 'tuesday' THEN 'tuesday'
            WHEN '水曜日' THEN 'wednesday'
            WHEN '水' THEN 'wednesday'
            WHEN 'wednesday' THEN 'wednesday'
            WHEN '木曜日' THEN 'thursday'
            WHEN '木' THEN 'thursday'
            WHEN 'thursday' THEN 'thursday'
            WHEN '金曜日' THEN 'friday'
            WHEN '金' THEN 'friday'
            WHEN 'friday' THEN 'friday'
            WHEN '土曜日' THEN 'saturday'
            WHEN '土' THEN 'saturday'
            WHEN 'saturday' THEN 'saturday'
            WHEN '日曜日' THEN 'sunday'
            WHEN '日' THEN 'sunday'
            WHEN 'sunday' THEN 'sunday'
            WHEN '祝' THEN 'holiday'
            WHEN '祝日' THEN 'holiday'
            WHEN 'holiday' THEN 'holiday'
            ELSE NULL
          END AS mapped
        FROM jsonb_array_elements_text(COALESCE(c.regular_holidays, '[]'::jsonb)) WITH ORDINALITY AS e(raw, ord)
      ) AS normalized
      WHERE mapped IS NOT NULL
      GROUP BY mapped
    ) AS mapped_item
  ),
  '[]'::jsonb
);

-- cafes.services: 日本語ラベルを英字キーへ正規化
UPDATE cafes AS c
SET services = COALESCE(
  (
    SELECT jsonb_agg(to_jsonb(mapped_item.mapped) ORDER BY mapped_item.first_ord)
    FROM (
      SELECT mapped, MIN(ord) AS first_ord
      FROM (
        SELECT
          e.ord,
          CASE regexp_replace(trim(e.raw), '\\s+', '', 'g')
            WHEN 'テラス席あり' THEN 'terrace'
            WHEN 'テラス席' THEN 'terrace'
            WHEN 'terrace' THEN 'terrace'
            WHEN '窓際席あり' THEN 'window_seat'
            WHEN '窓際席' THEN 'window_seat'
            WHEN 'window_seat' THEN 'window_seat'
            WHEN 'ペットOK' THEN 'pet_ok'
            WHEN 'pet_ok' THEN 'pet_ok'
            WHEN 'テイクアウト' THEN 'takeout'
            WHEN 'takeout' THEN 'takeout'
            ELSE NULL
          END AS mapped
        FROM jsonb_array_elements_text(COALESCE(c.services, '[]'::jsonb)) WITH ORDINALITY AS e(raw, ord)
      ) AS normalized
      WHERE mapped IS NOT NULL
      GROUP BY mapped
    ) AS mapped_item
  ),
  '[]'::jsonb
);

-- cafes.recommended_work: 日本語ラベルを英字キーへ正規化
UPDATE cafes AS c
SET recommended_work = COALESCE(
  (
    SELECT jsonb_agg(to_jsonb(mapped_item.mapped) ORDER BY mapped_item.first_ord)
    FROM (
      SELECT mapped, MIN(ord) AS first_ord
      FROM (
        SELECT
          e.ord,
          CASE regexp_replace(trim(e.raw), '\\s+', '', 'g')
            WHEN 'PC作業' THEN 'pc_work'
            WHEN 'pc_work' THEN 'pc_work'
            WHEN '読書' THEN 'reading'
            WHEN 'reading' THEN 'reading'
            WHEN '勉強' THEN 'study'
            WHEN 'study' THEN 'study'
            WHEN '打合せ' THEN 'meeting'
            WHEN '打ち合わせ' THEN 'meeting'
            WHEN 'meeting' THEN 'meeting'
            ELSE NULL
          END AS mapped
        FROM jsonb_array_elements_text(COALESCE(c.recommended_work, '[]'::jsonb)) WITH ORDINALITY AS e(raw, ord)
      ) AS normalized
      WHERE mapped IS NOT NULL
      GROUP BY mapped
    ) AS mapped_item
  ),
  '[]'::jsonb
);

COMMIT;
