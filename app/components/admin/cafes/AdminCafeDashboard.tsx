"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import clsx from "clsx";
import type { Cafe } from "@/app/types/cafe";
import {
  CafeFilterBar,
  type CafeFilterState,
} from "@/app/components/admin/cafes/CafeFilterBar";
import { CafeTable } from "@/app/components/admin/cafes/CafeTable";

interface AdminCafeDashboardProps {
  cafes: Cafe[];
  initialAuthenticated: boolean;
}

export function AdminCafeDashboard({
  cafes,
  initialAuthenticated,
}: AdminCafeDashboardProps) {
  const [isAuthenticated, setIsAuthenticated] = useState(initialAuthenticated);
  const [authError, setAuthError] = useState("");
  const [isLoggingIn, setIsLoggingIn] = useState(false);
  const [cafeList, setCafeList] = useState<Cafe[]>(cafes);
  const [filters, setFilters] = useState<CafeFilterState>({
    search: "",
    area: "all",
    status: "all",
    approval: "all",
    showDeleted: true,
  });

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
      if (filters.approval !== "all") {
        if (filters.approval === "approved" && cafe.approval_status !== "approved") {
          return false;
        }
        if (filters.approval === "unapproved" && cafe.approval_status === "approved") {
          return false;
        }
      }
      return true;
    });
  }, [cafeList, filters]);

  const areaOptions = useMemo(() => {
    const unique = new Set(
      cafeList
        .map((cafe) => (typeof cafe.area === "string" ? cafe.area.trim() : ""))
        .filter((area) => area.length > 0),
    );
    return Array.from(unique).sort();
  }, [cafeList]);

  const handleLogin = async (id: string, password: string) => {
    setIsLoggingIn(true);
    setAuthError("");
    try {
      const response = await fetch("/api/admin/auth/login", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ id, password }),
      });
      const data = (await response.json()) as { message?: string };
      if (!response.ok) {
        throw new Error(data.message ?? "ログインに失敗しました。");
      }
      setIsAuthenticated(true);
      if (typeof window !== "undefined") {
        window.location.reload();
      }
    } catch (error) {
      setAuthError(
        (error as { message?: string }).message ??
          "IDまたはパスワードが正しくありません。",
      );
    } finally {
      setIsLoggingIn(false);
    }
  };

  const handleLogout = async () => {
    try {
      await fetch("/api/admin/auth/logout", {
        method: "POST",
      });
    } finally {
      setIsAuthenticated(false);
      setAuthError("");
      setCafeList([]);
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
      <LoginForm onSubmit={handleLogin} error={authError} isSubmitting={isLoggingIn} />
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
                href="/admin/requests"
                className="inline-flex items-center justify-center rounded-lg border border-gray-300 bg-white px-4 py-3 text-sm font-medium text-gray-700 shadow-sm hover:bg-gray-50"
              >
                リクエストを確認
              </Link>
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
              <button
                type="button"
                onClick={() => void handleLogout()}
                className="inline-flex items-center justify-center rounded-lg border border-red-200 bg-white px-4 py-3 text-sm font-medium text-red-600 shadow-sm hover:bg-red-50"
              >
                ログアウト
              </button>
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
  onSubmit: (id: string, password: string) => Promise<void>;
  isSubmitting: boolean;
  error?: string;
}

function LoginForm({ onSubmit, error, isSubmitting }: LoginFormProps) {
  const [id, setId] = useState("");
  const [password, setPassword] = useState("");

  const handleSubmit = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    void onSubmit(id, password);
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
        disabled={isSubmitting}
        className={clsx(
          "w-full rounded-lg bg-primary px-4 py-2 text-sm font-medium text-white",
          "hover:bg-primary-dark disabled:cursor-not-allowed disabled:opacity-60",
        )}
      >
        {isSubmitting ? "ログイン中..." : "ログイン"}
      </button>
    </form>
  );
}
