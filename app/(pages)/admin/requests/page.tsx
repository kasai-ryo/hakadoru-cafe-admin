"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";

type RequestStatus = "pending" | "approved" | "rejected" | "withdrawn";
type RequestKind = "cafe_request" | "cafe_edit_request";

type AdminRequestItem = {
  id: string;
  kind: RequestKind;
  accountId: string;
  requestType: string;
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

type RequestEditState = {
  status: RequestStatus;
  adminComment: string;
};

const STATUS_OPTIONS: { value: RequestStatus; label: string }[] = [
  { value: "pending", label: "審査中" },
  { value: "approved", label: "承認" },
  { value: "rejected", label: "却下" },
  { value: "withdrawn", label: "取り下げ" },
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
};

const WIFI_OPTIONS = [
  { value: "true", label: "あり" },
  { value: "false", label: "なし" },
];

const OUTLET_OPTIONS = [
  { value: "", label: "未設定" },
  { value: "all", label: "全席" },
  { value: "most", label: "8割" },
  { value: "half", label: "5割" },
  { value: "some", label: "一部" },
  { value: "none", label: "なし" },
];

const LIGHTING_OPTIONS = [
  { value: "", label: "未設定" },
  { value: "dark", label: "暗め" },
  { value: "normal", label: "普通" },
  { value: "bright", label: "明るめ" },
];

const SMOKING_OPTIONS = [
  { value: "", label: "未設定" },
  { value: "no_smoking", label: "禁煙" },
  { value: "allowed", label: "喫煙可能" },
];

const BRING_OWN_FOOD_OPTIONS = [
  { value: "", label: "未設定" },
  { value: "allowed", label: "可能" },
  { value: "drinks_only", label: "飲み物のみ可" },
  { value: "not_allowed", label: "不可" },
];

const FACILITY_TYPE_OPTIONS = [
  { value: "cafe", label: "カフェ" },
  { value: "coworking", label: "コワーキング" },
  { value: "hybrid", label: "ハイブリッド" },
  { value: "other", label: "その他" },
];

const SERVICE_OPTIONS = [
  { value: "pet_ok", label: "ペットOK" },
  { value: "terrace", label: "テラス席あり" },
  { value: "takeout", label: "テイクアウト" },
  { value: "window_seat", label: "窓際席あり" },
];

const PAYMENT_METHOD_OPTIONS = [
  { value: "cash", label: "現金" },
  { value: "credit_card", label: "クレカ" },
  { value: "qr_payment", label: "QR決済" },
  { value: "ic_card", label: "交通系IC" },
];

const CAFE_REQUEST_FIELD_ORDER = [
  "name", "address", "hours_weekday", "hours_weekend", "area",
  "nearest_station", "phone", "website", "seats", "wifi", "outlet",
  "lighting", "meeting_room", "smoking", "regular_holidays", "time_limit",
  "coffee_price", "bring_own_food", "services", "payment_methods", "notes", "features",
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

function itemKey(item: Pick<AdminRequestItem, "kind" | "id">) {
  return `${item.kind}:${item.id}`;
}

function formatEnumValue(key: string, value: unknown): string {
  if (value === null || typeof value === "undefined" || value === "") return "-";
  const str = String(value);
  if (key === "outlet") return OUTLET_OPTIONS.find((o) => o.value === str)?.label || str;
  if (key === "lighting") return LIGHTING_OPTIONS.find((o) => o.value === str)?.label || str;
  if (key === "smoking") return SMOKING_OPTIONS.find((o) => o.value === str)?.label || str;
  if (key === "bring_own_food") return BRING_OWN_FOOD_OPTIONS.find((o) => o.value === str)?.label || str;
  if (key === "facility_type") return FACILITY_TYPE_OPTIONS.find((o) => o.value === str)?.label || str;
  if (key === "wifi" || key === "meeting_room") return value === true || value === "true" ? "あり" : "なし";
  if (typeof value === "boolean") return value ? "あり" : "なし";
  if (typeof value === "number") return String(value);
  if (Array.isArray(value)) {
    if (value.length === 0) return "-";
    if (key === "services") {
      const map = Object.fromEntries(SERVICE_OPTIONS.map((o) => [o.value, o.label]));
      return value.map((v) => map[v] || v).join(", ");
    }
    if (key === "payment_methods") {
      const map = Object.fromEntries(PAYMENT_METHOD_OPTIONS.map((o) => [o.value, o.label]));
      return value.map((v) => map[v] || v).join(", ");
    }
    return value.join(", ");
  }
  if (typeof value === "object") {
    try { return JSON.stringify(value, null, 2); } catch { return String(value); }
  }
  return str || "-";
}

function renderCafeRequestPreview(payload: unknown) {
  if (!payload || typeof payload !== "object" || Array.isArray(payload)) {
    return <p className="rounded-md bg-gray-50 px-3 py-2 text-sm text-gray-700">{String(payload ?? "-")}</p>;
  }
  const data = payload as Record<string, unknown>;
  const orderedKeys = CAFE_REQUEST_FIELD_ORDER.filter((k) => k in data);
  const extraKeys = Object.keys(data).filter((k) => !CAFE_REQUEST_FIELD_ORDER.includes(k));
  const allKeys = [...orderedKeys, ...extraKeys];
  if (allKeys.length === 0) {
    return <p className="rounded-md bg-gray-50 px-3 py-2 text-sm text-gray-700">項目なし</p>;
  }
  return (
    <dl className="grid gap-2 sm:grid-cols-2">
      {allKeys.map((key) => (
        <div key={key} className="rounded-md border border-gray-200 bg-gray-50 px-3 py-2">
          <dt className="text-xs font-semibold text-gray-500">{FIELD_LABELS[key] || key}</dt>
          <dd className="mt-1 whitespace-pre-wrap break-all text-sm text-gray-800">
            {formatEnumValue(key, data[key])}
          </dd>
        </div>
      ))}
    </dl>
  );
}

function renderEditRequestPreview(payload: unknown) {
  if (!payload || typeof payload !== "object" || Array.isArray(payload)) {
    return <p className="rounded-md bg-gray-50 px-3 py-2 text-sm text-gray-700">{String(payload ?? "-")}</p>;
  }
  const data = payload as Record<string, unknown>;

  // 新形式: { fields: { key: { before, after } }, note }
  if (data.fields && typeof data.fields === "object") {
    const fields = data.fields as Record<string, { before: unknown; after: unknown }>;
    const note = data.note as string | undefined;
    return (
      <div className="space-y-2">
        {Object.entries(fields).map(([key, diff]) => (
          <div key={key} className="rounded-md border border-gray-200 bg-gray-50 px-3 py-2">
            <dt className="text-xs font-semibold text-gray-500">{FIELD_LABELS[key] || key}</dt>
            <dd className="mt-1 flex items-center gap-2 text-sm">
              <span className="text-red-600 line-through">{formatEnumValue(key, diff.before)}</span>
              <span className="text-gray-400">&rarr;</span>
              <span className="font-semibold text-green-700">{formatEnumValue(key, diff.after)}</span>
            </dd>
          </div>
        ))}
        {note && (
          <div className="rounded-md border border-gray-200 bg-gray-50 px-3 py-2">
            <dt className="text-xs font-semibold text-gray-500">補足コメント</dt>
            <dd className="mt-1 text-sm text-gray-800">{note}</dd>
          </div>
        )}
      </div>
    );
  }

  // 旧形式: { content: "..." }
  if (data.content && typeof data.content === "string") {
    return (
      <div className="rounded-md border border-gray-200 bg-gray-50 px-3 py-2">
        <dt className="text-xs font-semibold text-gray-500">修正内容</dt>
        <dd className="mt-1 whitespace-pre-wrap text-sm text-gray-800">{data.content}</dd>
      </div>
    );
  }

  return renderCafeRequestPreview(payload);
}

function ApprovalEditForm({
  payload,
  onChange,
  approvalData,
}: {
  payload: unknown;
  onChange: (data: Record<string, unknown>) => void;
  approvalData: Record<string, unknown>;
}) {
  const data = (payload && typeof payload === "object" && !Array.isArray(payload))
    ? (payload as Record<string, unknown>)
    : {};

  const getValue = (key: string) => {
    if (key in approvalData) return approvalData[key];
    if (key in data) return data[key];
    return "";
  };

  const handleChange = (key: string, value: unknown) => {
    onChange({ ...approvalData, [key]: value });
  };

  const handleMultiSelectChange = (key: string, optionValue: string, checked: boolean) => {
    const current = (getValue(key) as string[]) || [];
    const next = checked ? [...current, optionValue] : current.filter((v) => v !== optionValue);
    handleChange(key, next);
  };

  const textInput = (key: string, placeholder?: string) => (
    <input
      type="text"
      value={String(getValue(key) ?? "")}
      onChange={(e) => handleChange(key, e.target.value)}
      placeholder={placeholder}
      className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
    />
  );

  const numberInput = (key: string, placeholder?: string) => (
    <input
      type="number"
      value={getValue(key) === null || getValue(key) === undefined ? "" : String(getValue(key))}
      onChange={(e) => handleChange(key, e.target.value ? Number(e.target.value) : null)}
      placeholder={placeholder}
      className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
    />
  );

  const selectInput = (key: string, options: { value: string; label: string }[]) => (
    <select
      value={String(getValue(key) ?? "")}
      onChange={(e) => {
        const v = e.target.value;
        if (key === "wifi" || key === "meeting_room") handleChange(key, v === "true");
        else handleChange(key, v || null);
      }}
      className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
    >
      {options.map((opt) => (
        <option key={opt.value} value={opt.value}>{opt.label}</option>
      ))}
    </select>
  );

  const multiSelectInput = (key: string, options: { value: string; label: string }[]) => {
    const current = (getValue(key) as string[]) || [];
    return (
      <div className="flex flex-wrap gap-2">
        {options.map((opt) => (
          <label key={opt.value} className="flex items-center gap-1 text-sm">
            <input
              type="checkbox"
              checked={current.includes(opt.value)}
              onChange={(e) => handleMultiSelectChange(key, opt.value, e.target.checked)}
              className="rounded border-gray-300"
            />
            {opt.label}
          </label>
        ))}
      </div>
    );
  };

  return (
    <div className="mt-3 space-y-3 rounded-lg border border-blue-200 bg-blue-50/50 p-4">
      <p className="text-sm font-semibold text-blue-800">承認時のカフェ情報（編集可能）</p>
      <div className="grid gap-3 sm:grid-cols-2">
        <label className="flex flex-col gap-1 text-sm text-gray-700">カフェ名 *{textInput("name", "カフェ名")}</label>
        <label className="flex flex-col gap-1 text-sm text-gray-700">施設タイプ{selectInput("facility_type", FACILITY_TYPE_OPTIONS)}</label>
        <label className="flex flex-col gap-1 text-sm text-gray-700 sm:col-span-2">住所 *{textInput("address", "東京都渋谷区...")}</label>
        <label className="flex flex-col gap-1 text-sm text-gray-700">営業時間（平日）{textInput("hours_weekday", "9:00-18:00")}</label>
        <label className="flex flex-col gap-1 text-sm text-gray-700">営業時間（土日祝）{textInput("hours_weekend", "10:00-17:00")}</label>
        <label className="flex flex-col gap-1 text-sm text-gray-700">エリア{textInput("area", "渋谷")}</label>
        <label className="flex flex-col gap-1 text-sm text-gray-700">最寄り駅{textInput("nearest_station", "渋谷駅")}</label>
        <label className="flex flex-col gap-1 text-sm text-gray-700">電話番号{textInput("phone", "03-1234-5678")}</label>
        <label className="flex flex-col gap-1 text-sm text-gray-700">ウェブサイト{textInput("website", "https://example.com")}</label>
        <label className="flex flex-col gap-1 text-sm text-gray-700">座席数{numberInput("seats")}</label>
        <label className="flex flex-col gap-1 text-sm text-gray-700">コーヒー1杯の値段（円）{numberInput("coffee_price")}</label>
        <label className="flex flex-col gap-1 text-sm text-gray-700">フリーWi-Fi{selectInput("wifi", WIFI_OPTIONS)}</label>
        <label className="flex flex-col gap-1 text-sm text-gray-700">電源{selectInput("outlet", OUTLET_OPTIONS)}</label>
        <label className="flex flex-col gap-1 text-sm text-gray-700">照明{selectInput("lighting", LIGHTING_OPTIONS)}</label>
        <label className="flex flex-col gap-1 text-sm text-gray-700">会議室{selectInput("meeting_room", WIFI_OPTIONS)}</label>
        <label className="flex flex-col gap-1 text-sm text-gray-700">禁煙・喫煙{selectInput("smoking", SMOKING_OPTIONS)}</label>
        <label className="flex flex-col gap-1 text-sm text-gray-700">飲食物持込可否{selectInput("bring_own_food", BRING_OWN_FOOD_OPTIONS)}</label>
        <label className="flex flex-col gap-1 text-sm text-gray-700">定休日{textInput("regular_holidays", "日曜日")}</label>
        <label className="flex flex-col gap-1 text-sm text-gray-700">利用時間制限{textInput("time_limit", "2時間")}</label>
        <div className="flex flex-col gap-1 text-sm text-gray-700 sm:col-span-2">サービス{multiSelectInput("services", SERVICE_OPTIONS)}</div>
        <div className="flex flex-col gap-1 text-sm text-gray-700 sm:col-span-2">支払い方法{multiSelectInput("payment_methods", PAYMENT_METHOD_OPTIONS)}</div>
      </div>
    </div>
  );
}

export default function AdminRequestsPage() {
  const [items, setItems] = useState<AdminRequestItem[]>([]);
  const [edits, setEdits] = useState<Record<string, RequestEditState>>({});
  const [approvalForms, setApprovalForms] = useState<Record<string, Record<string, unknown>>>({});
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState("");
  const [savingKey, setSavingKey] = useState<string | null>(null);

  const loadItems = async () => {
    setIsLoading(true);
    setError("");
    try {
      const response = await fetch("/api/admin/requests", { cache: "no-store" });
      const data = (await response.json()) as { data?: AdminRequestItem[]; message?: string };
      if (!response.ok) throw new Error(data.message ?? "リクエスト一覧の取得に失敗しました。");
      const nextItems = Array.isArray(data.data) ? data.data : [];
      setItems(nextItems);
      setEdits(
        nextItems.reduce<Record<string, RequestEditState>>((acc, item) => {
          acc[itemKey(item)] = { status: item.status, adminComment: item.adminComment ?? "" };
          return acc;
        }, {}),
      );
      const nextApprovalForms: Record<string, Record<string, unknown>> = {};
      for (const item of nextItems) {
        if (item.kind === "cafe_request" && item.payload && typeof item.payload === "object") {
          nextApprovalForms[itemKey(item)] = { ...(item.payload as Record<string, unknown>) };
        }
      }
      setApprovalForms(nextApprovalForms);
    } catch (fetchError) {
      console.error("[admin/requests] Failed to fetch requests", fetchError);
      setError((fetchError as { message?: string }).message ?? "リクエスト一覧の取得に失敗しました。");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => { void loadItems(); }, []);

  const cafeRequests = useMemo(() => items.filter((item) => item.kind === "cafe_request"), [items]);
  const cafeEditRequests = useMemo(() => items.filter((item) => item.kind === "cafe_edit_request"), [items]);

  const handleEditChange = (
    item: Pick<AdminRequestItem, "kind" | "id">,
    patch: Partial<RequestEditState>,
  ) => {
    const key = itemKey(item);
    setEdits((prev) => ({ ...prev, [key]: { ...prev[key], ...patch } }));

    if (patch.status === "approved") {
      const fullItem = items.find((i) => i.id === item.id && i.kind === item.kind);
      if (fullItem?.kind === "cafe_request" && !approvalForms[key]) {
        const payload = fullItem.payload as Record<string, unknown> | null;
        setApprovalForms((prev) => ({ ...prev, [key]: { ...(payload || {}) } }));
      }
    }
  };

  const handleApprovalFormChange = (key: string, data: Record<string, unknown>) => {
    setApprovalForms((prev) => ({ ...prev, [key]: data }));
  };

  const handleSave = async (item: AdminRequestItem) => {
    const key = itemKey(item);
    const edit = edits[key];
    if (!edit) return;

    setSavingKey(key);
    setError("");
    try {
      const requestBody: Record<string, unknown> = {
        id: item.id,
        kind: item.kind,
        status: edit.status,
        adminComment: edit.adminComment,
      };

      if (edit.status === "approved" && item.kind === "cafe_request") {
        requestBody.approvalData = approvalForms[key] || {};
      }

      const response = await fetch("/api/admin/requests", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(requestBody),
      });
      const data = (await response.json()) as {
        message?: string;
        data?: {
          id: string;
          kind: RequestKind;
          status: RequestStatus;
          adminComment: string | null;
          reviewedAt: string | null;
          updatedAt: string;
        };
      };
      if (!response.ok) throw new Error(data.message ?? "ステータス更新に失敗しました。");
      if (!data.data) return;

      setItems((prev) =>
        prev.map((row) =>
          row.id === data.data?.id && row.kind === data.data?.kind
            ? { ...row, status: data.data.status, adminComment: data.data.adminComment, reviewedAt: data.data.reviewedAt, updatedAt: data.data.updatedAt }
            : row,
        ),
      );
      setEdits((prev) => ({
        ...prev,
        [key]: { status: data.data?.status ?? edit.status, adminComment: data.data?.adminComment ?? "" },
      }));
    } catch (saveError) {
      console.error("[admin/requests] Failed to update status", saveError);
      setError((saveError as { message?: string }).message ?? "ステータス更新に失敗しました。");
    } finally {
      setSavingKey(null);
    }
  };

  const renderSection = (title: string, sectionItems: AdminRequestItem[]) => (
    <section className="mt-6">
      <h2 className="text-lg font-semibold text-gray-900">{title}</h2>
      {sectionItems.length === 0 ? (
        <div className="mt-3 rounded-xl border border-dashed border-gray-300 bg-gray-50 px-4 py-6 text-sm text-gray-600">
          対象のリクエストはありません。
        </div>
      ) : (
        <div className="mt-3 space-y-4">
          {sectionItems.map((item) => {
            const key = itemKey(item);
            const edit = edits[key] ?? { status: item.status, adminComment: item.adminComment ?? "" };
            const isWithdrawn = item.status === "withdrawn";
            const isSaving = savingKey === key;
            const showApprovalForm = item.kind === "cafe_request" && edit.status === "approved" && item.status !== "approved";

            return (
              <article
                key={key}
                className={`rounded-xl border p-4 shadow-sm ${isWithdrawn ? "border-gray-300 bg-gray-100" : "border-gray-200 bg-white"}`}
              >
                <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                  <div>
                    <p className="text-sm font-semibold text-gray-900">
                      {item.kind === "cafe_request" ? "カフェ掲載リクエスト" : "カフェ情報修正リクエスト"}
                    </p>
                    <p className="mt-1 text-xs text-gray-500">ID: {item.id}</p>
                  </div>
                  <div className="rounded-md bg-gray-100 px-3 py-1 text-xs text-gray-700">
                    現在: {STATUS_OPTIONS.find((s) => s.value === item.status)?.label}
                  </div>
                </div>

                <div className="mt-3 grid gap-2 text-sm text-gray-700 sm:grid-cols-2">
                  <p>ユーザーID: {item.accountId}</p>
                  <p>種別: {item.requestType}</p>
                  <p>作成日時: {formatDateTime(item.createdAt)}</p>
                  <p>更新日時: {formatDateTime(item.updatedAt)}</p>
                  <p>レビュー日時: {formatDateTime(item.reviewedAt)}</p>
                  {item.cafeId && <p>対象カフェ: {item.cafeName ?? "不明"} ({item.cafeId})</p>}
                </div>

                {item.reason && (
                  <p className="mt-3 rounded-md bg-gray-50 px-3 py-2 text-sm text-gray-700">修正理由: {item.reason}</p>
                )}

                <div className="mt-3">
                  <p className="text-xs font-semibold uppercase tracking-wide text-gray-500">リクエスト内容</p>
                  <div className="mt-1">
                    {item.kind === "cafe_request" ? renderCafeRequestPreview(item.payload) : renderEditRequestPreview(item.payload)}
                  </div>
                </div>

                {showApprovalForm && (
                  <ApprovalEditForm
                    payload={item.payload}
                    approvalData={approvalForms[key] || {}}
                    onChange={(d) => handleApprovalFormChange(key, d)}
                  />
                )}

                <div className="mt-4 grid gap-3 sm:grid-cols-[220px_1fr_auto] sm:items-end">
                  <label className="flex flex-col gap-1 text-sm text-gray-700">
                    ステータス
                    <select
                      value={edit.status}
                      onChange={(e) => handleEditChange(item, { status: e.target.value as RequestStatus })}
                      disabled={isSaving}
                      className="rounded-lg border border-gray-300 px-3 py-2 focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
                    >
                      {STATUS_OPTIONS.map((s) => (
                        <option key={s.value} value={s.value}>{s.label}</option>
                      ))}
                    </select>
                  </label>

                  <label className="flex flex-col gap-1 text-sm text-gray-700">
                    管理者コメント
                    <textarea
                      value={edit.adminComment}
                      onChange={(e) => handleEditChange(item, { adminComment: e.target.value })}
                      rows={2}
                      placeholder="任意"
                      disabled={isSaving}
                      className="rounded-lg border border-gray-300 px-3 py-2 focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
                    />
                  </label>

                  <button
                    type="button"
                    onClick={() => void handleSave(item)}
                    disabled={isSaving}
                    className="rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-white hover:bg-primary-dark disabled:cursor-not-allowed disabled:opacity-60"
                  >
                    {isSaving ? "更新中..." : edit.status === "approved" && item.status !== "approved" ? "承認して公開" : "更新する"}
                  </button>
                </div>
              </article>
            );
          })}
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
              カフェ掲載リクエストと情報修正リクエストを確認し、ステータスを更新できます。
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

        {error && (
          <p className="mt-4 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-600">{error}</p>
        )}

        {isLoading ? (
          <p className="mt-6 text-sm text-gray-600">読み込み中...</p>
        ) : (
          <>
            {renderSection("カフェ掲載リクエスト", cafeRequests)}
            {renderSection("情報修正リクエスト", cafeEditRequests)}
          </>
        )}
      </section>
    </main>
  );
}
