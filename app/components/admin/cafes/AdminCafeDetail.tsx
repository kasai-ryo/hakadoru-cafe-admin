"use client";

import Link from "next/link";
import { useEffect, useState, type ReactNode } from "react";
import type { Cafe, CafeFormPayload, ImageCategoryKey } from "@/app/types/cafe";
import { CafeFormDrawer } from "@/app/components/admin/cafes/CafeFormDrawer";
import { CafeDeleteDialog } from "@/app/components/admin/cafes/CafeDeleteDialog";

interface AdminCafeDetailProps {
  cafe: Cafe;
  initialDraftSnapshotId?: string | null;
}

const ADMIN_ID = "cafe";
const ADMIN_PASSWORD = "hakadoru";
const SESSION_KEY = "hakadoru-admin-session";

export function AdminCafeDetail({
  cafe,
  initialDraftSnapshotId,
}: AdminCafeDetailProps) {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [authError, setAuthError] = useState("");
  const [currentCafe, setCurrentCafe] = useState<Cafe>(cafe);
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);

  useEffect(() => {
    if (typeof window === "undefined") {
      return;
    }
    const stored = window.sessionStorage.getItem(SESSION_KEY);
    if (stored === "authenticated") {
      setIsAuthenticated(true);
    }
  }, []);

  useEffect(() => {
    setCurrentCafe(cafe);
  }, [cafe]);

  useEffect(() => {
    if (initialDraftSnapshotId) {
      setIsDrawerOpen(true);
    }
  }, [initialDraftSnapshotId]);

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

  const handleSave = async (payload: CafeFormPayload) => {
    const response = await fetch(`/api/cafes/${currentCafe.id}`, {
      method: "PUT",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(payload),
    });

    if (!response.ok) {
      let errorMessage = "カフェの更新に失敗しました。";
      try {
        const errorBody = await response.json();
        if (Array.isArray(errorBody?.errors) && errorBody.errors.length > 0) {
          errorMessage = errorBody.errors.join("\n");
        } else if (typeof errorBody?.message === "string") {
          errorMessage = errorBody.message;
        }
      } catch {
        // ignore parse errors
      }
      throw new Error(errorMessage);
    }

    const result = (await response.json()) as { data: Cafe };
    if (!result?.data) {
      throw new Error("更新結果の解析に失敗しました。");
    }
    setCurrentCafe(result.data);
    setIsDrawerOpen(false);
  };

  const handleConfirmVisibilityChange = async () => {
    setIsDeleteDialogOpen(false);
    const nextIsPublic = Boolean(currentCafe.deleted_at);
    const response = await fetch(`/api/cafes/${currentCafe.id}`, {
      method: "PATCH",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ isPublic: nextIsPublic }),
    });
    if (!response.ok) {
      let errorMessage = "公開状態の更新に失敗しました。";
      try {
        const errorBody = await response.json();
        if (Array.isArray(errorBody?.errors) && errorBody.errors.length > 0) {
          errorMessage = errorBody.errors.join("\n");
        } else if (typeof errorBody?.message === "string") {
          errorMessage = errorBody.message;
        }
      } catch {
        // ignore json errors
      }
      throw new Error(errorMessage);
    }
    const result = (await response.json()) as { data: Cafe };
    if (!result?.data) {
      throw new Error("公開状態更新結果の解析に失敗しました。");
    }
    setCurrentCafe(result.data);
  };

  const lockedView = (
    <div className="mx-auto w-full max-w-md rounded-2xl bg-white p-8 shadow-lg">
      <h1 className="text-2xl	font-semibold text-gray-900">管理者ログイン</h1>
      <p className="mt-2 text-sm text-gray-500">
        IDとパスワードを入力して詳細を閲覧してください。
      </p>
      <LoginForm onSubmit={handleLogin} error={authError} />
    </div>
  );

  const detailView = (
    <>
      <header className="flex flex-col gap-4 border-b border-gray-200 pb-6 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <p className="text-sm uppercase tracking-wide text-gray-500">
            <Link
              href="/admin/cafes"
              className="text-primary underline decoration-dotted underline-offset-4"
            >
              カフェ一覧
            </Link>{" "}
            / 詳細
          </p>
          <h1 className="text-3xl font-semibold text-gray-900">
            {currentCafe.name}
          </h1>
          <p className="mt-2 text-sm text-gray-600">{currentCafe.address}</p>
        </div>
        <div className="flex gap-3">
          <button
            onClick={() => setIsDrawerOpen(true)}
            className="rounded-lg border border-gray-200 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
          >
            編集
          </button>
          <button
            onClick={() => setIsDeleteDialogOpen(true)}
            className={`rounded-lg px-4 py-2 text-sm font-medium ${
              currentCafe.deleted_at
                ? "border border-emerald-200 text-emerald-700 hover:bg-emerald-50"
                : "border border-amber-200 text-amber-700 hover:bg-amber-50"
            }`}
          >
            {currentCafe.deleted_at ? "公開にする" : "非公開にする"}
          </button>
        </div>
      </header>

      <div className="mt-6 space-y-6">
        <InfoSection title="基本情報">
          <InfoGrid
            items={[
              { label: "施設タイプ", value: facilityLabel(currentCafe.facilityType) },
              { label: "ステータス", value: statusLabel(currentCafe.status) },
              { label: "利用制限", value: currentCafe.timeLimit || "ー" },
              { label: "Wi-Fi", value: currentCafe.wifi ? "あり" : "なし" },
              {
                label: "電源席の割合",
                value: outletLabel(currentCafe.outlet),
              },
              {
                label: "会議室",
                value: currentCafe.meetingRoom ? "あり" : "なし",
              },
              {
                label: "個別ブース",
                value: currentCafe.hasPrivateBooths ? "あり" : "なし",
              },
              { label: "照明", value: lightingLabel(currentCafe.lighting) },
              { label: "禁煙 / 喫煙", value: smokingLabel(currentCafe.smoking) },
              { label: "喫煙補足", value: currentCafe.smokingNote || "未設定" },
              { label: "equipment_note（設備補足）", value: currentCafe.equipmentNote || "未設定" },
              {
                label: "座席数",
                value: currentCafe.seats ? `${currentCafe.seats}席` : "未設定",
              },
              { label: "アルコール提供", value: alcoholLabel(currentCafe.alcohol) },
              { label: "主要メニュー", value: currentCafe.mainMenu || "未設定" },
              { label: "電話番号", value: currentCafe.phone || "未設定" },
              {
                label: "公式サイト",
                value: renderOptionalLink(currentCafe.website),
              },
              {
                label: "Instagram",
                value: renderOptionalLink(currentCafe.instagramUrl),
              },
              {
                label: "TikTok",
                value: renderOptionalLink(currentCafe.tiktokUrl),
              },
            ]}
          />
        </InfoSection>

        <InfoSection title="住所・アクセス">
          <InfoGrid
            items={[
              { label: "郵便番号", value: currentCafe.postalCode },
              { label: "都道府県", value: currentCafe.prefecture },
              { label: "住所1", value: currentCafe.addressLine1 },
              { label: "住所2", value: currentCafe.addressLine2 || "ー" },
              { label: "住所3", value: currentCafe.addressLine3 || "ー" },
              { label: "最寄駅", value: currentCafe.nearestStation || "ー" },
              { label: "アクセス", value: currentCafe.access || "ー" },
              {
                label: "緯度 / 経度",
                value:
                  currentCafe.latitude && currentCafe.longitude
                    ? `${currentCafe.latitude}, ${currentCafe.longitude}`
                    : "未設定",
              },
            ]}
          />
        </InfoSection>

        <InfoSection title="営業時間・定休日">
          <InfoGrid
            items={[
              {
                label: "平日",
                value: `${currentCafe.hoursWeekdayFrom || "-"} ～ ${currentCafe.hoursWeekdayTo || "-"}`,
              },
              {
                label: "休日",
                value: `${currentCafe.hoursWeekendFrom || "-"} ～ ${currentCafe.hoursWeekendTo || "-"}`,
              },
              {
                label: "定休日",
                value: (currentCafe.regularHolidays || []).join("、") || "なし",
              },
              { label: "補足", value: currentCafe.hoursNote || "ー" },
            ]}
          />
        </InfoSection>

        <InfoSection title="サービス">
          <InfoGrid
            items={[
              { label: "サービス", value: formatList(currentCafe.services) },
              {
                label: "支払い方法",
                value: formatList(currentCafe.paymentMethods),
              },
              {
                label: "おすすめ用途",
                value: formatList(currentCafe.recommendedWorkStyles),
              },
            ]}
          />
        </InfoSection>

        <InfoSection title="混雑度">
          <div className="overflow-hidden rounded-2xl border border-gray-100">
            <table className="min-w-full divide-y divide-gray-100 text-sm text-gray-700">
              <thead className="bg-gray-50 text-xs uppercase text-gray-500">
                <tr>
                  <th className="px-4 py-2 text-left">時間帯</th>
                  <th className="px-4 py-2 text-left">混雑度</th>
                </tr>
              </thead>
              <tbody>
                {crowdItems(currentCafe.crowdMatrix).map((item) => (
                  <tr key={item.label} className="even:bg-gray-50">
                    <td className="px-4 py-2">{item.label}</td>
                    <td className="px-4 py-2 font-medium">{crowdLabel(item.value)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </InfoSection>

        <InfoSection title="雰囲気・コメント">
          <InfoGrid
            items={[
              { label: "カジュアル度", value: `${currentCafe.ambienceCasual}/5` },
              { label: "モダン度", value: `${currentCafe.ambienceModern}/5` },
              { label: "アンバサダーコメント", value: currentCafe.ambassadorComment || "未記入" },
            ]}
          />
        </InfoSection>

        <InfoSection title="画像ギャラリー">
          <div className="grid gap-4 lg:grid-cols-2">
            {imageEntries(currentCafe).map((entry) => (
              <article
                key={entry.label}
                className="overflow-hidden rounded-2xl border border-gray-100 bg-white shadow-sm"
              >
                <div className="border-b border-gray-100 px-4 py-2 text-sm font-medium text-gray-700">
                  {entry.label}
                </div>
                <div className="flex flex-col">
                  {entry.url ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={entry.url} alt={entry.label} className="h-48 w-full object-cover" />
                  ) : (
                    <div className="flex h-48 items-center justify-center bg-gray-50 text-sm text-gray-400">
                      画像なし
                    </div>
                  )}
                  <p className="border-t border-gray-100 px-4 py-3 text-xs text-gray-600">
                    {entry.caption?.trim() ? entry.caption : "キャプション未設定"}
                  </p>
                </div>
              </article>
            ))}
          </div>
        </InfoSection>
      </div>
    </>
  );

  return (
    <section className="mx-auto w-full max-w-5xl px-4 py-10">
      {!isAuthenticated ? lockedView : detailView}

      <CafeFormDrawer
        isOpen={isDrawerOpen}
        onClose={() => setIsDrawerOpen(false)}
        onSubmit={handleSave}
        editingCafe={currentCafe}
        initialDraftSnapshotId={initialDraftSnapshotId}
      />

      <CafeDeleteDialog
        cafe={isDeleteDialogOpen ? currentCafe : null}
        onCancel={() => setIsDeleteDialogOpen(false)}
        onConfirm={handleConfirmVisibilityChange}
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
    <form onSubmit={handleSubmit} className="mt-6 space-y-5 text-sm">
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
        className="w-full rounded-lg bg-primary px-4 py-2 font-semibold text-white hover:bg-primary-dark"
      >
        ログイン
      </button>
    </form>
  );
}

function InfoSection({
  title,
  children,
}: {
  title: string;
  children: ReactNode;
}) {
  return (
    <section className="rounded-2xl border border-gray-100 bg-white p-6 shadow-sm">
      <h2 className="text-lg font-semibold text-gray-900">{title}</h2>
      <div className="mt-4">{children}</div>
    </section>
  );
}

function InfoGrid({
  items,
}: {
  items: Array<{ label: string; value: ReactNode }>;
}) {
  return (
    <dl className="grid grid-cols-1 gap-x-6 gap-y-4 text-sm text-gray-700 sm:grid-cols-2">
      {items.map((item) => (
        <div key={item.label}>
          <dt className="text-gray-500">{item.label}</dt>
          <dd className="mt-1 font-medium">{item.value}</dd>
        </div>
      ))}
    </dl>
  );
}

function formatList(list?: string[] | null) {
  if (!list || list.length === 0) {
    return "未設定";
  }
  return list.join("、");
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

function facilityLabel(facility: Cafe["facilityType"]) {
  switch (facility) {
    case "cafe":
      return "カフェ";
    case "coworking":
      return "コワーキング";
    case "hybrid":
      return "カフェ＋コワーキング";
    case "other":
      return "その他";
    default:
      return facility;
  }
}

function lightingLabel(lighting: Cafe["lighting"]) {
  switch (lighting) {
    case "dark":
      return "暗い";
    case "normal":
      return "普通";
    case "bright":
      return "明るい";
    default:
      return lighting;
  }
}

function smokingLabel(smoking: Cafe["smoking"]) {
  if (smoking === "no_smoking") {
    return "禁煙";
  }
  return "喫煙可能";
}

function alcoholLabel(option: Cafe["alcohol"]) {
  switch (option) {
    case "available":
      return "あり（昼・夜両方）";
    case "night_only":
      return "夜のみあり";
    case "unavailable":
      return "なし";
    default:
      return option;
  }
}

function renderOptionalLink(value?: string | null) {
  if (!value) {
    return "未設定";
  }

  return (
    <a
      href={value}
      target="_blank"
      rel="noreferrer"
      className="text-primary underline decoration-dotted underline-offset-4"
    >
      {value}
    </a>
  );
}

function crowdItems(matrix: Cafe["crowdMatrix"]) {
  return [
    { label: "平日 06:00-08:00", value: matrix.weekday0608 },
    { label: "平日 08:00-10:00", value: matrix.weekday0810 },
    { label: "平日 10:00-12:00", value: matrix.weekday1012 },
    { label: "平日 12:00-14:00", value: matrix.weekday1214 },
    { label: "平日 14:00-16:00", value: matrix.weekday1416 },
    { label: "平日 16:00-18:00", value: matrix.weekday1618 },
    { label: "平日 18:00-20:00", value: matrix.weekday1820 },
    { label: "平日 20:00-22:00", value: matrix.weekday2022 },
    { label: "平日 22:00-24:00", value: matrix.weekday2224 },
    { label: "休日 06:00-08:00", value: matrix.weekend0608 },
    { label: "休日 08:00-10:00", value: matrix.weekend0810 },
    { label: "休日 10:00-12:00", value: matrix.weekend1012 },
    { label: "休日 12:00-14:00", value: matrix.weekend1214 },
    { label: "休日 14:00-16:00", value: matrix.weekend1416 },
    { label: "休日 16:00-18:00", value: matrix.weekend1618 },
    { label: "休日 18:00-20:00", value: matrix.weekend1820 },
    { label: "休日 20:00-22:00", value: matrix.weekend2022 },
    { label: "休日 22:00-24:00", value: matrix.weekend2224 },
  ];
}

function crowdLabel(level: Cafe["crowdMatrix"][keyof Cafe["crowdMatrix"]]) {
  switch (level) {
    case "empty":
      return "空いてる";
    case "normal":
      return "普通";
    case "crowded":
      return "混雑";
    case "unknown":
      return "待ち";
    case "closed":
      return "営業時間外";
    default:
      return level;
  }
}

const SUPABASE_PUBLIC_URL =
  process.env.NEXT_PUBLIC_SUPABASE_URL?.replace(/\/$/, "") ?? "";
const SUPABASE_STORAGE_BUCKET =
  process.env.NEXT_PUBLIC_SUPABASE_STORAGE_BUCKET ?? "cafeimages";

function buildPublicImageUrl(path?: string | null) {
  if (!path) return null;
  if (!SUPABASE_PUBLIC_URL) return null;
  return `${SUPABASE_PUBLIC_URL}/storage/v1/object/public/${SUPABASE_STORAGE_BUCKET}/${path}`;
}

function imageEntries(cafe: Cafe) {
  const entries: Array<{ label: string; url: string | null; caption?: string | null }> = [
    { label: "メイン", url: buildPublicImageUrl(cafe.imageMainPath), caption: cafe.imageCaptions.main },
    { label: "外観", url: buildPublicImageUrl(cafe.imageExteriorPath), caption: cafe.imageCaptions.exterior },
    { label: "内観", url: buildPublicImageUrl(cafe.imageInteriorPath), caption: cafe.imageCaptions.interior },
    { label: "電源席", url: buildPublicImageUrl(cafe.imagePowerPath), caption: cafe.imageCaptions.power },
    { label: "ドリンク", url: buildPublicImageUrl(cafe.imageDrinkPath), caption: cafe.imageCaptions.drink },
    { label: "フード", url: buildPublicImageUrl(cafe.imageFoodPath), caption: cafe.imageCaptions.food },
  ];

  cafe.imageOtherPaths.forEach((path, index) => {
    const key = `other${index + 1}` as ImageCategoryKey;
    entries.push({
      label: `その他${index + 1}`,
      url: buildPublicImageUrl(path),
      caption: cafe.imageCaptions[key],
    });
  });

  return entries;
}
