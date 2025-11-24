"use client";

import Link from "next/link";
import clsx from "clsx";
import type { Cafe } from "@/app/types/cafe";

interface CafeTableProps {
  cafes: Cafe[];
}

export function CafeTable({ cafes }: CafeTableProps) {
  if (cafes.length === 0) {
    return (
      <div className="py-12 text-center text-sm text-gray-500">
        条件に一致するカフェが見つかりません。フィルター条件を調整してください。
      </div>
    );
  }

  return (
    <div className="mt-4 overflow-x-auto">
      <table className="min-w-full divide-y divide-gray-200 text-sm">
        <thead className="bg-gray-50 text-left text-xs uppercase tracking-wider text-gray-500">
          <tr>
            <th className="px-4 py-3 font-medium">店舗名 / エリア</th>
            <th className="px-4 py-3 font-medium">Wi-Fi / 電源</th>
            <th className="px-4 py-3 font-medium">ステータス</th>
            <th className="px-4 py-3 font-medium">表示状態</th>
            <th className="px-4 py-3 font-medium">更新日</th>
            <th className="px-4 py-3 font-medium text-right">詳細</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-100 bg-white">
          {cafes.map((cafe) => (
            <tr key={cafe.id}>
              <td className="px-4 py-4">
                <div className="font-semibold text-gray-900">{cafe.name}</div>
                <div className="mt-1 text-xs text-gray-500">{cafe.area}</div>
              </td>
              <td className="px-4 py-4">
                <div className="flex items-center gap-2 text-xs text-gray-700">
                  <span
                    className={clsx(
                      "inline-flex items-center rounded-full px-2 py-0.5",
                      cafe.wifi ? "bg-green-50 text-green-700" : "bg-gray-100 text-gray-500",
                    )}
                  >
                    Wi-Fi
                  </span>
                  <span className="inline-flex items-center rounded-full bg-blue-50 px-2 py-0.5 text-blue-700">
                    電源: {outletLabel(cafe.outlet)}
                  </span>
                </div>
              </td>
              <td className="px-4 py-4">
                <span
                  className={clsx(
                    "rounded-full px-3 py-1 text-xs font-semibold",
                    statusColor(cafe.status),
                  )}
                >
                  {statusLabel(cafe.status)}
                </span>
              </td>
              <td className="px-4 py-4">
                {cafe.deleted_at ? (
                  <span className="rounded-full bg-gray-100 px-3 py-1 text-xs font-semibold text-gray-600">
                    削除済み
                  </span>
                ) : (
                  <span className="rounded-full bg-emerald-50 px-3 py-1 text-xs font-semibold text-emerald-700">
                    公開中
                  </span>
                )}
              </td>
              <td className="px-4 py-4 text-sm text-gray-600">
                {new Date(cafe.updated_at).toLocaleDateString("ja-JP")}
              </td>
              <td className="px-4 py-4 text-right">
                <Link
                  href={`/admin/cafes/${cafe.id}`}
                  className="inline-flex items-center rounded-lg border border-gray-200 px-3 py-1 text-xs font-medium text-gray-700 hover:bg-gray-50"
                >
                  詳細
                </Link>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function statusLabel(status: Cafe["status"]) {
  switch (status) {
    case "open":
      return "開店";
    case "recently_opened":
      return "最近オープン";
    case "closed":
      return "閉店";
    default:
      return status;
  }
}

function statusColor(status: Cafe["status"]) {
  switch (status) {
    case "open":
      return "bg-emerald-50 text-emerald-700";
    case "recently_opened":
      return "bg-indigo-50 text-indigo-700";
    case "closed":
      return "bg-gray-200 text-gray-600";
    default:
      return "bg-gray-100 text-gray-600";
  }
}

function outletLabel(outlet: Cafe["outlet"]) {
  switch (outlet) {
    case "all":
      return "全席";
    case "most":
      return "8割";
    case "half":
      return "半分";
    case "some":
      return "一部";
    case "none":
      return "なし";
    default:
      return outlet;
  }
}
