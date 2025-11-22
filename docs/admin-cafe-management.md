# 管理者向けカフェ管理機能 詳細設計

- **対象機能**: requirements.md の No.9「カフェ登録」、No.10「カフェ更新・削除」
- **利用技術**: Next.js 15 (App Router) + TypeScript + TailwindCSS + Supabase
- **作成日**: 2025-01-05

---

## 1. 概要

ハカドルカフェの管理者だけが利用できるカフェ管理画面を実装する。  
要件は以下の2点。

1. 新規カフェを Supabase `cafes` テーブルへ登録できること。  
2. 既存カフェの情報を編集および論理削除（`deleted_at` フラグ更新）できること。

アプリ全体の開発標準（`docs/dev-rule.md`）を前提に、Next.js App Router でページを構築する。

---

## 2. 想定ユーザーとアクセス要件

| 区分 | 詳細 |
| --- | --- |
| 利用者 | ハカドルカフェ運営メンバー（社内管理者）。URL を知っている限定メンバーのみ。 |
| 認証 | ページ内で ID/PW を直接入力する簡易ログイン。<br>**ID: `cafe` / PW: `hakadoru`**（平文でハードコード）。 |
| 認可 | 追加のロールチェックは行わない。ログイン済みであれば全操作可能。 |
| 未認証時 | 管理ページのコンテンツは表示せず、シンプルなログインフォームを表示。成功時のみクッキー/ローカルストレージでセッション状態を保持。 |
| 留意事項 | 高セキュリティは要求されていないが、URL 秘匿 + 簡易PWに依存することをドキュメント化。 |

---

## 3. 画面構成（App Router）

```
app/
└── (pages)/
    └── admin/
        └── cafes/
            ├── page.tsx          # 一覧 + 作成/編集モーダルの起点となるサーバーコンポーネント
            ├── create/
            │   └── page.tsx      # モーダル遷移が複雑になる場合のスタンドアローン作成ページ（任意）
            └── [id]/
                └── page.tsx      # 個別カフェ編集ページ（詳細編集）
```

- `page.tsx` はサーバーコンポーネント。SSR データ取得と簡易ログイン済みかのチェックのみ担当（セッションは Cookie/ヘッダー経由で確認）。
- 実際のフォームやインタラクションは `app/components/admin/cafes/` 配下のクライアントコンポーネントに切り出す。

推奨コンポーネント構成:

| コンポーネント | 役割 |
| --- | --- |
| `AdminCafeDashboard` (サーバー) | ページ全体の枠組みと SSR データ注入 |
| `SimpleAdminGate` (サーバー or クライアント) | ID/PW 入力フォームとセッション保存（ID: `cafe`, PW: `hakadoru`） |
| `CafeTable` (クライアント) | カフェ一覧（検索・ソート・ページネーション） |
| `CafeFormDrawer` (クライアント) | 登録/更新フォーム。右側ドロワーUIでフォームを表示。 |
| `CafeDeleteDialog` (クライアント) | 論理削除確認ダイアログ |
| `CafeFilterBar` (クライアント) | エリアや設備でフィルタリング |
| `FieldSection` (クライアント) | 情報カテゴリ別にフォームを分割（基本情報/環境/サービス等） |

---

## 4. データ定義との対応

### 4.1 対象テーブル

- `cafes`
- `cafe_images`（Supabase Storage バケットのファイルパスを保存。例: `cafes/<cafeId>/<filename>.jpg`）

`docs/requirements.md` の「カフェ詳細情報項目一覧」と `docs/ddl.sql` の制約に準拠する。  
論理削除に対応するため、`cafes` テーブルに `deleted_at TIMESTAMP NULL` を追加する（DDL 変更が別途必要）。

### 4.2 入力項目マッピング

| フォームセクション | 必須項目 | 型 / 制約 | 備考 |
| --- | --- | --- | --- |
| 基本情報 | 店舗名 (`name`), エリア (`area`), 住所 (`address`), 電話番号 (`phone`) | string / 255 | 住所はテキスト入力、電話番号はハイフン含むフォーマットチェック |
| 営業情報 | 営業時間平日 (`hours_weekday`), 休日 (`hours_weekend`), 定休日 (`regular_holiday`), 利用時間制限 (`time_limit`), 開店状況 (`status`) | string, enum | `status` は `open/recently_opened/closed` |
| アクセス | アクセス (`access`), 緯度経度 (`latitude`, `longitude`) | text, decimal | 緯度: DECIMAL(10,8), 経度: DECIMAL(11,8) |
| 環境 | 席数 (`seats`), 座席タイプ (`seat_type`), Wi-Fi (`wifi`), Wi-Fi速度 (`wifi_speed`), コンセント (`outlet`), 照明 (`lighting`), 会議室 (`meeting_room`), 駐車場 (`parking`), 禁煙/喫煙 (`smoking`) | number/enum/bool | enum は dev-rule 記述の文字列を利用 |
| サービス | コーヒー価格 (`coffee_price`), 飲食物持込 (`bring_own_food`), アルコール (`alcohol`), サービス (`services`), 支払方法 (`payment_methods`) | number, enum, multi-select(JSON) | multi-select は string 配列 |
| 利用傾向 | 混雑度 (`crowdedness`), 客層 (`customer_types`) | enum / multi-select | |
| 雰囲気 | カジュアル度 (`ambience_casual`), モダン度 (`ambience_modern`), アンバサダーコメント (`ambassador_comment`) | number(1-5), text | |
| 画像 | カバー画像 (`cafe_images.image_url`) | string | Supabase Storage にアップロードし、返却されたパスを保存 |
| その他 | 最終更新（自動）, ウェブサイト (`website`), 論理削除 (`deleted_at`) | date/URL/timestamp | `deleted_at` が `NULL` のみ通常表示 |

---

## 5. ユースケースとフロー

### 5.1 カフェ登録フロー

1. 管理者が `/admin/cafes` にアクセスし、ID/PW フォームに `cafe / hakadoru` を入力。  
   - 認証成功時にセッショントークン（署名済み Cookie または localStorage）を設定。  
   - 認証エラー時はトーストで一定回数までリトライ（レートリミットは不要）。
2. 右上の「新規登録」ボタン押下で `CafeFormDrawer` を開く。  
3. 必須項目を入力 → `zod` スキーマでクライアントバリデーション。  
4. 必要に応じて画像をアップロード → Supabase Storage バケットへ保存し、返却パスを `cafe_images` に保存。  
5. 送信で `createCafe()`（`app/lib/api.ts` に実装）を呼び出し、Supabase の `cafes` に `insert`。  
6. 成功時にトースト通知・ドロワーを閉じ、SSR/CSR の再取得で一覧を更新。失敗時はエラーメッセージ表示。

### 5.2 カフェ更新フロー

1. 一覧の行アクションから「編集」をクリック。  
2. `CafeFormDrawer` を既存データでプレフィル。  
3. 画像差し替えの場合は Storage へアップロードし、旧ファイルがあれば任意で削除。  
4. 入力編集後に `updateCafe(id, payload)` を呼び出し `supabase.from("cafes").update(payload).eq("id", id)` を実行。  
5. 更新成功後、`updated_at` が自動変更されるため、一覧は最新順に再ソート。  
6. 変更差分は `zod` で再検証し、enum/数値範囲を保証する。

### 5.3 カフェ削除フロー

1. 行アクション「削除」をクリック。  
2. `CafeDeleteDialog` で確認文言・対象名を表示。  
3. `archiveCafe(id)` を呼び出し、`deleted_at` に現在時刻をセット（`supabase.from("cafes").update({ deleted_at: new Date().toISOString() }).eq("id", id)`）。  
4. 一覧は `deleted_at IS NULL` のデータのみ表示するため、操作後に自動で非表示。必要に応じて「削除済みを表示」トグルを用意。  
5. Storage 内の画像は残し、別タスクでクリーンアップを検討。

---

## 6. UI/UX 詳細

### 6.1 レイアウト

- 管理者ダッシュボード共通レイアウトを想定 (`app/components/layout/AdminLayout.tsx` など)。  
- 最初に簡易ログインフォームを表示。認証済みならダッシュボードに切り替え。  
- 上部: 画面タイトル + 行動ボタン（新規登録 / CSV 出力(将来)）。  
- 中央: カフェ一覧テーブル。  
- 右側 or モーダル: フィルター（エリア、Wi-Fi 等）と論理削除フィルタ。

### 6.2 一覧テーブル仕様

| 列 | 内容 | 備考 |
| --- | --- | --- |
| 店舗名 | `name` + エリアバッジ | カードクリックで編集 |
| Wi-Fi/電源 | アイコン表示 | `wifi`, `outlet` を視覚化 |
| ステータス | `status` | 色付きバッジ |
| 表示状態 | `deleted_at` の有無 | 「公開中 / 削除済み」で表示 |
| 更新日 | `updated_at` | 日付フォーマット `YYYY/MM/DD` |
| アクション | 編集 / 削除 | Button + Menu |

ページネーションは 20 件/ページ (`DEFAULT_PAGE_SIZE` 定数)。

### 6.3 フォーム仕様

- 各セクションをアコーディオン化し入力負荷を軽減。  
- 入力部品は `app/components/common/` の `Input`, `Select`, `Textarea` を利用。  
- 数値フィールドは `type="number"` + step 指定。  
- `services`, `payment_methods`, `customer_types` は複数選択用のタグコンポーネント。

### 6.4 バリデーション

- `app/lib/validation.ts` に `adminCafeSchema` を追加。`zod` で必須/enum/範囲チェック。  
- 例外はトースト + フォーム下部のエラー表示。  
- サーバー側でも同スキーマを `safeParse` して二重チェックし、想定外データの DB 反映を防止。

### 6.5 フィードバック

- 成功: `toast.success("カフェを登録しました")` など。  
- 失敗: Supabase エラー内容をログ出力し、ユーザーには一般化したメッセージを表示。  
- 削除: 「削除しました（取り消しはできません）」の警告文を表示。

---

## 7. API / Supabase 操作

`app/lib/api.ts` に以下を追記する。

```typescript
import { supabase } from "@/app/lib/supabase";
import { Cafe } from "@/app/types/cafe";

export async function createCafe(payload: Omit<Cafe, "id" | "created_at" | "updated_at" | "deleted_at">) {
  const { data, error } = await supabase.from("cafes").insert([payload]).select().single();
  if (error) throw error;
  return data as Cafe;
}

export async function updateCafe(id: string, payload: Partial<Cafe>) {
  const { data, error } = await supabase.from("cafes").update(payload).eq("id", id).select().single();
  if (error) throw error;
  return data as Cafe;
}

export async function archiveCafe(id: string) {
  const { data, error } = await supabase
    .from("cafes")
    .update({ deleted_at: new Date().toISOString() })
    .eq("id", id)
    .select()
    .single();
  if (error) throw error;
  return data as Cafe;
}

export async function uploadCafeImage(cafeId: string, file: File) {
  const ext = file.name.split(".").pop();
  const path = `cafes/${cafeId}/${Date.now()}.${ext}`;
  const { error } = await supabase.storage.from("images").upload(path, file);
  if (error) throw error;
  return path; // Supabase Storage のパスをそのまま DB に保存
}
```

- `cafe_images.image_url` にはバケット内のパスを格納し、公開URLは必要時に `getPublicUrl` で生成する。
- `services`, `payment_methods`, `customer_types` は string 配列を JSON に変換して送信する。

---

## 8. 非機能要件

| 項目 | 内容 |
| --- | --- |
| セキュリティ | ID/PW を平文で持つため、URL 秘匿・HTTPS 強制・レートリミット簡易実装（3回失敗で一定時間ロック）を推奨。 |
| パフォーマンス | 一覧は SSR で初回ロードし、検索/ソートは CSR で最小限の再フェッチ。 |
| アクセシビリティ | ラベル明示、フォームエラーを `aria-live="assertive"` に出力。 |
| レスポンシブ | 管理画面は最小幅 1024px を前提にしつつ、タブレット表示も崩れないように `grid` を設定。 |
| 監査ログ | 削除操作は今後の監査需要に備え、Cloud Logging / Supabase Functions で記録（別タスク）。 |

---

## 9. 開発タスクリスト

1. 簡易ログインフォームとセッション保持の実装（ID: `cafe`, PW: `hakadoru`）。  
2. `app/components/admin/cafes/` 配下の UI コンポーネント実装。  
3. Supabase API 呼び出し関数（create/update/archive/upload）と型整備。  
4. `deleted_at` カラム追加を含む DB マイグレーション。  
5. `adminCafeSchema` の作成とフォーム統合。  
6. テーブル・フォーム連携（prefetch, optimistic update）。  
7. E2E テスト（Playwright）で登録/更新/論理削除・画像アップロードフローを確認。

---

## 10. 今後の拡張案

- Storage ファイルの自動クリーンアップ機能（論理削除時に別処理で削除）。  
- 複数カフェを CSV インポートする一括登録機能。  
- 変更履歴テーブルを追加して監査ログを保持。  
- `cafe_requests` と連動し、申請を取り込んで自動で下書きを作成。

以上の仕様に基づき、カフェ登録・カフェ更新/削除の管理画面を Next.js で実装する。
