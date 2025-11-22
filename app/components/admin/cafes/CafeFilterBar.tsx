"use client";

import type { CafeStatus } from "@/app/types/cafe";

export interface CafeFilterState {
  search: string;
  area: string;
  status: CafeStatus | "all" | "deleted";
  wifiOnly: boolean;
  showDeleted: boolean;
}

interface CafeFilterBarProps {
  filters: CafeFilterState;
  areaOptions: string[];
  onChange: (filters: CafeFilterState) => void;
}

export function CafeFilterBar({
  filters,
  areaOptions,
  onChange,
}: CafeFilterBarProps) {
  const handleChange = <K extends keyof CafeFilterState>(
    key: K,
    value: CafeFilterState[K],
  ) => {
    onChange({ ...filters, [key]: value });
  };

  return (
    <div className="flex flex-col gap-4 border-b border-gray-100 pb-4 md:flex-row md:items-end">
      <div className="flex-1">
        <label className="text-sm font-medium text-gray-600">
          キーワード検索
        </label>
        <input
          type="search"
          value={filters.search}
          onChange={(event) => handleChange("search", event.target.value)}
          placeholder="店舗名・エリア・住所で検索"
          className="mt-1 w-full rounded-lg border border-gray-300 px-4 py-2 focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
        />
      </div>

      <div className="flex flex-1 flex-col gap-3 md:flex-row">
        <div className="flex-1">
          <label className="text-sm font-medium text-gray-600">エリア</label>
          <select
            value={filters.area}
            onChange={(event) => handleChange("area", event.target.value)}
            className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2 focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
          >
            <option value="all">すべて</option>
            {areaOptions.map((area) => (
              <option key={area} value={area}>
                {area}
              </option>
            ))}
          </select>
        </div>

        <div className="flex-1">
          <label className="text-sm font-medium text-gray-600">ステータス</label>
          <select
            value={filters.status}
            onChange={(event) =>
              handleChange("status", event.target.value as CafeFilterState["status"])
            }
            className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2 focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
          >
            <option value="all">すべて</option>
            <option value="open">開店</option>
            <option value="recently_opened">最近オープン</option>
            <option value="closed">閉店</option>
            <option value="deleted">削除済み</option>
          </select>
        </div>
      </div>

      <div className="flex flex-col gap-2 text-sm text-gray-600">
        <label className="font-medium text-gray-700">絞り込み</label>
        <div className="flex flex-wrap gap-3">
          <label className="inline-flex items-center gap-2 text-gray-700">
            <input
              type="checkbox"
              checked={filters.wifiOnly}
              onChange={(event) => handleChange("wifiOnly", event.target.checked)}
              className="h-4 w-4 rounded border-gray-300 text-primary focus:ring-primary"
            />
            Wi-Fiありのみ
          </label>
          <label className="inline-flex items-center gap-2 text-gray-700">
            <input
              type="checkbox"
              checked={filters.showDeleted}
              onChange={(event) =>
                handleChange("showDeleted", event.target.checked)
              }
              className="h-4 w-4 rounded border-gray-300 text-primary focus:ring-primary"
            />
            削除済みを含める
          </label>
        </div>
      </div>
    </div>
  );
}
