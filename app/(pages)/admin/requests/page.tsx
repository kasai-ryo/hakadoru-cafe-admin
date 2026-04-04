"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";

type RequestStatus = "pending" | "approved" | "rejected" | "withdrawn";
type RequestKind = "cafe_request" | "cafe_edit_request";
type RequestTab = RequestKind;

type AdminRequestItem = {
  id: string;
  kind: RequestKind;
  accountId: string;
  accountName: string | null;
  status: RequestStatus;
  adminComment: string | null;
  createdAt: string;
  updatedAt: string;
  reviewedAt: string | null;
  payload: unknown;
  cafeId: string | null;
  cafeName: string | null;
  reason: string | null;
};

const STATUS_LABELS: Record<RequestStatus, string> = {
  pending: "審査中",
  approved: "承認",
  rejected: "非承認",
  withdrawn: "取り下げ",
};

const REQUEST_TAB_OPTIONS: { value: RequestTab; label: string }[] = [
  { value: "cafe_request", label: "カフェ掲載リクエスト" },
  { value: "cafe_edit_request", label: "カフェ情報修正リクエスト" },
];

const FIELD_LABELS: Record<string, string> = {
  name: "カフェ名",
  address: "住所",
  hours_weekday: "営業時間（平日）",
  hours_weekend: "営業時間（土日祝）",
  area: "エリア",
  nearest_station: "最寄り駅",
  phone: "電話番号",
  website: "ウェブサイト",
  seats: "座席数",
  wifi: "フリーWi-Fi",
  outlet: "電源",
  lighting: "照明",
  meeting_room: "会議室",
  smoking: "禁煙・喫煙",
  regular_holidays: "定休日",
  time_limit: "利用時間制限",
  coffee_price: "コーヒー1杯の値段",
  bring_own_food: "飲食物持込可否",
  services: "サービス",
  payment_methods: "支払い方法",
  notes: "備考",
  features: "特徴",
  content: "修正内容",
  facility_type: "施設タイプ",
  facilityType: "施設タイプ",
  prefecture: "都道府県",
  postalCode: "郵便番号",
  addressLine1: "住所1",
  addressLine2: "住所2（建物名等）",
  addressLine3: "住所3",
  access: "アクセス",
  nearestStation: "最寄り駅",
  hoursWeekdayFrom: "平日営業開始",
  hoursWeekdayTo: "平日営業終了",
  hoursWeekendFrom: "土日祝営業開始",
  hoursWeekendTo: "土日祝営業終了",
  hoursNote: "営業時間備考",
  regularHolidays: "定休日",
  timeLimit: "利用時間制限",
  meetingRoom: "会議室",
  allowsShortLeave: "一時退出",
  hasPrivateBooths: "個室ブース",
  parking: "駐車場",
  smokingNote: "喫煙備考",
  coffeePrice: "コーヒー1杯の値段",
  bringOwnFood: "飲食物持込可否",
  alcohol: "アルコール",
  mainMenu: "主なメニュー",
  paymentMethods: "支払い方法",
  customerTypes: "客層",
  recommendedWorkStyles: "おすすめの作業",
  ambienceCasual: "カジュアル度",
  ambienceModern: "モダン度",
  ambassadorComment: "アンバサダーコメント",
  equipmentNote: "設備備考",
  crowdMatrix: "混雑状況",
  instagramUrl: "Instagram",
  tiktokUrl: "TikTok",
  firstRequestAccountId: "初回掲載申請アカウントID",
  instagramPostUrl1: "Instagram投稿URL 1",
  instagramPostUrl2: "Instagram投稿URL 2",
  instagramPostUrl3: "Instagram投稿URL 3",
  latitude: "緯度",
  longitude: "経度",
};

const STATUS_FILTER_OPTIONS: { value: RequestStatus | "all"; label: string }[] = [
  { value: "all", label: "すべて" },
  { value: "pending", label: "審査中" },
  { value: "approved", label: "承認" },
  { value: "rejected", label: "非承認" },
];

function formatDateTime(isoString: string | null) {
  if (!isoString) return "-";
  const date = new Date(isoString);
  if (Number.isNaN(date.getTime())) return isoString;
  const y = date.getFullYear();
  const m = `${date.getMonth() + 1}`.padStart(2, "0");
  const d = `${date.getDate()}`.padStart(2, "0");
  const hh = `${date.getHours()}`.padStart(2, "0");
  const mm = `${date.getMinutes()}`.padStart(2, "0");
  return `${y}/${m}/${d} ${hh}:${mm}`;
}

function statusBadgeStyle(status: RequestStatus) {
  switch (status) {
    case "approved":
      return "bg-emerald-100 text-emerald-800 border-emerald-200";
    case "rejected":
      return "bg-rose-100 text-rose-800 border-rose-200";
    case "withdrawn":
      return "bg-slate-100 text-slate-700 border-slate-200";
    case "pending":
    default:
      return "bg-amber-100 text-amber-800 border-amber-200";
  }
}

function formatValue(key: string, value: unknown): string {
  if (value === null || typeof value === "undefined" || value === "") return "-";
  if (Array.isArray(value)) return value.length > 0 ? value.join(", ") : "-";
  if (typeof value === "boolean") return value ? "あり" : "なし";
  if (typeof value === "object") {
    try {
      return JSON.stringify(value, null, 2);
    } catch {
      return String(value);
    }
  }
  if (key === "ambienceCasual" || key === "ambienceModern") return `${value} / 5`;
  return String(value);
}

function renderEditRequestPreview(payload: unknown) {
  if (!payload || typeof payload !== "object" || Array.isArray(payload)) {
    return <p className="rounded-md bg-gray-50 px-3 py-2 text-sm text-gray-700">{String(payload ?? "-")}</p>;
  }

  const data = payload as Record<string, unknown>;

  if (data.fields && typeof data.fields === "object") {
    const fields = data.fields as Record<string, { before: unknown; after: unknown }>;
    return (
      <div className="space-y-2">
        {Object.entries(fields).map(([key, diff]) => (
          <div key={key} className="rounded-md border border-gray-200 bg-gray-50 px-3 py-2">
            <p className="text-xs font-semibold text-gray-500">{FIELD_LABELS[key] || key}</p>
            <div className="mt-1 flex items-center gap-2 text-sm">
              <span className="text-red-600 line-through">{formatValue(key, diff.before)}</span>
              <span className="text-gray-400">&rarr;</span>
              <span className="font-semibold text-green-700">{formatValue(key, diff.after)}</span>
            </div>
          </div>
        ))}
      </div>
    );
  }

  if (data.content && typeof data.content === "string") {
    return (
      <div className="rounded-md border border-gray-200 bg-gray-50 px-3 py-2">
        <p className="text-xs font-semibold text-gray-500">修正内容</p>
        <p className="mt-1 whitespace-pre-wrap text-sm text-gray-800">{data.content}</p>
      </div>
    );
  }

  return (
    <div className="rounded-md border border-gray-200 bg-gray-50 px-3 py-2">
      <pre className="whitespace-pre-wrap break-all text-sm text-gray-800">
        {formatValue("payload", payload)}
      </pre>
    </div>
  );
}

function renderCafeRequestPreview(payload: unknown) {
  if (!payload || typeof payload !== "object" || Array.isArray(payload)) {
    return null;
  }

  const data = payload as Record<string, unknown>;
  const items = [
    {
      label: "初回掲載申請アカウントID",
      value: typeof data.firstRequestAccountId === "string" && data.firstRequestAccountId
        ? data.firstRequestAccountId
        : "未設定",
    },
    {
      label: "Instagram投稿URL 1",
      value:
        typeof data.instagramPostUrl1 === "string" && data.instagramPostUrl1
          ? data.instagramPostUrl1
          : "未設定",
    },
    {
      label: "Instagram投稿URL 2",
      value:
        typeof data.instagramPostUrl2 === "string" && data.instagramPostUrl2
          ? data.instagramPostUrl2
          : "未設定",
    },
    {
      label: "Instagram投稿URL 3",
      value:
        typeof data.instagramPostUrl3 === "string" && data.instagramPostUrl3
          ? data.instagramPostUrl3
          : "未設定",
    },
  ];

  return (
    <div className="mt-4">
      <p className="text-xs font-semibold uppercase tracking-wide text-gray-500">確認項目</p>
      <div className="mt-2 grid gap-2 sm:grid-cols-2">
        {items.map((item) => (
          <div key={item.label} className="rounded-md border border-gray-200 bg-gray-50 px-3 py-2">
            <p className="text-xs font-semibold text-gray-500">{item.label}</p>
            <p className="mt-1 break-all text-sm text-gray-800">{item.value}</p>
          </div>
        ))}
      </div>
    </div>
  );
}

function RequestCard({ item }: { item: AdminRequestItem }) {
  const canOpenCafe = Boolean(item.cafeId);

  return (
    <article className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <p className="text-sm font-semibold text-gray-900">
            {item.kind === "cafe_request" ? "カフェ掲載リクエスト" : "カフェ情報修正リクエスト"}
          </p>
          <p className="mt-1 text-xs text-gray-500">ID: {item.id}</p>
        </div>
        <span className={`inline-flex w-fit rounded-full border px-3 py-1 text-xs font-medium ${statusBadgeStyle(item.status)}`}>
          {STATUS_LABELS[item.status]}
        </span>
      </div>

      <div className="mt-4 grid gap-2 text-sm text-gray-700 sm:grid-cols-2">
        <p>ユーザー: {item.accountName ? `${item.accountName}（${item.accountId}）` : item.accountId}</p>
        <p>作成日時: {formatDateTime(item.createdAt)}</p>
        <p>更新日時: {formatDateTime(item.updatedAt)}</p>
        <p>レビュー日時: {formatDateTime(item.reviewedAt)}</p>
      </div>

      <div className="mt-4 rounded-xl border border-blue-100 bg-blue-50 p-4">
        <p className="text-xs font-semibold uppercase tracking-wide text-blue-700">確認先</p>
        {canOpenCafe ? (
          <>
            <p className="mt-1 text-sm text-blue-900">
              承認・非承認と管理者コメントの入力は、対象カフェの詳細画面で行ってください。
            </p>
            <Link
              href={`/admin/cafes/${item.cafeId}`}
              className="mt-3 inline-flex items-center rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-white hover:bg-primary-dark"
            >
              {item.cafeName ?? "対象カフェ"}の詳細を開く
            </Link>
          </>
        ) : (
          <p className="mt-1 text-sm text-blue-900">
            対象カフェが未作成のため、詳細画面へ遷移できません。
          </p>
        )}
      </div>

      {item.reason && (
        <p className="mt-4 rounded-md bg-gray-50 px-3 py-2 text-sm text-gray-700">修正理由: {item.reason}</p>
      )}

      {item.adminComment && (
        <div className="mt-4 rounded-md border border-gray-200 bg-gray-50 px-3 py-2">
          <p className="text-xs font-semibold text-gray-500">管理者コメント</p>
          <p className="mt-1 whitespace-pre-wrap text-sm text-gray-800">{item.adminComment}</p>
        </div>
      )}

      {item.kind === "cafe_request" && renderCafeRequestPreview(item.payload)}

      {item.kind === "cafe_edit_request" && (
        <div className="mt-4">
          <p className="text-xs font-semibold uppercase tracking-wide text-gray-500">変更内容</p>
          <div className="mt-2">{renderEditRequestPreview(item.payload)}</div>
        </div>
      )}
    </article>
  );
}

export default function AdminRequestsPage() {
  const [items, setItems] = useState<AdminRequestItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState("");
  const [statusFilter, setStatusFilter] = useState<RequestStatus | "all">("pending");
  const [activeTab, setActiveTab] = useState<RequestTab>("cafe_request");

  const loadItems = async () => {
    setIsLoading(true);
    setError("");
    try {
      const response = await fetch("/api/admin/requests", { cache: "no-store" });
      const data = (await response.json()) as { data?: AdminRequestItem[]; message?: string };
      if (!response.ok) throw new Error(data.message ?? "リクエスト一覧の取得に失敗しました。");
      setItems(Array.isArray(data.data) ? data.data : []);
    } catch (fetchError) {
      console.error("[admin/requests] Failed to fetch requests", fetchError);
      setError((fetchError as { message?: string }).message ?? "リクエスト一覧の取得に失敗しました。");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    void loadItems();
  }, []);

  const filteredItems = useMemo(
    () => items.filter((item) => statusFilter === "all" || item.status === statusFilter),
    [items, statusFilter],
  );

  const tabItems = useMemo(
    () => filteredItems.filter((item) => item.kind === activeTab),
    [activeTab, filteredItems],
  );

  const renderSection = (title: string, sectionItems: AdminRequestItem[]) => (
    <section className="mt-6">
      <h2 className="text-lg font-semibold text-gray-900">{title}</h2>
      {sectionItems.length === 0 ? (
        <div className="mt-3 rounded-xl border border-dashed border-gray-300 bg-gray-50 px-4 py-6 text-sm text-gray-600">
          対象のリクエストはありません。
        </div>
      ) : (
        <div className="mt-3 space-y-4">
          {sectionItems.map((item) => (
            <RequestCard key={`${item.kind}:${item.id}`} item={item} />
          ))}
        </div>
      )}
    </section>
  );

  return (
    <main className="min-h-screen bg-gray-50 px-4 py-10">
      <section className="mx-auto w-full max-w-6xl rounded-2xl bg-white p-6 shadow">
        <div className="flex flex-col gap-4 border-b border-gray-200 pb-5 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="text-sm uppercase tracking-wide text-gray-500">ハカドルカフェ</p>
            <h1 className="text-2xl font-semibold text-gray-900">リクエスト確認</h1>
            <p className="mt-2 text-sm text-gray-600">
              一覧では内容確認と詳細画面への遷移のみ行います。審査操作はカフェ詳細画面に集約しました。
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={() => void loadItems()}
              className="rounded-lg border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
            >
              再読み込み
            </button>
            <Link href="/admin/cafes" className="rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-white hover:bg-primary-dark">
              カフェ管理画面へ
            </Link>
          </div>
        </div>

        <div className="mt-4 flex flex-wrap items-center gap-2">
          {STATUS_FILTER_OPTIONS.map((opt) => (
            <button
              key={opt.value}
              type="button"
              onClick={() => setStatusFilter(opt.value)}
              className={`rounded-lg border px-4 py-2 text-sm font-medium transition-colors ${
                statusFilter === opt.value
                  ? "border-primary bg-primary text-white"
                  : "border-gray-300 bg-white text-gray-700 hover:bg-gray-50"
              }`}
            >
              {opt.label}
            </button>
          ))}
        </div>

        <div className="mt-4 flex flex-wrap gap-2 border-b border-gray-200 pb-4">
          {REQUEST_TAB_OPTIONS.map((tab) => {
            const count = filteredItems.filter((item) => item.kind === tab.value).length;
            const isActive = activeTab === tab.value;
            return (
              <button
                key={tab.value}
                type="button"
                onClick={() => setActiveTab(tab.value)}
                className={`inline-flex items-center gap-2 rounded-lg border px-4 py-2 text-sm font-medium transition-colors ${
                  isActive
                    ? "border-primary bg-primary text-white"
                    : "border-gray-300 bg-white text-gray-700 hover:bg-gray-50"
                }`}
              >
                <span>{tab.label}</span>
                <span className={`rounded-full px-2 py-0.5 text-xs ${isActive ? "bg-white/20 text-white" : "bg-gray-100 text-gray-600"}`}>
                  {count}
                </span>
              </button>
            );
          })}
        </div>

        {error && (
          <p className="mt-4 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-600">{error}</p>
        )}

        {isLoading ? (
          <p className="mt-6 text-sm text-gray-600">読み込み中...</p>
        ) : (
          renderSection(
            activeTab === "cafe_request" ? "カフェ掲載リクエスト" : "情報修正リクエスト",
            tabItems,
          )
        )}
      </section>
    </main>
  );
}
