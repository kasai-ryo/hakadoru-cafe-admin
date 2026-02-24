"use client";

import type { Cafe } from "@/app/types/cafe";

interface CafeDeleteDialogProps {
  cafe: Cafe | null;
  onCancel: () => void;
  onConfirm: () => void;
}

export function CafeDeleteDialog({
  cafe,
  onCancel,
  onConfirm,
}: CafeDeleteDialogProps) {
  const isPrivate = Boolean(cafe?.deleted_at);

  return (
    <div
      className={`fixed inset-0 z-50 flex items-center justify-center ${
        cafe ? "visible" : "invisible"
      }`}
      aria-hidden={!cafe}
    >
      <div
        className={`absolute inset-0 bg-black/40 transition-opacity ${
          cafe ? "opacity-100" : "pointer-events-none opacity-0"
        }`}
        onClick={onCancel}
      />
      <div
        className={`relative w-full max-w-md transform rounded-2xl bg-white p-6 shadow-2xl transition-all ${
          cafe ? "scale-100 opacity-100" : "scale-95 opacity-0"
        }`}
      >
        <h3 className="text-lg font-semibold text-gray-900">
          {isPrivate ? "このカフェを公開しますか？" : "このカフェを非公開にしますか？"}
        </h3>
        <p className="mt-3 text-sm text-gray-600">
          {isPrivate
            ? "公開にすると通常の一覧に表示されます。カフェ情報の内容はそのまま維持されます。"
            : "非公開にすると通常の一覧から除外されます。データは保持されるため、あとで再公開できます。"}
        </p>
        {cafe && (
          <div className="mt-4 rounded-lg bg-gray-50 px-4 py-3 text-sm text-gray-700">
            <p className="font-medium">{cafe.name}</p>
            <p className="text-xs text-gray-500">{cafe.area}</p>
          </div>
        )}
        <div className="mt-6 flex justify-end gap-3">
          <button
            onClick={onCancel}
            className="rounded-lg border border-gray-200 px-4 py-2 text-sm text-gray-600 hover:bg-gray-50"
          >
            キャンセル
          </button>
          <button
            onClick={onConfirm}
            className={`rounded-lg px-5 py-2 text-sm font-semibold text-white ${
              isPrivate ? "bg-emerald-600 hover:bg-emerald-500" : "bg-amber-600 hover:bg-amber-500"
            }`}
          >
            {isPrivate ? "公開する" : "非公開にする"}
          </button>
        </div>
      </div>
    </div>
  );
}
