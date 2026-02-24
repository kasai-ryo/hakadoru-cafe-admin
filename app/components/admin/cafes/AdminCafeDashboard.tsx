"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import clsx from "clsx";
import type { Cafe } from "@/app/types/cafe";
import {
  CafeFilterBar,
  type CafeFilterState,
} from "@/app/components/admin/cafes/CafeFilterBar";
import { CafeTable } from "@/app/components/admin/cafes/CafeTable";

interface AdminCafeDashboardProps {
  cafes: Cafe[];
}

const ADMIN_ID = "cafe";
const ADMIN_PASSWORD = "hakadoru";
const SESSION_KEY = "hakadoru-admin-session";

export function AdminCafeDashboard({ cafes }: AdminCafeDashboardProps) {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [authError, setAuthError] = useState("");
  const [cafeList, setCafeList] = useState<Cafe[]>(cafes);
  const [filters, setFilters] = useState<CafeFilterState>({
    search: "",
    area: "all",
    status: "all",
    showDeleted: true,
  });

  useEffect(() => {
    if (typeof window === "undefined") {
      return;
    }
    const stored = window.sessionStorage.getItem(SESSION_KEY);
    if (stored === "authenticated") {
      setIsAuthenticated(true);
    }
  }, []);

  const filteredCafes = useMemo(() => {
    return cafeList.filter((cafe) => {
      if (!filters.showDeleted && cafe.deleted_at) {
        return false;
      }
      if (
        filters.search &&
        !`${cafe.name} ${cafe.area} ${cafe.address} ${cafe.nearestStation}`
          .toLowerCase()
          .includes(filters.search.toLowerCase())
      ) {
        return false;
      }
      if (filters.area !== "all" && cafe.area !== filters.area) {
        return false;
      }
      if (filters.status !== "all") {
        if (filters.status === "deleted") {
          return Boolean(cafe.deleted_at);
        }
        if (cafe.status !== filters.status) {
          return false;
        }
      }
      return true;
    });
  }, [cafeList, filters]);

  const areaOptions = useMemo(() => {
    const unique = new Set(cafeList.map((cafe) => cafe.area));
    return Array.from(unique);
  }, [cafeList]);

  const handleLogin = (id: string, password: string) => {
    if (id === ADMIN_ID && password === ADMIN_PASSWORD) {
      setIsAuthenticated(true);
      setAuthError("");
      if (typeof window !== "undefined") {
        window.sessionStorage.setItem(SESSION_KEY, "authenticated");
      }
    } else {
      setAuthError("IDまたはパスワードが正しくありません。");
    }
  };

  const handleFilterChange = (nextFilters: CafeFilterState) => {
    setFilters(nextFilters);
  };

  const lockedView = (
    <div className="mx-auto w-full max-w-md rounded-2xl bg-white p-8 shadow-lg">
      <h1 className="text-2xl font-semibold text-gray-900">
        管理者ログイン
      </h1>
      <p className="mt-2 text-sm text-gray-500">
        IDとパスワードを入力してカフェ管理画面にアクセスしてください。
      </p>
      <LoginForm onSubmit={handleLogin} error={authError} />
    </div>
  );

  return (
    <section className="mx-auto w-full max-w-6xl px-4 py-10">
      {!isAuthenticated ? (
        lockedView
      ) : (
        <>
          <header className="flex flex-col gap-4 border-b border-gray-200 pb-6 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <p className="text-sm uppercase tracking-wide text-gray-500">
                ハカドルカフェ
              </p>
              <h1 className="text-3xl font-semibold text-gray-900">
                カフェ管理
              </h1>
              <p className="mt-2 text-sm text-gray-600">
                カフェの新規登録・更新・公開/非公開の切り替えを行う管理画面です。
              </p>
              <p className="mt-1 text-xs text-gray-500">
                ※非公開のカフェも初期表示で一覧に含まれます。必要に応じて絞り込みを調整してください。
              </p>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <Link
                href="/admin/cafe-drafts"
                className="inline-flex items-center justify-center rounded-lg border border-gray-300 bg-white px-4 py-3 text-sm font-medium text-gray-700 shadow-sm hover:bg-gray-50"
              >
                一時保存一覧
              </Link>
              <Link
                href="/admin/cafes/new"
                className="inline-flex items-center justify-center rounded-lg bg-primary px-5 py-3 text-sm font-medium text-white shadow hover:bg-primary-dark"
              >
                ＋ 新規カフェ登録
              </Link>
            </div>
          </header>

          <div className="mt-6 rounded-2xl bg-white p-5 shadow">
            <CafeFilterBar
              filters={filters}
              areaOptions={areaOptions}
              onChange={handleFilterChange}
            />
            <CafeTable cafes={filteredCafes} />
          </div>
        </>
      )}

    </section>
  );
}

interface LoginFormProps {
  onSubmit: (id: string, password: string) => void;
  error?: string;
}

function LoginForm({ onSubmit, error }: LoginFormProps) {
  const [id, setId] = useState("");
  const [password, setPassword] = useState("");

  const handleSubmit = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    onSubmit(id, password);
  };

  return (
    <form className="mt-6 space-y-4" onSubmit={handleSubmit}>
      <div>
        <label className="text-sm font-medium text-gray-700" htmlFor="admin-id">
          管理者ID
        </label>
        <input
          id="admin-id"
          type="text"
          value={id}
          onChange={(event) => setId(event.target.value)}
          className="mt-1 w-full rounded-lg border border-gray-300 px-4 py-2 focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
        />
      </div>
      <div>
        <label
          className="text-sm font-medium text-gray-700"
          htmlFor="admin-password"
        >
          パスワード
        </label>
        <input
          id="admin-password"
          type="password"
          value={password}
          onChange={(event) => setPassword(event.target.value)}
          className="mt-1 w-full rounded-lg border border-gray-300 px-4 py-2 focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
        />
      </div>
      {error && (
        <p className="text-sm text-red-600" role="alert">
          {error}
        </p>
      )}
      <button
        type="submit"
        className={clsx(
          "w-full rounded-lg bg-primary px-4 py-2 text-sm font-medium text-white",
          "hover:bg-primary-dark",
        )}
      >
        ログイン
      </button>
    </form>
  );
}
