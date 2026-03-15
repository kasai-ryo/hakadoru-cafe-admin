"use client";

import Link from "next/link";
import { useEffect, useState, type ReactNode } from "react";
import type { Cafe, CafeFormPayload, ImageCategoryKey } from "@/app/types/cafe";
import { CafeFormDrawer } from "@/app/components/admin/cafes/CafeFormDrawer";
import { CafeDeleteDialog } from "@/app/components/admin/cafes/CafeDeleteDialog";

function approvalLabel(status: Cafe["approval_status"]) {
  switch (status) {
    case "approved":
      return "承認済み";
    case "rejected":
      return "非承認";
    case "withdrawn":
      return "取り下げ";
    case "pending":
    default:
      return "審査中";
  }
}

function approvalBadgeStyle(status: Cafe["approval_status"]) {
  switch (status) {
    case "approved":
      return "bg-emerald-100 text-emerald-800 border border-emerald-200";
    case "rejected":
      return "bg-rose-100 text-rose-800 border border-rose-200";
    case "withdrawn":
      return "bg-slate-100 text-slate-700 border border-slate-200";
    case "pending":
    default:
      return "bg-amber-100 text-amber-800 border border-amber-200";
  }
}

interface AdminCafeDetailProps {
  cafe: Cafe;
  cafeRequest?: {
    id: string;
    accountId: string;
    accountName: string | null;
    adminComment: string | null;
    createdAt: string;
    updatedAt: string;
    reviewedAt: string | null;
  } | null;
  initialAuthenticated?: boolean;
  initialDraftSnapshotId?: string | null;
}

const ADMIN_ID = "cafe";
const ADMIN_PASSWORD = "hakadoru";
const SESSION_KEY = "hakadoru-admin-session";

export function AdminCafeDetail({
  cafe,
  cafeRequest = null,
  initialAuthenticated = false,
  initialDraftSnapshotId,
}: AdminCafeDetailProps) {
  const [isAuthenticated, setIsAuthenticated] = useState(initialAuthenticated);
  const [authError, setAuthError] = useState("");
  const [currentCafe, setCurrentCafe] = useState<Cafe>(cafe);
  const [currentCafeRequest, setCurrentCafeRequest] = useState(cafeRequest);
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [requestStatus, setRequestStatus] = useState<"approved" | "rejected">(
    cafe.approval_status === "rejected" ? "rejected" : "approved",
  );
  const [requestAdminComment, setRequestAdminComment] = useState(cafeRequest?.adminComment ?? "");
  const [isSavingRequest, setIsSavingRequest] = useState(false);
  const [requestSaveError, setRequestSaveError] = useState("");
  const [requestSaveMessage, setRequestSaveMessage] = useState("");



  useEffect(() => {
    if (initialAuthenticated) {
      return;
    }
    if (typeof window === "undefined") {
      return;
    }
    const stored = window.sessionStorage.getItem(SESSION_KEY);
    if (stored === "authenticated") {
      setIsAuthenticated(true);
    }
  }, [initialAuthenticated]);

  useEffect(() => {
    setCurrentCafe(cafe);
  }, [cafe]);

  useEffect(() => {
    setCurrentCafeRequest(cafeRequest);
    setRequestAdminComment(cafeRequest?.adminComment ?? "");
  }, [cafeRequest]);

  useEffect(() => {
    setRequestStatus(currentCafe.approval_status === "rejected" ? "rejected" : "approved");
  }, [currentCafe.approval_status]);

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

  const handleRequestReviewSave = async () => {
    if (!currentCafeRequest) {
      return;
    }

    setIsSavingRequest(true);
    setRequestSaveError("");
    setRequestSaveMessage("");

    try {
      const response = await fetch("/api/admin/requests", {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          id: currentCafeRequest.id,
          kind: "cafe_request",
          status: requestStatus,
          adminComment: requestAdminComment,
        }),
      });

      const result = (await response.json()) as {
        message?: string;
        data?: {
          adminComment: string | null;
          reviewedAt: string | null;
          updatedAt: string;
          status: Cafe["approval_status"];
        };
      };

      if (!response.ok || !result.data) {
        throw new Error(result.message ?? "掲載リクエストの更新に失敗しました。");
      }

      setCurrentCafe((prev) => ({
        ...prev,
        approval_status: result.data?.status ?? prev.approval_status,
      }));
      setCurrentCafeRequest((prev) =>
        prev
          ? {
              ...prev,
              adminComment: result.data?.adminComment ?? null,
              reviewedAt: result.data?.reviewedAt ?? null,
              updatedAt: result.data?.updatedAt ?? prev.updatedAt,
            }
          : prev,
      );
      setRequestAdminComment(result.data.adminComment ?? "");
      setRequestSaveMessage(
        requestStatus === "approved" ? "掲載リクエストを承認しました。" : "掲載リクエストを非承認にしました。",
      );
    } catch (error) {
      setRequestSaveError(
        (error as { message?: string }).message ?? "掲載リクエストの更新に失敗しました。",
      );
    } finally {
      setIsSavingRequest(false);
    }
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
        <InfoSection title="掲載リクエスト">
          {currentCafeRequest ? (
            <div className="space-y-5">
              <div className="rounded-2xl border border-blue-100 bg-blue-50 p-4">
                <p className="text-sm font-semibold text-blue-900">この詳細ページのカフェ情報が掲載申請内容です。</p>
                <p className="mt-1 text-sm text-blue-800">
                  内容を確認した上で、下の審査パネルから管理者コメントと承認結果を登録してください。
                </p>
              </div>

              <InfoGrid
                items={[
                  {
                    label: "申請者",
                    value: currentCafeRequest.accountName
                      ? `${currentCafeRequest.accountName}（${currentCafeRequest.accountId}）`
                      : currentCafeRequest.accountId,
                  },
                  { label: "申請ID", value: currentCafeRequest.id },
                  { label: "申請日時", value: formatDateTime(currentCafeRequest.createdAt) },
                  { label: "最終更新", value: formatDateTime(currentCafeRequest.updatedAt) },
                  { label: "レビュー日時", value: formatDateTime(currentCafeRequest.reviewedAt) },
                  {
                    label: "現在の審査状態",
                    value: (
                      <span
                        className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${approvalBadgeStyle(currentCafe.approval_status)}`}
                      >
                        {approvalLabel(currentCafe.approval_status)}
                      </span>
                    ),
                  },
                ]}
              />

              <div className="rounded-2xl border border-gray-200 bg-gray-50 p-5">
                <h3 className="text-base font-semibold text-gray-900">審査パネル</h3>
                <div className="mt-4 space-y-4">
                  <div>
                    <p className="text-sm font-medium text-gray-700">審査結果</p>
                    <div className="mt-2 flex flex-col gap-2 sm:flex-row">
                      <label className="flex items-center gap-2 rounded-lg border border-gray-200 bg-white px-4 py-3 text-sm text-gray-800">
                        <input
                          type="radio"
                          name="requestStatus"
                          value="approved"
                          checked={requestStatus === "approved"}
                          onChange={() => setRequestStatus("approved")}
                          disabled={isSavingRequest}
                        />
                        承認
                      </label>
                      <label className="flex items-center gap-2 rounded-lg border border-gray-200 bg-white px-4 py-3 text-sm text-gray-800">
                        <input
                          type="radio"
                          name="requestStatus"
                          value="rejected"
                          checked={requestStatus === "rejected"}
                          onChange={() => setRequestStatus("rejected")}
                          disabled={isSavingRequest}
                        />
                        非承認
                      </label>
                    </div>
                  </div>

                  <label className="block">
                    <span className="text-sm font-medium text-gray-700">管理者コメント</span>
                    <textarea
                      value={requestAdminComment}
                      onChange={(event) => setRequestAdminComment(event.target.value)}
                      rows={4}
                      disabled={isSavingRequest}
                      placeholder="審査結果の理由や補足を入力"
                      className="mt-2 w-full rounded-xl border border-gray-300 bg-white px-4 py-3 text-sm focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
                    />
                  </label>

                  {requestSaveError && (
                    <p className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-600">
                      {requestSaveError}
                    </p>
                  )}
                  {requestSaveMessage && (
                    <p className="rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm text-emerald-700">
                      {requestSaveMessage}
                    </p>
                  )}

                  <div className="flex justify-end">
                    <button
                      type="button"
                      onClick={() => void handleRequestReviewSave()}
                      disabled={isSavingRequest}
                      className="rounded-lg bg-primary px-5 py-2.5 text-sm font-semibold text-white hover:bg-primary-dark disabled:cursor-not-allowed disabled:opacity-60"
                    >
                      {isSavingRequest ? "更新中..." : requestStatus === "approved" ? "承認する" : "非承認にする"}
                    </button>
                  </div>
                </div>
              </div>
            </div>
          ) : (
            <div className="rounded-2xl border border-dashed border-gray-300 bg-gray-50 px-4 py-6 text-sm text-gray-600">
              このカフェに紐づく掲載リクエストは見つかりませんでした。
            </div>
          )}
        </InfoSection>

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
                value:
                  formatMappedList(currentCafe.regularHolidays, REGULAR_HOLIDAY_LABELS) ||
                  "なし",
              },
              { label: "補足", value: currentCafe.hoursNote || "ー" },
            ]}
          />
        </InfoSection>

        <InfoSection title="サービス">
          <InfoGrid
            items={[
              {
                label: "サービス",
                value: formatMappedList(currentCafe.services, SERVICE_LABELS),
              },
              {
                label: "支払い方法",
                value: formatList(currentCafe.paymentMethods),
              },
              {
                label: "おすすめ用途",
                value: formatMappedList(
                  currentCafe.recommendedWorkStyles,
                  RECOMMENDED_WORK_LABELS,
                ),
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

      <hr className="my-10 border-gray-300" />

      <div className="space-y-4">
        <h2 className="text-lg font-semibold text-gray-900">承認</h2>
        <div className="flex items-center gap-3">
          <span className="text-sm text-gray-500">ステータス:</span>
          <span
            className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${approvalBadgeStyle(currentCafe.approval_status)}`}
          >
            {approvalLabel(currentCafe.approval_status)}
          </span>
        </div>
        <p className="text-sm text-gray-600">
          掲載審査は上部の「掲載リクエスト」セクションから操作できます。
        </p>
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

function formatDateTime(isoString: string | null) {
  if (!isoString) {
    return "ー";
  }

  const date = new Date(isoString);
  if (Number.isNaN(date.getTime())) {
    return isoString;
  }

  return date.toLocaleString("ja-JP");
}

const REGULAR_HOLIDAY_LABELS: Record<string, string> = {
  monday: "月曜日",
  tuesday: "火曜日",
  wednesday: "水曜日",
  thursday: "木曜日",
  friday: "金曜日",
  saturday: "土曜日",
  sunday: "日曜日",
};

const SERVICE_LABELS: Record<string, string> = {
  pet_ok: "ペットOK",
  terrace: "テラス席あり",
  takeout: "テイクアウト",
  window_seat: "窓際席あり",
};

const RECOMMENDED_WORK_LABELS: Record<string, string> = {
  pc_work: "PC作業",
  reading: "読書",
  study: "勉強",
  meeting: "打合せ",
};

function formatMappedList(
  list: string[] | null | undefined,
  labels: Record<string, string>,
) {
  if (!list || list.length === 0) {
    return "未設定";
  }

  return list.map((item) => labels[item] ?? item).join("、");
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
