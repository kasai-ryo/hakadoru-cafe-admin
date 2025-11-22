"use client";

import { useEffect, useMemo, useState } from "react";
import clsx from "clsx";
import type { Cafe, CafeFormPayload } from "@/app/types/cafe";
import {
  CafeFilterBar,
  type CafeFilterState,
} from "@/app/components/admin/cafes/CafeFilterBar";
import { CafeTable } from "@/app/components/admin/cafes/CafeTable";
import { CafeFormDrawer } from "@/app/components/admin/cafes/CafeFormDrawer";
import { CafeDeleteDialog } from "@/app/components/admin/cafes/CafeDeleteDialog";

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
    wifiOnly: false,
    showDeleted: false,
  });
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  const [editingCafe, setEditingCafe] = useState<Cafe | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<Cafe | null>(null);

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
        !`${cafe.name} ${cafe.area} ${cafe.address}`
          .toLowerCase()
          .includes(filters.search.toLowerCase())
      ) {
        return false;
      }
      if (filters.area !== "all" && cafe.area !== filters.area) {
        return false;
      }
      if (filters.status !== "all" && cafe.status !== filters.status) {
        return false;
      }
      if (filters.wifiOnly && !cafe.wifi) {
        return false;
      }
      if (filters.status === "deleted") {
        return Boolean(cafe.deleted_at);
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

  const handleCreate = () => {
    setEditingCafe(null);
    setIsDrawerOpen(true);
  };

  const handleEdit = (cafe: Cafe) => {
    setEditingCafe(cafe);
    setIsDrawerOpen(true);
  };

  const handleSave = (payload: CafeFormPayload) => {
    if (editingCafe) {
      setCafeList((prev) =>
        prev.map((cafe) =>
          cafe.id === editingCafe.id
            ? {
                ...cafe,
                ...payload,
                services: payload.services,
                paymentMethods: payload.paymentMethods,
                updated_at: new Date().toISOString(),
              }
            : cafe,
        ),
      );
    } else {
      const now = new Date().toISOString();
      const newCafe: Cafe = {
        id: `draft-${crypto.randomUUID()}`,
        name: payload.name,
        area: payload.area,
        address: payload.address,
        phone: payload.phone,
        access: "",
        status: payload.status,
        seats: 0,
        seatType: "",
        wifi: payload.wifi,
        wifiSpeed: "",
        outlet: payload.outlet,
        lighting: "normal",
        meetingRoom: false,
        parking: false,
        smoking: "no_smoking",
        coffeePrice: 0,
        bringOwnFood: "allowed",
        alcohol: "unavailable",
        services: payload.services,
        paymentMethods: payload.paymentMethods,
        crowdedness: payload.crowdedness,
        customerTypes: [],
        ambienceCasual: 3,
        ambienceModern: 3,
        ambassadorComment: "",
        website: "",
        timeLimit: "",
        hoursWeekday: "",
        hoursWeekend: "",
        imagePath: payload.imagePath,
        latitude: undefined,
        longitude: undefined,
        deleted_at: null,
        updated_at: now,
      };
      setCafeList((prev) => [newCafe, ...prev]);
    }

    setIsDrawerOpen(false);
    setEditingCafe(null);
  };

  const handleRequestDelete = (cafe: Cafe) => {
    setDeleteTarget(cafe);
  };

  const handleConfirmDelete = () => {
    if (!deleteTarget) return;
    setCafeList((prev) =>
      prev.map((cafe) =>
        cafe.id === deleteTarget.id
          ? { ...cafe, deleted_at: new Date().toISOString() }
          : cafe,
      ),
    );
    setDeleteTarget(null);
  };

  const handleRestore = (cafe: Cafe) => {
    setCafeList((prev) =>
      prev.map((item) =>
        item.id === cafe.id ? { ...item, deleted_at: null } : item,
      ),
    );
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
                Hakadoru Café
              </p>
              <h1 className="text-3xl font-semibold text-gray-900">
                カフェ管理
              </h1>
              <p className="mt-2 text-sm text-gray-600">
                カフェの新規登録・更新・論理削除（アーカイブ）を行う管理画面です。
              </p>
            </div>
            <button
              onClick={handleCreate}
              className="inline-flex items-center justify-center rounded-lg bg-primary px-5 py-3 text-sm font-medium text-white shadow hover:bg-primary-dark"
            >
              ＋ 新規カフェ登録
            </button>
          </header>

          <div className="mt-6 rounded-2xl bg-white p-5 shadow">
            <CafeFilterBar
              filters={filters}
              areaOptions={areaOptions}
              onChange={handleFilterChange}
            />
            <CafeTable
              cafes={filteredCafes}
              onEdit={handleEdit}
              onDelete={handleRequestDelete}
              onRestore={handleRestore}
            />
          </div>
        </>
      )}

      <CafeFormDrawer
        isOpen={isDrawerOpen}
        onClose={() => {
          setIsDrawerOpen(false);
          setEditingCafe(null);
        }}
        onSubmit={handleSave}
        editingCafe={editingCafe}
      />

      <CafeDeleteDialog
        cafe={deleteTarget}
        onCancel={() => setDeleteTarget(null)}
        onConfirm={handleConfirmDelete}
      />
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
          placeholder="例: cafe"
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
          placeholder="例: hakadoru"
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
