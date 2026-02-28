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

function tryFormatPayload(payload: unknown) {
  try {
    return JSON.stringify(payload, null, 2);
  } catch {
    return String(payload);
  }
}

function renderValue(value: unknown): string {
  if (value === null || typeof value === "undefined") return "-";
  if (typeof value === "string") return value || "-";
  if (typeof value === "number" || typeof value === "boolean") return String(value);
  if (Array.isArray(value)) {
    if (value.length === 0) return "-";
    return value
      .map((item) =>
        typeof item === "object" ? tryFormatPayload(item) : String(item),
      )
      .join(", ");
  }
  if (typeof value === "object") return tryFormatPayload(value);
  return String(value);
}

function renderPayloadDetails(payload: unknown) {
  if (!payload || typeof payload !== "object" || Array.isArray(payload)) {
    return (
      <p className="rounded-md bg-gray-50 px-3 py-2 text-sm text-gray-700">
        {renderValue(payload)}
      </p>
    );
  }

  const entries = Object.entries(payload as Record<string, unknown>);
  if (entries.length === 0) {
    return (
      <p className="rounded-md bg-gray-50 px-3 py-2 text-sm text-gray-700">項目なし</p>
    );
  }

  return (
    <dl className="grid gap-2 sm:grid-cols-2">
      {entries.map(([key, value]) => (
        <div key={key} className="rounded-md border border-gray-200 bg-gray-50 px-3 py-2">
          <dt className="text-xs font-semibold uppercase tracking-wide text-gray-500">
            {key}
          </dt>
          <dd className="mt-1 whitespace-pre-wrap break-all text-sm text-gray-800">
            {renderValue(value)}
          </dd>
        </div>
      ))}
    </dl>
  );
}

export default function AdminRequestsPage() {
  const [items, setItems] = useState<AdminRequestItem[]>([]);
  const [edits, setEdits] = useState<Record<string, RequestEditState>>({});
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState("");
  const [savingKey, setSavingKey] = useState<string | null>(null);

  const loadItems = async () => {
    setIsLoading(true);
    setError("");
    try {
      const response = await fetch("/api/admin/requests", { cache: "no-store" });
      const data = (await response.json()) as {
        data?: AdminRequestItem[];
        message?: string;
      };
      if (!response.ok) {
        throw new Error(data.message ?? "リクエスト一覧の取得に失敗しました。");
      }
      const nextItems = Array.isArray(data.data) ? data.data : [];
      setItems(nextItems);
      setEdits(
        nextItems.reduce<Record<string, RequestEditState>>((acc, item) => {
          acc[itemKey(item)] = {
            status: item.status,
            adminComment: item.adminComment ?? "",
          };
          return acc;
        }, {}),
      );
    } catch (fetchError) {
      console.error("[admin/requests] Failed to fetch requests", fetchError);
      setError(
        (fetchError as { message?: string }).message ??
          "リクエスト一覧の取得に失敗しました。",
      );
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    void loadItems();
  }, []);

  const cafeRequests = useMemo(
    () => items.filter((item) => item.kind === "cafe_request"),
    [items],
  );
  const cafeEditRequests = useMemo(
    () => items.filter((item) => item.kind === "cafe_edit_request"),
    [items],
  );

  const handleEditChange = (
    item: Pick<AdminRequestItem, "kind" | "id">,
    patch: Partial<RequestEditState>,
  ) => {
    const key = itemKey(item);
    setEdits((prev) => ({
      ...prev,
      [key]: {
        ...prev[key],
        ...patch,
      },
    }));
  };

  const handleSave = async (item: AdminRequestItem) => {
    const key = itemKey(item);
    const edit = edits[key];
    if (!edit) return;

    setSavingKey(key);
    setError("");
    try {
      const response = await fetch("/api/admin/requests", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          id: item.id,
          kind: item.kind,
          status: edit.status,
          adminComment: edit.adminComment,
        }),
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
      if (!response.ok) {
        throw new Error(data.message ?? "ステータス更新に失敗しました。");
      }

      if (!data.data) return;

      setItems((prev) =>
        prev.map((row) =>
          row.id === data.data?.id && row.kind === data.data?.kind
            ? {
                ...row,
                status: data.data.status,
                adminComment: data.data.adminComment,
                reviewedAt: data.data.reviewedAt,
                updatedAt: data.data.updatedAt,
              }
            : row,
        ),
      );
      setEdits((prev) => ({
        ...prev,
        [key]: {
          status: data.data?.status ?? edit.status,
          adminComment: data.data?.adminComment ?? "",
        },
      }));
    } catch (saveError) {
      console.error("[admin/requests] Failed to update status", saveError);
      setError(
        (saveError as { message?: string }).message ??
          "ステータス更新に失敗しました。",
      );
    } finally {
      setSavingKey(null);
    }
  };

  const renderSection = (title: string, sectionItems: AdminRequestItem[]) => {
    return (
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
              const edit = edits[key] ?? {
                status: item.status,
                adminComment: item.adminComment ?? "",
              };
              const isWithdrawn = item.status === "withdrawn";
              const isSaving = savingKey === key;
              return (
                <article
                  key={key}
                  className={`rounded-xl border p-4 shadow-sm ${
                    isWithdrawn
                      ? "border-gray-300 bg-gray-100"
                      : "border-gray-200 bg-white"
                  }`}
                >
                  <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                    <div>
                      <p className="text-sm font-semibold text-gray-900">
                        {item.kind === "cafe_request"
                          ? "カフェ掲載リクエスト"
                          : "カフェ情報修正リクエスト"}
                      </p>
                      <p className="mt-1 text-xs text-gray-500">
                        ID: {item.id}
                      </p>
                    </div>
                    <div className="rounded-md bg-gray-100 px-3 py-1 text-xs text-gray-700">
                      現在: {STATUS_OPTIONS.find((status) => status.value === item.status)?.label}
                    </div>
                  </div>

                  <div className="mt-3 grid gap-2 text-sm text-gray-700 sm:grid-cols-2">
                    <p>ユーザーID: {item.accountId}</p>
                    <p>種別: {item.requestType}</p>
                    <p>作成日時: {formatDateTime(item.createdAt)}</p>
                    <p>更新日時: {formatDateTime(item.updatedAt)}</p>
                    <p>レビュー日時: {formatDateTime(item.reviewedAt)}</p>
                    {item.cafeId && (
                      <p>
                        対象カフェ: {item.cafeName ?? "不明"} ({item.cafeId})
                      </p>
                    )}
                  </div>

                  {item.reason && (
                    <p className="mt-3 rounded-md bg-gray-50 px-3 py-2 text-sm text-gray-700">
                      修正理由: {item.reason}
                    </p>
                  )}

                  <div className="mt-3">
                    <p className="text-xs font-semibold uppercase tracking-wide text-gray-500">
                      リクエスト内容
                    </p>
                    <div className="mt-1">{renderPayloadDetails(item.payload)}</div>
                  </div>

                  <div className="mt-4 grid gap-3 sm:grid-cols-[220px_1fr_auto] sm:items-end">
                    <label className="flex flex-col gap-1 text-sm text-gray-700">
                      ステータス
                      <select
                        value={edit.status}
                        onChange={(event) =>
                          handleEditChange(item, {
                            status: event.target.value as RequestStatus,
                          })
                        }
                        disabled={isSaving}
                        className="rounded-lg border border-gray-300 px-3 py-2 focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
                      >
                        {STATUS_OPTIONS.map((status) => (
                          <option key={status.value} value={status.value}>
                            {status.label}
                          </option>
                        ))}
                      </select>
                    </label>

                    <label className="flex flex-col gap-1 text-sm text-gray-700">
                      管理者コメント
                      <textarea
                        value={edit.adminComment}
                        onChange={(event) =>
                          handleEditChange(item, { adminComment: event.target.value })
                        }
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
                      {isSaving ? "更新中..." : "更新する"}
                    </button>
                  </div>
                </article>
              );
            })}
          </div>
        )}
      </section>
    );
  };

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
            <Link
              href="/admin/cafes"
              className="rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-white hover:bg-primary-dark"
            >
              カフェ管理画面へ
            </Link>
          </div>
        </div>

        {error && (
          <p className="mt-4 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-600">
            {error}
          </p>
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
