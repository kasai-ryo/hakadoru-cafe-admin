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
          このカフェを削除しますか？
        </h3>
        <p className="mt-3 text-sm text-gray-600">
          削除すると「削除済み」状態となり、通常の一覧から除外されます。データは保持されるため、必要に応じて復元できます。
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
            className="rounded-lg bg-red-600 px-5 py-2 text-sm font-semibold text-white hover:bg-red-500"
          >
            削除する
          </button>
        </div>
      </div>
    </div>
  );
}
