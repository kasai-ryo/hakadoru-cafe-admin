"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

type DraftSnapshotItem = {
  id: string;
  savedAt: string;
  editingCafeId: string | null;
  editingCafeName: string | null;
  cafeName: string;
};

function formatDraftSnapshotTime(isoString: string) {
  const date = new Date(isoString);
  if (Number.isNaN(date.getTime())) return isoString;
  const y = date.getFullYear();
  const m = `${date.getMonth() + 1}`.padStart(2, "0");
  const d = `${date.getDate()}`.padStart(2, "0");
  const hh = `${date.getHours()}`.padStart(2, "0");
  const mm = `${date.getMinutes()}`.padStart(2, "0");
  return `${y}/${m}/${d} ${hh}:${mm}`;
}

export default function AdminCafeDraftsPage() {
  const [items, setItems] = useState<DraftSnapshotItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState("");
  const [isDeletingId, setIsDeletingId] = useState<string | null>(null);

  const loadItems = async () => {
    setIsLoading(true);
    setError("");
    try {
      const response = await fetch("/api/cafe-drafts?scope=all", {
        cache: "no-store",
      });
      const data = (await response.json()) as {
        data?: DraftSnapshotItem[];
        message?: string;
      };
      if (!response.ok) {
        throw new Error(data.message ?? "一時保存一覧の取得に失敗しました。");
      }
      setItems(Array.isArray(data.data) ? data.data : []);
    } catch (fetchError) {
      console.error("[admin/cafe-drafts] Failed to fetch drafts", fetchError);
      setError(
        (fetchError as { message?: string }).message ??
          "一時保存一覧の取得に失敗しました。",
      );
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    void loadItems();
  }, []);

  const handleDelete = async (id: string) => {
    if (typeof window !== "undefined" && !window.confirm("この一時保存を削除しますか？")) {
      return;
    }
    setIsDeletingId(id);
    setError("");
    try {
      const response = await fetch(`/api/cafe-drafts/${id}`, { method: "DELETE" });
      const data = (await response.json()) as { message?: string };
      if (!response.ok) {
        throw new Error(data.message ?? "一時保存の削除に失敗しました。");
      }
      setItems((prev) => prev.filter((item) => item.id !== id));
    } catch (deleteError) {
      console.error("[admin/cafe-drafts] Failed to delete draft", deleteError);
      setError(
        (deleteError as { message?: string }).message ??
          "一時保存の削除に失敗しました。",
      );
    } finally {
      setIsDeletingId(null);
    }
  };

  return (
    <main className="min-h-screen bg-gray-50 px-4 py-10">
      <section className="mx-auto w-full max-w-5xl rounded-2xl bg-white p-6 shadow">
        <div className="flex flex-col gap-4 border-b border-gray-200 pb-5 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="text-sm uppercase tracking-wide text-gray-500">ハカドルカフェ</p>
            <h1 className="text-2xl font-semibold text-gray-900">一時保存一覧</h1>
            <p className="mt-2 text-sm text-gray-600">
              カフェ登録フォームで手動保存した下書きの一覧です。「編集」から該当フォーム画面へ遷移して復元できます。
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <Link
              href="/admin/cafes"
              className="rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-white hover:bg-primary-dark"
            >
              管理画面へ
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
        ) : items.length === 0 ? (
          <div className="mt-6 rounded-xl border border-dashed border-gray-300 bg-gray-50 px-4 py-8 text-center text-sm text-gray-600">
            一時保存はありません。
          </div>
        ) : (
          <div className="mt-6 space-y-3">
            {items.map((item) => (
              <div
                key={item.id}
                className="flex flex-col gap-3 rounded-xl border border-gray-200 bg-white px-4 py-3 sm:flex-row sm:items-center sm:justify-between"
              >
                <div className="min-w-0">
                  <p className="truncate text-sm font-semibold text-gray-900">
                    {item.cafeName || item.editingCafeName || "店舗名未入力"}
                  </p>
                  <div className="mt-1 flex flex-wrap gap-x-4 gap-y-1 text-xs text-gray-500">
                    <span>保存日時: {formatDraftSnapshotTime(item.savedAt)}</span>
                    {item.editingCafeId && (
                      <span className="truncate">対象ID: {item.editingCafeId}</span>
                    )}
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <Link
                    href={
                      item.editingCafeId
                        ? `/admin/cafes/${item.editingCafeId}?draftId=${item.id}`
                        : `/admin/cafes/new?draftId=${item.id}`
                    }
                    className="rounded-lg border border-gray-200 px-3 py-1.5 text-xs text-gray-700 hover:bg-gray-50"
                  >
                    編集
                  </Link>
                  <button
                    type="button"
                    onClick={() => void handleDelete(item.id)}
                    disabled={isDeletingId === item.id}
                    className="rounded-lg border border-red-200 px-3 py-1.5 text-xs text-red-600 hover:bg-red-50 disabled:cursor-not-allowed disabled:opacity-60"
                  >
                    {isDeletingId === item.id ? "削除中..." : "削除"}
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </section>
    </main>
  );
}
