# ハカドルカフェ 開発標準ルール

**プロジェクト名**: ハカドルカフェ (ハカドルカフェ)
**バージョン**: 2.0
**最終更新日**: 2025-01-01

---

## 目次

1. [コーディング規約](#1-コーディング規約)
2. [プロジェクト構成](#2-プロジェクト構成)
3. [命名規則](#3-命名規則)
4. [コンポーネント設計](#4-コンポーネント設計)
5. [状態管理](#5-状態管理)
6. [スタイリング](#6-スタイリング)
7. [データ管理](#7-データ管理)
8. [ルーティング](#8-ルーティング)
9. [エラーハンドリング](#9-エラーハンドリング)
10. [パフォーマンス](#10-パフォーマンス)
11. [アクセシビリティ](#11-アクセシビリティ)
12. [Git運用](#12-git運用)
13. [テスト](#13-テスト)
14. [セキュリティ](#14-セキュリティ)
15. [ドキュメント](#15-ドキュメント)

---

## 1. コーディング規約

### 1.1 言語とフレームワーク

- **言語**: TypeScript (strictモード有効)
  - コンポーネントファイル: `.tsx`
  - ユーティリティファイル: `.ts`
  - **JavaScript (.js, .jsx) は使用禁止**
- **フレームワーク**: Next.js 15.x (App Router)
- **UIライブラリ**: React 19.x
- **スタイリング**: TailwindCSS
- **データ層**: Supabase (PostgreSQL + Auth + Storage)
- **パッケージマネージャー**: npm
- **コード整形**: ESLint + Prettier（後述）


### 1.2 TypeScript設定

#### 1.2.1 tsconfig.json

```json
{
  "compilerOptions": {
    "target": "ES2017",
    "lib": ["dom", "dom.iterable", "esnext"],
    "allowJs": false,
    "skipLibCheck": true,
    "strict": true,
    "noEmit": true,
    "esModuleInterop": true,
    "module": "esnext",
    "moduleResolution": "bundler",
    "resolveJsonModule": true,
    "isolatedModules": true,
    "jsx": "preserve",
    "incremental": true,
    "plugins": [
      {
        "name": "next"
      }
    ],
    "paths": {
      "@/*": ["./*"]
    }
  },
  "include": ["next-env.d.ts", "**/*.ts", "**/*.tsx", ".next/types/**/*.ts"],
  "exclude": ["node_modules"]
}
```

### 1.3 コードスタイル

#### 1.3.1 基本ルール

```typescript
// ✅ Good: use strict equality
if (value === "cafe") {
  // ...
}

// ❌ Bad: avoid loose equality
if (value == "cafe") {
  // ...
}
```

#### 1.3.2 インデント

- スペース2文字でインデント
- タブは使用しない

#### 1.3.3 クォート

- 文字列にはダブルクォート (`"`) を使用
- TSX属性にはダブルクォートを使用

```typescript
// ✅ Good
const name = "Hakadoru Cafe";
<div className="container">...</div>

// ❌ Bad
const name = 'Hakadoru Cafe';
<div className='container'>...</div>
```

#### 1.3.4 セミコロン

- セミコロンを省略しない

#### 1.3.5 型アノテーション

- 明示的な型アノテーションを推奨（推論可能な場合は省略可）
- `any` 型の使用は禁止

```typescript
// ✅ Good
const cafeName: string = "Blue Bottle";
const cafeCount: number = 42;

// ✅ Good: 推論可能な場合は省略可
const cafeName = "Blue Bottle"; // string と推論される

// ❌ Bad: any型
const data: any = fetchData();
```

#### 1.3.6 コメント

```typescript
// ✅ Good: コメントは日本語で記述
// カフェのフィルタリング処理
const filteredCafes = cafes.filter((cafe) => cafe.type.includes("cafe"));

/**
 * 営業中かどうかを判定する関数
 * 平日/休日と現在時刻を考慮して判定を行う
 *
 * @param cafe - カフェオブジェクト
 * @returns 営業中の場合true
 */
const isOpen = (cafe: Cafe): boolean => {
  // ...
};
```

---

## 2. プロジェクト構成

### 2.1 ディレクトリ構造

```
hakadoru-cafe/
├── app/                          # Next.js App Router
│   ├── (pages)/                  # ページコンポーネント（サーバーコンポーネント）
│   │   ├── page.tsx             # ホーム画面
│   │   ├── login/page.tsx       # ログイン／登録画面
│   │   ├── mypage/              # マイページ
│   │   │   └── page.tsx
│   │   ├── cafe/                # カフェ関連ページ
│   │   │   ├── [id]/page.tsx   # カフェ詳細画面
│   │   │   └── search/page.tsx # カフェ詳細検索画面
│   │   ├── report/              # 作業報告関連
│   │   │   ├── page.tsx        # 作業報告一覧画面
│   │   │   └── [id]/page.tsx   # 作業報告投稿画面
│   │   ├── request/             # カフェ掲載関連
│   │   │   ├── new/page.tsx    # 掲載リクエスト画面
│   │   │   └── edit/page.tsx   # 情報修正リクエスト画面
│   │   └── profile/             # プロフィール関連
│   │       ├── edit/page.tsx    # プロフィール編集画面
│   │       └── withdraw/page.tsx # 退会画面
│   ├── components/              # クライアントコンポーネント（カテゴリ別）
│   │   ├── layout/              # レイアウト関連
│   │   │   ├── Header.tsx
│   │   │   ├── Footer.tsx
│   │   │   └── Navigation.tsx
│   │   ├── cafe/                # カフェ関連
│   │   │   ├── CafeCard.tsx         # カフェカード
│   │   │   ├── CafeList.tsx         # カフェ一覧（リスト）
│   │   │   ├── CafeMap.tsx          # カフェ一覧（マップ）
│   │   │   ├── CafeDetail.tsx       # カフェ詳細表示
│   │   │   ├── CafeFilter.tsx       # カフェフィルター
│   │   │   └── CafeSearchBar.tsx    # カフェ検索バー
│   │   ├── map/                 # 地図関連
│   │   │   ├── Map.tsx
│   │   │   ├── MapMarker.tsx
│   │   │   └── MapControls.tsx
│   │   ├── auth/                # 認証関連
│   │   │   ├── LoginForm.tsx
│   │   │   ├── RegisterForm.tsx
│   │   │   └── SocialAuthButtons.tsx
│   │   ├── report/              # 作業報告関連
│   │   │   ├── ReportList.tsx
│   │   │   ├── ReportCard.tsx
│   │   │   └── ReportForm.tsx
│   │   ├── request/             # リクエスト関連
│   │   │   ├── RequestForm.tsx
│   │   │   ├── RequestList.tsx
│   │   │   └── RequestCard.tsx
│   │   ├── profile/             # プロフィール関連
│   │   │   ├── ProfileEditForm.tsx
│   │   │   └── WithdrawForm.tsx
│   │   └── common/              # 共通コンポーネント
│   │       ├── Button.tsx
│   │       ├── Input.tsx
│   │       ├── Select.tsx
│   │       ├── Textarea.tsx
│   │       ├── Modal.tsx
│   │       ├── Loading.tsx
│   │       └── ErrorBoundary.tsx
│   ├── contexts/                # Context API
│   │   ├── AuthContext.tsx
│   │   └── ThemeContext.tsx
│   ├── providers/               # Providerコンポーネント
│   │   ├── Providers.tsx
│   │   └── MapProvider.tsx
│   ├── types/                   # TypeScript型定義
│   │   ├── cafe.ts
│   │   ├── report.ts
│   │   ├── user.ts
│   │   └── request.ts
│   ├── lib/                     # ユーティリティ関数
│   │   ├── api.ts               # API呼び出し
│   │   ├── utils.ts             # 汎用ユーティリティ
│   │   ├── validation.ts        # バリデーション
│   │   └── constants.ts         # 定数定義
│   ├── hooks/                   # カスタムHooks
│   │   ├── useCafe.ts
│   │   ├── useAuth.ts
│   │   └── useMap.ts
│   ├── layout.tsx               # ルートレイアウト
│   └── globals.css              # グローバルCSS（TailwindCSS）
├── public/                      # 静的ファイル
│   ├── data/                    # JSONデータ（開発用）
│   │   ├── cafes.json
│   │   └── reports.json
│   └── images/                  # 画像ファイル
├── docs/                        # ドキュメント
│   ├── requirements.md          # 機能定義書
│   └── dev-rule.md              # 開発標準ルール (本ファイル)
├── package.json
├── tsconfig.json                # TypeScript設定
├── tailwind.config.ts           # TailwindCSS設定
├── next.config.ts               # Next.js設定
└── README.md
```

### 2.2 ファイル配置ルール

#### 2.2.1 ページコンポーネント（サーバーコンポーネント）

- `app/(pages)/` 配下に配置
- **必ず `page.tsx` のみを配置**
- **全てサーバーコンポーネントとして実装**
- API呼び出しによるデータ取得と、各子コンポーネントの配置のみを担う
- `"use client"` ディレクティブは使用しない

```typescript
// ✅ Good: page.tsx（サーバーコンポーネント）
// app/(pages)/cafe/[id]/page.tsx
import { CafeDetail } from "@/app/components/cafe/CafeDetail";
import { fetchCafe } from "@/app/lib/api";
import { notFound } from "next/navigation";

interface PageProps {
  params: { id: string };
}

export default async function CafeDetailPage({ params }: PageProps) {
  const cafe = await fetchCafe(params.id);

  if (!cafe) {
    notFound();
  }

  return (
    <main className="min-h-screen bg-gray-50">
      <CafeDetail cafe={cafe} />
    </main>
  );
}
```

#### 2.2.2 クライアントコンポーネント

- `app/components/` 配下に**カテゴリごとのフォルダ**を作成
- 各カテゴリフォルダの中に `.tsx` ファイルを配置
- インタラクティブな処理が必要な場合は `"use client"` を使用

**カテゴリ一覧**:
- `layout/`: ヘッダー、フッター、ナビゲーション
- `cafe/`: カフェ関連コンポーネント
- `map/`: 地図関連コンポーネント
- `auth/`: 認証フォーム
- `report/`: 作業報告関連
- `request/`: カフェ掲載リクエスト関連
- `profile/`: プロフィール関連
- `common/`: ボタン、入力フォームなどの汎用コンポーネント

```typescript
// ✅ Good: クライアントコンポーネント
// app/components/cafe/CafeCard.tsx
"use client";

import { useState } from "react";
import { Cafe } from "@/app/types/cafe";
import clsx from "clsx";

interface CafeCardProps {
  cafe: Cafe;
  onFavoriteToggle: (id: string) => void;
  isFavorite?: boolean;
}

export function CafeCard({ cafe, onFavoriteToggle, isFavorite = false }: CafeCardProps) {
  const [isHovered, setIsHovered] = useState(false);

  return (
    <div
      className={clsx(
        "p-4 bg-white rounded-lg shadow-md transition-shadow cursor-pointer",
        isHovered && "shadow-lg"
      )}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      {/* カフェ情報 */}
    </div>
  );
}
```

#### 2.2.3 型定義

- `app/types/` に配置
- エンティティごとにファイルを分割
- 例: `cafe.ts`, `report.ts`, `user.ts`, `request.ts`

```typescript
// app/types/cafe.ts
export interface Cafe {
  id: string;
  name: string;
  area: string;
  address: string;
  access: string;
  hours: {
    weekday: string;
    weekend: string;
  };
  regularHoliday: string;
  timeLimit: string | null;
  website: string | null;
  phone: string;
  seats: number;
  seatType: string;
  wifi: boolean;
  wifiSpeed: string | null;
  outlet: "all" | "most" | "half" | "some" | "none";
  lighting: "dark" | "normal" | "bright";
  meetingRoom: boolean;
  parking: boolean;
  smoking: "no-smoking" | "separated" | "e-cigarette" | "allowed";
  coffeePrice: number;
  bringOwnFood: "allowed" | "not-allowed" | "drinks-only";
  alcohol: "available" | "night-only" | "unavailable";
  paymentMethods: string[];
  crowdedness: "empty" | "normal" | "crowded";
  customerType: string[];
  ambience: {
    casual: number; // 1-5
    modern: number; // 1-5
  };
  hakadoriScore: number; // 1-5
  ambassadorComment: string | null;
  lastUpdated: string;
}
```

#### 2.2.4 カスタムHooks

- `app/hooks/` に配置
- `use` プレフィックスで始める
- 再利用可能なロジックを抽出

```typescript
// app/hooks/useCafe.ts
"use client";

import { useState, useEffect } from "react";
import { Cafe } from "@/app/types/cafe";
import { fetchCafes } from "@/app/lib/api";

export function useCafes() {
  const [cafes, setCafes] = useState<Cafe[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    fetchCafes()
      .then(setCafes)
      .catch(setError)
      .finally(() => setLoading(false));
  }, []);

  return { cafes, loading, error };
}
```

---

## 3. 命名規則

### 3.1 ファイル名

#### 3.1.1 コンポーネントファイル

- **PascalCase** を使用
- `.tsx` 拡張子を使用
- 例: `Header.tsx`, `CafeCard.tsx`, `AuthContext.tsx`

#### 3.1.2 ページファイル

- Next.js App Routerの規約に従う
- `.tsx` 拡張子を使用
- `page.tsx`, `layout.tsx`, `loading.tsx`, `error.tsx`, `not-found.tsx`

#### 3.1.3 ユーティリティファイル

- **camelCase** を使用
- `.ts` 拡張子を使用
- 例: `api.ts`, `utils.ts`, `validation.ts`

#### 3.1.4 型定義ファイル

- **camelCase** を使用
- `.ts` 拡張子を使用
- 例: `cafe.ts`, `user.ts`, `report.ts`

#### 3.1.5 設定ファイル

- **kebab-case** を使用
- 例: `next.config.ts`, `tailwind.config.ts`

### 3.2 変数・関数名

#### 3.2.1 変数名

- **camelCase** を使用
- boolean値は `is`, `has`, `should` などの接頭辞を付ける

```typescript
// ✅ Good
const cafeList: Cafe[] = [];
const isOpen: boolean = true;
const hasWifi: boolean = false;
const shouldShowFilter: boolean = true;
const userCount: number = 42;
```

#### 3.2.2 関数名

- **camelCase** を使用
- 動詞で始める

```typescript
// ✅ Good
const getCafes = async (): Promise<Cafe[]> => { /* ... */ };
const handleClick = (): void => { /* ... */ };
const fetchData = async (): Promise<void> => { /* ... */ };
const validateForm = (data: FormData): boolean => { /* ... */ };
```

#### 3.2.3 コンポーネント名

- **PascalCase** を使用

```typescript
// ✅ Good
export default function CafeDetailPage() { /* ... */ }
export function CafeCard({ cafe }: CafeCardProps) { /* ... */ }

// ❌ Bad
export default function cafeDetailPage() { /* ... */ }
export function cafeCard({ cafe }: CafeCardProps) { /* ... */ }
```

#### 3.2.4 定数名

- **UPPER_SNAKE_CASE** を使用（グローバル定数）
- ローカル定数は通常の camelCase でも可

```typescript
// ✅ Good: グローバル定数
export const API_BASE_URL = "https://api.hakadoru-cafe.com";
export const MAX_UPLOAD_SIZE = 5 * 1024 * 1024; // 5MB
export const DEFAULT_PAGE_SIZE = 20;

// ✅ Good: ローカル定数
const defaultOptions = {
  timeout: 3000,
};
```

### 3.3 TypeScript型定義

#### 3.3.1 型名

- **PascalCase** を使用
- インターフェースは `interface` を使用
- 型エイリアスは `type` を使用

```typescript
// ✅ Good
export interface Cafe {
  id: string;
  name: string;
}

export type CafeType = "cafe" | "lounge";
export type OutletAvailability = "all" | "most" | "half" | "some" | "none";

// ❌ Bad
export interface cafe {
  id: string;
}

export type cafeType = "cafe" | "lounge";
```

---

## 4. コンポーネント設計

### 4.1 サーバーコンポーネントとクライアントコンポーネント

#### 4.1.1 Server Component（デフォルト）

- **page.tsx は必ずサーバーコンポーネント**
- `"use client"` ディレクティブは使用しない
- データ取得と子コンポーネントの配置のみを担う
- async/await でデータを取得

```typescript
// ✅ Good: page.tsx（サーバーコンポーネント）
// app/(pages)/page.tsx
import { CafeList } from "@/app/components/cafe/CafeList";
import { CafeMap } from "@/app/components/cafe/CafeMap";
import { fetchCafes } from "@/app/lib/api";

export default async function HomePage() {
  // サーバーサイドでデータ取得
  const cafes = await fetchCafes();

  return (
    <main className="min-h-screen bg-gray-50">
      <div className="container mx-auto px-4 py-8">
        <h1 className="text-3xl font-bold mb-8">作業カフェを探す</h1>
        <CafeMap cafes={cafes} />
        <CafeList cafes={cafes} />
      </div>
    </main>
  );
}
```

#### 4.1.2 Client Component

- `app/components/` 配下のコンポーネント
- インタラクティブな処理（useState、useEffect、イベントハンドラー等）が必要な場合
- ファイルの先頭に `"use client"` を記述

```typescript
// ✅ Good: クライアントコンポーネント
// app/components/cafe/CafeList.tsx
"use client";

import { useState } from "react";
import { Cafe } from "@/app/types/cafe";
import { CafeCard } from "./CafeCard";

interface CafeListProps {
  cafes: Cafe[];
}

export function CafeList({ cafes }: CafeListProps) {
  const [searchQuery, setSearchQuery] = useState("");
  const [filteredCafes, setFilteredCafes] = useState(cafes);

  const handleSearch = (query: string) => {
    setSearchQuery(query);
    const filtered = cafes.filter((cafe) =>
      cafe.name.toLowerCase().includes(query.toLowerCase())
    );
    setFilteredCafes(filtered);
  };

  return (
    <div className="space-y-4">
      <input
        type="text"
        value={searchQuery}
        onChange={(e) => handleSearch(e.target.value)}
        placeholder="カフェを検索"
        className="w-full px-4 py-2 border border-gray-300 rounded-lg"
      />
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {filteredCafes.map((cafe) => (
          <CafeCard key={cafe.id} cafe={cafe} />
        ))}
      </div>
    </div>
  );
}
```

#### 4.1.3 コンポーネント分割方針

- **1ファイル1コンポーネント**を原則とする
- サブコンポーネントが小規模な場合のみ、同じファイル内に定義可能

### 4.2 Props設計

#### 4.2.1 Props型定義

- **必ずTypeScriptの型を定義**
- インターフェースで定義し、コンポーネント名 + `Props` という命名

```typescript
// ✅ Good
interface CafeCardProps {
  cafe: Cafe;
  onFavoriteToggle: (id: string) => void;
  isFavorite?: boolean;
}

export function CafeCard({
  cafe,
  onFavoriteToggle,
  isFavorite = false
}: CafeCardProps) {
  // ...
}
```

#### 4.2.2 Props命名規則

- 明確で説明的な名前を使用
- イベントハンドラーは `on` で始める
- boolean値は `is`, `has`, `should` などの接頭辞を付ける

```typescript
// ✅ Good
interface ButtonProps {
  label: string;
  onClick: () => void;
  isDisabled?: boolean;
  hasIcon?: boolean;
  variant?: "primary" | "secondary";
}
```

#### 4.2.3 Propsの分割代入

- 関数パラメータで型付き分割代入を使用
- デフォルト値を設定可能

```typescript
// ✅ Good
interface InfoItemProps {
  label: string;
  value: string;
  className?: string;
}

export function InfoItem({
  label,
  value,
  className = ""
}: InfoItemProps) {
  return (
    <div className={`space-y-1 ${className}`}>
      <div className="text-sm text-gray-500">{label}</div>
      <div className="text-base font-medium text-gray-900">{value}</div>
    </div>
  );
}
```

### 4.3 Hooks使用ルール

#### 4.3.1 Hooks配置順序

1. `useState`
2. `useEffect`
3. `useContext`
4. カスタムHooks
5. その他のHooks
6. イベントハンドラー関数

```typescript
// ✅ Good
export function MyComponent() {
  const [data, setData] = useState<Cafe[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchData();
  }, []);

  const { user } = useAuth();
  const { favorites } = useFavorites();

  const handleClick = () => {
    // ...
  };

  return <div>...</div>;
}
```

#### 4.3.2 useEffectの依存配列

- 依存配列を必ず指定
- 空配列 `[]` はマウント時のみ実行

```typescript
// ✅ Good
useEffect(() => {
  fetchData();
}, []); // マウント時のみ

useEffect(() => {
  updateView();
}, [selectedCafe]); // selectedCafe変更時

// ❌ Bad: 依存配列なし
useEffect(() => {
  fetchData();
});
```

---

## 5. 状態管理

### 5.1 認証（Supabase Auth）

#### 5.1.1 認証の基本方針

- **認証機能はSupabaseで実装**
- OAuth2（Google/X/LINE）によるSSO認証
- セッション管理はSupabaseが自動的に担当
- JWTトークンによる認証状態の管理

#### 5.1.2 Supabase Authのセットアップ

```typescript
// app/lib/auth.ts
import { supabase } from "./supabase";

/**
 * Googleアカウントでログイン
 */
export async function signInWithGoogle() {
  const { data, error } = await supabase.auth.signInWithOAuth({
    provider: "google",
    options: {
      redirectTo: `${process.env.NEXT_PUBLIC_APP_URL}/auth/callback`,
    },
  });

  if (error) {
    console.error("Google sign-in error:", error);
    throw error;
  }

  return data;
}

/**
 * X (Twitter) アカウントでログイン
 */
export async function signInWithTwitter() {
  const { data, error } = await supabase.auth.signInWithOAuth({
    provider: "twitter",
    options: {
      redirectTo: `${process.env.NEXT_PUBLIC_APP_URL}/auth/callback`,
    },
  });

  if (error) {
    console.error("Twitter sign-in error:", error);
    throw error;
  }

  return data;
}

/**
 * LINE アカウントでログイン
 */
export async function signInWithLine() {
  const { data, error } = await supabase.auth.signInWithOAuth({
    provider: "line",
    options: {
      redirectTo: `${process.env.NEXT_PUBLIC_APP_URL}/auth/callback`,
    },
  });

  if (error) {
    console.error("LINE sign-in error:", error);
    throw error;
  }

  return data;
}

/**
 * ログアウト
 */
export async function signOut() {
  const { error } = await supabase.auth.signOut();

  if (error) {
    console.error("Sign out error:", error);
    throw error;
  }
}

/**
 * 現在ログイン中のユーザー情報を取得（サーバーサイド）
 */
export async function getUser() {
  const { data: { user }, error } = await supabase.auth.getUser();

  if (error) {
    console.error("Get user error:", error);
    return null;
  }

  return user;
}

/**
 * 現在のセッション情報を取得
 */
export async function getSession() {
  const { data: { session }, error } = await supabase.auth.getSession();

  if (error) {
    console.error("Get session error:", error);
    return null;
  }

  return session;
}
```

#### 5.1.3 認証コールバックの処理

```typescript
// app/(pages)/auth/callback/page.tsx
import { redirect } from "next/navigation";
import { getSession } from "@/app/lib/auth";

export default async function AuthCallbackPage() {
  const session = await getSession();

  if (!session) {
    redirect("/login");
  }

  // ログイン成功後、ホーム画面にリダイレクト
  redirect("/");
}
```

#### 5.1.4 認証状態の管理（クライアントサイド）

```typescript
// app/contexts/AuthContext.tsx
"use client";

import { createContext, useContext, useState, useEffect, ReactNode } from "react";
import { User } from "@supabase/supabase-js";
import { supabase } from "@/app/lib/supabase";
import { signInWithGoogle, signInWithTwitter, signInWithLine, signOut as authSignOut } from "@/app/lib/auth";

interface AuthContextType {
  user: User | null;
  loading: boolean;
  signInWithGoogle: () => Promise<void>;
  signInWithTwitter: () => Promise<void>;
  signInWithLine: () => Promise<void>;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

interface AuthProviderProps {
  children: ReactNode;
}

export function AuthProvider({ children }: AuthProviderProps) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // 初回セッション取得
    supabase.auth.getSession().then(({ data: { session } }) => {
      setUser(session?.user ?? null);
      setLoading(false);
    });

    // 認証状態の変化を監視
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null);
    });

    return () => subscription.unsubscribe();
  }, []);

  const handleSignInWithGoogle = async () => {
    await signInWithGoogle();
  };

  const handleSignInWithTwitter = async () => {
    await signInWithTwitter();
  };

  const handleSignInWithLine = async () => {
    await signInWithLine();
  };

  const handleSignOut = async () => {
    await authSignOut();
    setUser(null);
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        loading,
        signInWithGoogle: handleSignInWithGoogle,
        signInWithTwitter: handleSignInWithTwitter,
        signInWithLine: handleSignInWithLine,
        signOut: handleSignOut,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
}
```

#### 5.1.5 認証Contextの利用

```typescript
// app/components/auth/LoginButtons.tsx
"use client";

import { useAuth } from "@/app/contexts/AuthContext";

export function LoginButtons() {
  const { signInWithGoogle, signInWithTwitter, signInWithLine } = useAuth();

  return (
    <div className="space-y-4">
      <button
        onClick={signInWithGoogle}
        className="w-full px-6 py-3 bg-white border border-gray-300 rounded-lg"
      >
        Googleでログイン
      </button>
      <button
        onClick={signInWithTwitter}
        className="w-full px-6 py-3 bg-black text-white rounded-lg"
      >
        Xでログイン
      </button>
      <button
        onClick={signInWithLine}
        className="w-full px-6 py-3 bg-green-500 text-white rounded-lg"
      >
        LINEでログイン
      </button>
    </div>
  );
}
```

### 5.2 Context API

#### 5.2.1 Context作成

- `app/contexts/` に配置
- Provider と Custom Hook をセットで作成
- 認証以外の状態管理にも利用可能

### 5.3 State管理

#### 5.3.1 State配置原則

- **最小限の状態**を持つ
- 計算可能な値はStateにしない

```typescript
// ✅ Good: 必要最小限
const [cafes, setCafes] = useState<Cafe[]>([]);
const [searchQuery, setSearchQuery] = useState("");

// 計算可能な値はその場で計算
const filteredCafes = cafes.filter((cafe) =>
  cafe.name.toLowerCase().includes(searchQuery.toLowerCase())
);

// ❌ Bad: 冗長なState
const [filteredCafes, setFilteredCafes] = useState<Cafe[]>([]); // 不要
```

---

## 6. スタイリング

### 6.1 TailwindCSS

#### 6.1.1 基本ルール

- 本プロジェクトでは **TailwindCSS** を標準とする
- ユーティリティクラスを直接JSX/TSXに記述
- インラインスタイル（`style` 属性）は原則使用しない

```typescript
// ✅ Good: TailwindCSS
<div className="p-4 bg-white rounded-lg shadow-md">
  <h2 className="text-xl font-bold text-gray-900">タイトル</h2>
  <p className="mt-2 text-sm text-gray-600">説明文</p>
</div>

// ❌ Bad: インラインスタイル
<div style={{ padding: "16px", background: "white", borderRadius: "8px" }}>
  <h2 style={{ fontSize: "20px", fontWeight: "bold" }}>タイトル</h2>
</div>
```

#### 6.1.2 動的スタイル

- 条件分岐には `clsx` を使用

```typescript
// ✅ Good: clsxを使用
import clsx from "clsx";

<button
  className={clsx(
    "px-4 py-2 rounded-lg font-medium transition-colors",
    isActive ? "bg-primary text-white" : "bg-gray-100 text-gray-700",
    isDisabled && "opacity-50 cursor-not-allowed"
  )}
>
  {label}
</button>
```

#### 6.1.3 カスタムクラスの作成

- 繰り返し使用するスタイルは `@apply` でカスタムクラス化
- `globals.css` に定義

```css
/* app/globals.css */
@tailwind base;
@tailwind components;
@tailwind utilities;

@layer components {
  .btn-primary {
    @apply px-6 py-3 bg-primary text-white rounded-lg font-medium;
    @apply hover:bg-primary-dark transition-colors;
    @apply disabled:opacity-50 disabled:cursor-not-allowed;
  }

  .cafe-card {
    @apply p-6 bg-white rounded-lg shadow-md;
    @apply hover:shadow-lg transition-shadow cursor-pointer;
  }

  .input-field {
    @apply w-full px-4 py-2 border border-gray-300 rounded-lg;
    @apply focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent;
  }
}
```

### 6.2 カラーパレット（TailwindCSS設定）

#### 6.2.1 tailwind.config.ts

```typescript
// tailwind.config.ts
import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./app/**/*.{ts,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        primary: {
          DEFAULT: "#19414D",
          dark: "#0F2A33",
          light: "#276578",
        },
        secondary: {
          DEFAULT: "#FF8FA3",
          light: "#FFB3C1",
        },
        cafe: {
          badge: "#FFE4EC",
          text: "#19414D",
        },
        lounge: {
          badge: "#E8F4FF",
          text: "#4A90E2",
        },
      },
    },
  },
  plugins: [],
};

export default config;
```

### 6.3 レスポンシブデザイン

#### 6.3.1 TailwindCSSブレークポイント

```typescript
// ✅ Good: モバイルファースト
<div className="px-4 md:px-8 lg:px-16">
  <h1 className="text-2xl md:text-3xl lg:text-4xl font-bold">タイトル</h1>
  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
    {/* カフェカード */}
  </div>
</div>
```

---

## 7. データ管理

### 7.1 データベース（Supabase）

#### 7.1.1 データベース構成

- **データベース**: Supabase（PostgreSQL）
- **すべてのデータ授受はSupabaseを経由**
- テーブル設計は `requirements.md` の「カフェ詳細情報項目一覧」に準拠
- RLS (Row Level Security) を活用したセキュリティ設計

#### 7.1.2 Supabaseクライアントのセットアップ

```typescript
// app/lib/supabase.ts
import { createClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

export const supabase = createClient(supabaseUrl, supabaseAnonKey);
```

#### 7.1.3 データ取得（SELECT）

**カフェ一覧の取得**:

```typescript
// app/lib/api.ts
import { supabase } from "./supabase";
import { Cafe } from "@/app/types/cafe";

export async function fetchCafes(): Promise<Cafe[]> {
  const { data, error } = await supabase
    .from("cafes")
    .select("*")
    .order("created_at", { ascending: false });

  if (error) {
    console.error("Error fetching cafes:", error);
    throw error;
  }

  return data as Cafe[];
}
```

**カフェ詳細の取得**:

```typescript
export async function fetchCafe(id: string): Promise<Cafe | null> {
  const { data, error } = await supabase
    .from("cafes")
    .select("*")
    .eq("id", id)
    .single();

  if (error) {
    console.error("Error fetching cafe:", error);
    throw error;
  }

  return data as Cafe;
}
```

**フィルタリング付きの取得**:

```typescript
export async function fetchCafesByArea(area: string): Promise<Cafe[]> {
  const { data, error } = await supabase
    .from("cafes")
    .select("*")
    .eq("area", area);

  if (error) throw error;
  return data as Cafe[];
}
```

#### 7.1.4 データ挿入（INSERT）

```typescript
export async function createCafeRequest(cafeData: Partial<Cafe>): Promise<void> {
  const { error } = await supabase
    .from("cafe_requests")
    .insert([cafeData]);

  if (error) {
    console.error("Error creating cafe request:", error);
    throw error;
  }
}
```

#### 7.1.5 データ更新（UPDATE）

```typescript
export async function updateUserProfile(userId: string, profile: Partial<User>): Promise<void> {
  const { error } = await supabase
    .from("users")
    .update(profile)
    .eq("id", userId);

  if (error) {
    console.error("Error updating user profile:", error);
    throw error;
  }
}
```

#### 7.1.6 データ削除（DELETE）

```typescript
export async function deleteReport(reportId: string): Promise<void> {
  const { error } = await supabase
    .from("reports")
    .delete()
    .eq("id", reportId);

  if (error) {
    console.error("Error deleting report:", error);
    throw error;
  }
}
```

#### 7.1.7 リアルタイム購読（Realtime）

```typescript
// app/hooks/useCafes.ts
"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/app/lib/supabase";
import { Cafe } from "@/app/types/cafe";

export function useCafes() {
  const [cafes, setCafes] = useState<Cafe[]>([]);

  useEffect(() => {
    // 初回データ取得
    fetchCafes().then(setCafes);

    // リアルタイム購読
    const channel = supabase
      .channel("cafes")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "cafes" },
        (payload) => {
          console.log("Change received!", payload);
          fetchCafes().then(setCafes);
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  return { cafes };
}
```

### 7.2 データスキーマ

- 詳細は `requirements.md` の「カフェ詳細情報項目一覧」を参照
- TypeScript型定義は `app/types/` に配置
- Supabaseのテーブル定義と型定義を一致させる

### 7.3 Storage（画像・ファイル管理）

#### 7.3.1 画像アップロード

```typescript
// app/lib/storage.ts
import { supabase } from "./supabase";

export async function uploadCafeImage(file: File, cafeId: string): Promise<string> {
  const fileExt = file.name.split(".").pop();
  const fileName = `${cafeId}-${Date.now()}.${fileExt}`;
  const filePath = `cafes/${fileName}`;

  const { error } = await supabase.storage
    .from("images")
    .upload(filePath, file);

  if (error) {
    console.error("Error uploading image:", error);
    throw error;
  }

  // 公開URLを取得
  const { data } = supabase.storage
    .from("images")
    .getPublicUrl(filePath);

  return data.publicUrl;
}
```

#### 7.3.2 画像削除

```typescript
export async function deleteCafeImage(filePath: string): Promise<void> {
  const { error } = await supabase.storage
    .from("images")
    .remove([filePath]);

  if (error) {
    console.error("Error deleting image:", error);
    throw error;
  }
}
```

---

## 8. ルーティング

### 8.1 ページルーティング

| パス | ファイルパス | 認証 | 画面名 |
|------|------------|------|------|
| `/` | `app/(pages)/page.tsx` | 不要 | ホーム画面 |
| `/login` | `app/(pages)/login/page.tsx` | 不要 | ログイン／登録画面 |
| `/mypage` | `app/(pages)/mypage/page.tsx` | 必須 | マイページ画面 |
| `/cafe/[id]` | `app/(pages)/cafe/[id]/page.tsx` | 不要 | カフェ詳細画面 |
| `/cafe/search` | `app/(pages)/cafe/search/page.tsx` | 不要 | カフェ詳細検索画面 |
| `/report` | `app/(pages)/report/page.tsx` | 不要 | 作業報告一覧画面 |
| `/report/[id]` | `app/(pages)/report/[id]/page.tsx` | 必須 | 作業報告投稿画面 |
| `/request/new` | `app/(pages)/request/new/page.tsx` | 必須 | 掲載リクエスト画面 |
| `/request/edit` | `app/(pages)/request/edit/page.tsx` | 必須 | 情報修正リクエスト画面 |
| `/profile/edit` | `app/(pages)/profile/edit/page.tsx` | 必須 | プロフィール編集画面 |
| `/profile/withdraw` | `app/(pages)/profile/withdraw/page.tsx` | 必須 | 退会画面 |

### 8.2 認証ガード

```typescript
// ✅ Good: サーバーコンポーネントで認証チェック
// app/(pages)/mypage/page.tsx
import { redirect } from "next/navigation";
import { getUser } from "@/app/lib/auth";
import { MyPageContent } from "@/app/components/profile/MyPageContent";

export default async function MyPage() {
  const user = await getUser();

  if (!user) {
    redirect("/login");
  }

  return (
    <main className="min-h-screen bg-gray-50">
      <MyPageContent user={user} />
    </main>
  );
}
```

---

## 9. エラーハンドリング

### 9.1 エラー表示

```typescript
// ✅ Good: トーストライブラリの使用
import { toast } from "sonner";

const handleSubmit = async () => {
  try {
    await submitForm(data);
    toast.success("送信が完了しました");
  } catch (error) {
    toast.error("送信に失敗しました");
    console.error(error);
  }
};
```

### 9.2 バリデーション

```typescript
// app/lib/validation.ts
import { z } from "zod";

export const cafeSchema = z.object({
  name: z.string().min(1, "店舗名は必須です"),
  area: z.string().min(1, "エリアは必須です"),
  address: z.string().min(1, "住所は必須です"),
  phone: z.string().regex(/^\d{2,4}-\d{2,4}-\d{4}$/, "電話番号の形式が正しくありません"),
});

export type CafeFormData = z.infer<typeof cafeSchema>;
```

---

## 10. パフォーマンス

### 10.1 画像最適化

```typescript
// ✅ Good: Next.js Image
import Image from "next/image";

<Image
  src={cafe.imageUrl}
  alt={cafe.name}
  width={400}
  height={300}
  className="rounded-lg"
  priority // 重要な画像のみ
/>
```

---

## 11. Git運用

### 11.1 ブランチ戦略

```
main              # 本番環境
develop           # 開発環境
feature/xxx       # 機能開発
bugfix/xxx        # バグ修正
hotfix/xxx        # 緊急修正
```

### 11.2 コミットメッセージ

```
feat: カフェ詳細ページに作業報告機能を追加

- 作業報告投稿モーダルを実装
- ゲスト投稿とログイン投稿の切り替えに対応
- 作業報告一覧の表示機能を追加
```

---

## 付録: チェックリスト

### コードレビュー時のチェック項目

#### 構成・命名
- [ ] ファイル拡張子が `.tsx` または `.ts` になっているか
- [ ] page.tsx はサーバーコンポーネントとして実装されているか
- [ ] クライアントコンポーネントには `"use client"` が記述されているか
- [ ] コンポーネントがカテゴリごとのフォルダに配置されているか
- [ ] ファイル名・変数名・関数名が命名規則に従っているか

#### TypeScript
- [ ] 全てのPropsに型定義があるか
- [ ] `any` 型を使用していないか
- [ ] 型定義は `app/types/` に適切に配置されているか

#### スタイリング
- [ ] TailwindCSSのユーティリティクラスを使用しているか
- [ ] インラインスタイル（`style` 属性）を使用していないか
- [ ] レスポンシブ対応が適切に実装されているか
- [ ] UI 内で絵文字を使用していないか（可視化が必要な場合はアイコン画像またはSVGを使用すること）

---

**このドキュメントは継続的に更新されます。**
