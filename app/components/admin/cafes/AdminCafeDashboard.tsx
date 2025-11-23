"use client";

import { useEffect, useMemo, useState } from "react";
import clsx from "clsx";
import type {
  Cafe,
  CafeFormPayload,
  ImageCategoryKey,
} from "@/app/types/cafe";
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
    const updatedCafe = mapPayloadToCafe(payload, editingCafe ?? undefined);
    if (editingCafe) {
      setCafeList((prev) =>
        prev.map((cafe) => (cafe.id === editingCafe.id ? updatedCafe : cafe)),
      );
    } else {
      setCafeList((prev) => [updatedCafe, ...prev]);
    }
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
                ハカドルカフェ
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

function mapPayloadToCafe(payload: CafeFormPayload, base?: Cafe): Cafe {
  const now = new Date().toISOString();
  const combinedAddress = [
    payload.prefecture,
    payload.addressLine1,
    payload.addressLine2,
    payload.addressLine3,
  ]
    .filter(Boolean)
    .join("");

  const images = payload.images;

  return {
    id: base?.id ?? `draft-${crypto.randomUUID()}`,
    name: payload.name,
    facilityType: payload.facilityType,
    area: payload.area,
    prefecture: payload.prefecture,
    postalCode: payload.postalCode,
    addressLine1: payload.addressLine1,
    addressLine2: payload.addressLine2,
    addressLine3: payload.addressLine3,
    address: combinedAddress,
    access: payload.access,
    phone: payload.phone,
    status: payload.status,
    timeLimit: payload.timeLimit,
    hoursWeekdayFrom: payload.hoursWeekdayFrom,
    hoursWeekdayTo: payload.hoursWeekdayTo,
    hoursWeekendFrom: payload.hoursWeekendFrom,
    hoursWeekendTo: payload.hoursWeekendTo,
    hoursNote: payload.hoursNote,
    regularHolidays: payload.regularHolidays,
    seats:
      typeof payload.seats === "number"
        ? payload.seats
        : Number(payload.seats) || 0,
    wifi: payload.wifi,
    outlet: payload.outlet,
    lighting: payload.lighting,
    meetingRoom: payload.meetingRoom,
    allowsShortLeave: payload.allowsShortLeave,
    hasPrivateBooths: payload.hasPrivateBooths,
    parking: payload.parking,
    smoking: payload.smoking,
    coffeePrice: payload.coffeePrice,
    bringOwnFood: payload.bringOwnFood,
    alcohol: payload.alcohol,
    services: payload.services,
    paymentMethods: payload.paymentMethods,
    customerTypes: payload.customerTypes,
    crowdMatrix: payload.crowdMatrix,
    ambienceCasual: payload.ambienceCasual,
    ambienceModern: payload.ambienceModern,
    ambassadorComment: payload.ambassadorComment,
    website: payload.website,
    imageMainPath: images.main?.storagePath || base?.imageMainPath || "",
    imageExteriorPath:
      images.exterior?.storagePath || base?.imageExteriorPath || "",
    imageInteriorPath:
      images.interior?.storagePath || base?.imageInteriorPath || "",
    imagePowerPath:
      images.power?.storagePath || base?.imagePowerPath || "",
    imageDrinkPath:
      images.drink?.storagePath || base?.imageDrinkPath || "",
    imageFoodPath:
      images.food?.storagePath || base?.imageFoodPath || undefined,
    imageOtherPaths: (() => {
      const next: string[] = [];
      for (let i = 1; i <= 10; i += 1) {
        const key = `other${i}` as ImageCategoryKey;
        const path = images[key]?.storagePath;
        if (path) {
          next.push(path);
        }
      }
      return next;
    })(),
    deleted_at: base?.deleted_at ?? null,
    updated_at: now,
  };
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
