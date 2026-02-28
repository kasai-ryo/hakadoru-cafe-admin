"use client";

import { useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import type { Cafe, CafeFormPayload } from "@/app/types/cafe";
import { CafeFormDrawer } from "@/app/components/admin/cafes/CafeFormDrawer";

export default function AdminCafeNewPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [authError, setAuthError] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isCheckingSession, setIsCheckingSession] = useState(true);

  useEffect(() => {
    const checkSession = async () => {
      setIsCheckingSession(true);
      try {
        const response = await fetch("/api/admin/auth/session", {
          cache: "no-store",
        });
        const data = (await response.json()) as { authenticated?: boolean };
        setIsAuthenticated(Boolean(data.authenticated));
      } catch {
        setIsAuthenticated(false);
      } finally {
        setIsCheckingSession(false);
      }
    };
    void checkSession();
  }, []);

  const handleLogin = async (id: string, password: string) => {
    setAuthError("");
    setIsSubmitting(true);
    try {
      const response = await fetch("/api/admin/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id, password }),
      });
      const data = (await response.json()) as { message?: string };
      if (!response.ok) {
        throw new Error(data.message ?? "ログインに失敗しました。");
      }
      setIsAuthenticated(true);
    } catch (error) {
      setAuthError(
        (error as { message?: string }).message ??
          "IDまたはパスワードが正しくありません。",
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleSave = async (payload: CafeFormPayload) => {
    const response = await fetch("/api/cafes", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(payload),
    });

    if (!response.ok) {
      let errorMessage = "カフェの登録に失敗しました。";
      try {
        const errorBody = await response.json();
        if (Array.isArray(errorBody?.errors) && errorBody.errors.length > 0) {
          errorMessage = errorBody.errors.join("\n");
        } else if (typeof errorBody?.message === "string") {
          errorMessage = errorBody.message;
        }
      } catch {
        // ignore
      }
      throw new Error(errorMessage);
    }

    const result = (await response.json()) as { data: Cafe };
    if (!result?.data) {
      throw new Error("登録結果の解析に失敗しました。");
    }
  };

  if (isCheckingSession) {
    return (
      <main className="min-h-screen bg-gray-50 px-4 py-10">
        <div className="mx-auto w-full max-w-md rounded-2xl bg-white p-8 shadow-lg">
          <p className="text-sm text-gray-600">認証状態を確認中...</p>
        </div>
      </main>
    );
  }

  if (!isAuthenticated) {
    return (
      <main className="min-h-screen bg-gray-50 px-4 py-10">
        <div className="mx-auto w-full max-w-md rounded-2xl bg-white p-8 shadow-lg">
          <h1 className="text-2xl font-semibold text-gray-900">管理者ログイン</h1>
          <p className="mt-2 text-sm text-gray-500">
            IDとパスワードを入力して新規カフェ登録画面にアクセスしてください。
          </p>
          <LoginForm
            onSubmit={handleLogin}
            error={authError}
            isSubmitting={isSubmitting}
          />
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-gray-50">
      <CafeFormDrawer
        isOpen
        onClose={() => router.push("/admin/cafes")}
        onSubmit={handleSave}
        editingCafe={null}
        initialDraftSnapshotId={searchParams.get("draftId")}
        layout="page"
        showDraftSnapshotList={false}
      />
    </main>
  );
}

function LoginForm({
  onSubmit,
  isSubmitting,
  error,
}: {
  onSubmit: (id: string, password: string) => Promise<void>;
  isSubmitting: boolean;
  error?: string;
}) {
  const [id, setId] = useState("");
  const [password, setPassword] = useState("");

  return (
    <form
      className="mt-6 space-y-5 text-sm"
      onSubmit={(event) => {
        event.preventDefault();
        void onSubmit(id, password);
      }}
    >
      <div>
        <label className="text-xs font-semibold uppercase tracking-wide text-gray-500">
          管理者ID
        </label>
        <input
          value={id}
          onChange={(event) => setId(event.target.value)}
          className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2 focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
        />
      </div>
      <div>
        <label className="text-xs font-semibold uppercase tracking-wide text-gray-500">
          パスワード
        </label>
        <input
          type="password"
          value={password}
          onChange={(event) => setPassword(event.target.value)}
          className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2 focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
        />
      </div>
      {error && <p className="text-sm text-red-600">{error}</p>}
      <button
        type="submit"
        disabled={isSubmitting}
        className="w-full rounded-lg bg-primary px-4 py-2 font-semibold text-white hover:bg-primary-dark"
      >
        {isSubmitting ? "ログイン中..." : "ログイン"}
      </button>
    </form>
  );
}
