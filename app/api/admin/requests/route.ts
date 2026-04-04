"use server";

import { NextResponse } from "next/server";
import { geocodeCafeAddress } from "@/app/api/cafes/serverHelpers";
import { getSupabaseServerClient } from "@/app/lib/supabaseServer";
import { isAdminAuthenticatedFromCookies } from "@/app/lib/adminAuth";
import type { CafeFormPayload } from "@/app/types/cafe";

type RequestStatus = "pending" | "approved" | "rejected" | "withdrawn";
type RequestKind = "cafe_request" | "cafe_edit_request";

type CafeRequestRow = {
  id: string;
  account_id: string;
  admin_comment: string | null;
  cafe_id: string | null;
  created_at: string;
  updated_at: string;
  reviewed_at: string | null;
};

type CafeEditRequestRow = {
  id: string;
  account_id: string;
  cafe_id: string;
  request_type: string;
  status: RequestStatus;
  changes: unknown;
  reason: string | null;
  admin_comment: string | null;
  created_at: string;
  updated_at: string;
  reviewed_at: string | null;
};

type CafeRequestCafeRow = {
  id: string;
  name?: string;
  prefecture: string;
  postal_code: string | null;
  address_line1: string | null;
  address_line2: string | null;
  address_line3: string | null;
  latitude: number | null;
  longitude: number | null;
  first_request_account_id?: string | null;
  instagram_post_url_1?: string | null;
  instagram_post_url_2?: string | null;
  instagram_post_url_3?: string | null;
};

const VALID_STATUSES = new Set<RequestStatus>([
  "pending",
  "approved",
  "rejected",
  "withdrawn",
]);

const VALID_KINDS = new Set<RequestKind>(["cafe_request", "cafe_edit_request"]);

function buildGeocodePayloadFromCafe(cafe: CafeRequestCafeRow): CafeFormPayload {
  return {
    name: "",
    facilityType: "cafe",
    prefecture: cafe.prefecture,
    postalCode: cafe.postal_code ?? "",
    addressLine1: cafe.address_line1 ?? "",
    addressLine2: cafe.address_line2 ?? "",
    addressLine3: cafe.address_line3 ?? "",
    access: "",
    nearestStation: "",
    phone: "",
    status: "open",
    timeLimit: "",
    hoursWeekdayFrom: "",
    hoursWeekdayTo: "",
    hoursWeekendFrom: "",
    hoursWeekendTo: "",
    hoursNote: "",
    regularHolidays: [],
    seats: "",
    wifi: false,
    outlet: "none",
    lighting: "normal",
    meetingRoom: false,
    hasPrivateBooths: false,
    smoking: "no_smoking",
    alcohol: "unavailable",
    mainMenu: "",
    services: [],
    paymentMethods: [],
    recommendedWorkStyles: [],
    crowdMatrix: {
      weekday0608: "unknown",
      weekday0810: "unknown",
      weekday1012: "unknown",
      weekday1214: "unknown",
      weekday1416: "unknown",
      weekday1618: "unknown",
      weekday1820: "unknown",
      weekday2022: "unknown",
      weekday2224: "unknown",
      weekend0608: "unknown",
      weekend0810: "unknown",
      weekend1012: "unknown",
      weekend1214: "unknown",
      weekend1416: "unknown",
      weekend1618: "unknown",
      weekend1820: "unknown",
      weekend2022: "unknown",
      weekend2224: "unknown",
    },
    ambienceCasual: 0,
    ambienceModern: 0,
    ambassadorComment: "",
    website: "",
    instagramUrl: "",
    tiktokUrl: "",
    firstRequestAccountId: cafe.first_request_account_id ?? "",
    instagramPostUrl1: cafe.instagram_post_url_1 ?? "",
    instagramPostUrl2: cafe.instagram_post_url_2 ?? "",
    instagramPostUrl3: cafe.instagram_post_url_3 ?? "",
    smokingNote: "",
    equipmentNote: "",
    latitude: cafe.latitude,
    longitude: cafe.longitude,
    images: {
      main: null,
      exterior: null,
      interior: null,
      power: null,
      drink: null,
      food: null,
      other1: null,
      other2: null,
      other3: null,
      other4: null,
      other5: null,
      other6: null,
      other7: null,
      other8: null,
      other9: null,
      other10: null,
    },
  };
}

export async function GET() {
  const isAuthenticated = await isAdminAuthenticatedFromCookies();
  if (!isAuthenticated) {
    return NextResponse.json(
      { message: "管理者ログインが必要です。" },
      { status: 401 },
    );
  }

  const supabase = getSupabaseServerClient();
  if (!supabase) {
    return NextResponse.json(
      { message: "Supabaseの環境変数が設定されていません。" },
      { status: 500 },
    );
  }

  const [cafeRequestsResult, cafeEditRequestsResult] = await Promise.all([
    supabase
      .from("cafe_requests")
      .select(
        "id, account_id, admin_comment, cafe_id, created_at, updated_at, reviewed_at",
      )
      .order("created_at", { ascending: false }),
    supabase
      .from("cafe_edit_requests")
      .select(
        "id, account_id, cafe_id, request_type, status, changes, reason, admin_comment, created_at, updated_at, reviewed_at",
      )
      .order("created_at", { ascending: false }),
  ]);

  if (cafeRequestsResult.error || cafeEditRequestsResult.error) {
    console.error("[admin/requests:GET] Supabase select failed", {
      cafeRequestsError: cafeRequestsResult.error,
      cafeEditRequestsError: cafeEditRequestsResult.error,
    });
    return NextResponse.json(
      {
        message: "リクエスト一覧の取得に失敗しました。",
        detail:
          cafeRequestsResult.error?.message ??
          cafeEditRequestsResult.error?.message ??
          "Unknown error",
      },
      { status: 500 },
    );
  }

  const cafeRequests = (cafeRequestsResult.data ?? []) as CafeRequestRow[];
  const cafeEditRequests = (cafeEditRequestsResult.data ?? []) as CafeEditRequestRow[];

  const allAccountIds = Array.from(
    new Set([
      ...cafeRequests.map((row) => row.account_id),
      ...cafeEditRequests.map((row) => row.account_id),
    ]),
  );
  const accountNameMap = new Map<string, string>();
  if (allAccountIds.length > 0) {
    const { data: accounts, error: accountsError } = await supabase
      .from("accounts")
      .select("id, display_name")
      .in("id", allAccountIds);
    if (accountsError) {
      console.error("[admin/requests:GET] Failed to fetch accounts", accountsError);
    } else {
      for (const account of accounts ?? []) {
        if (account.display_name) {
          accountNameMap.set(account.id as string, account.display_name as string);
        }
      }
    }
  }

  const cafeIds = Array.from(new Set([
    ...cafeRequests.map((row) => row.cafe_id).filter((id): id is string => id !== null),
    ...cafeEditRequests.map((row) => row.cafe_id),
  ]));
  const cafeNameMap = new Map<string, string>();
  const cafeApprovalStatusMap = new Map<string, RequestStatus>();
  const cafeMetadataMap = new Map<
    string,
    {
      firstRequestAccountId: string | null;
      instagramPostUrl1: string | null;
      instagramPostUrl2: string | null;
      instagramPostUrl3: string | null;
    }
  >();
  if (cafeIds.length > 0) {
    const { data: cafes, error: cafesError } = await supabase
      .from("cafes")
      .select("id, name, approval_status, first_request_account_id, instagram_post_url_1, instagram_post_url_2, instagram_post_url_3")
      .in("id", cafeIds);
    if (cafesError) {
      console.error("[admin/requests:GET] Failed to fetch cafes", cafesError);
    } else {
      for (const cafe of cafes ?? []) {
        cafeNameMap.set(cafe.id as string, cafe.name as string);
        cafeApprovalStatusMap.set(cafe.id as string, (cafe.approval_status as RequestStatus) ?? "pending");
        cafeMetadataMap.set(cafe.id as string, {
          firstRequestAccountId: (cafe.first_request_account_id as string | null) ?? null,
          instagramPostUrl1: (cafe.instagram_post_url_1 as string | null) ?? null,
          instagramPostUrl2: (cafe.instagram_post_url_2 as string | null) ?? null,
          instagramPostUrl3: (cafe.instagram_post_url_3 as string | null) ?? null,
        });
      }
    }
  }

  const merged = [
    ...cafeRequests.map((row) => ({
      id: row.id,
      kind: "cafe_request" as const,
      accountId: row.account_id,
      accountName: accountNameMap.get(row.account_id) ?? null,
      status: row.cafe_id ? (cafeApprovalStatusMap.get(row.cafe_id) ?? "pending") : ("pending" as RequestStatus),
      adminComment: row.admin_comment,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
      reviewedAt: row.reviewed_at,
      payload: row.cafe_id
        ? {
          cafeName: cafeNameMap.get(row.cafe_id) ?? null,
            firstRequestAccountId:
              cafeMetadataMap.get(row.cafe_id)?.firstRequestAccountId ?? null,
            instagramPostUrl1:
              cafeMetadataMap.get(row.cafe_id)?.instagramPostUrl1 ?? null,
            instagramPostUrl2:
              cafeMetadataMap.get(row.cafe_id)?.instagramPostUrl2 ?? null,
            instagramPostUrl3:
              cafeMetadataMap.get(row.cafe_id)?.instagramPostUrl3 ?? null,
          }
        : null,
      cafeId: row.cafe_id ?? null,
      cafeName: row.cafe_id ? (cafeNameMap.get(row.cafe_id) ?? null) : null,
      reason: null as string | null,
    })),
    ...cafeEditRequests.map((row) => ({
      id: row.id,
      kind: "cafe_edit_request" as const,
      accountId: row.account_id,
      accountName: accountNameMap.get(row.account_id) ?? null,
      status: row.status,
      adminComment: row.admin_comment,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
      reviewedAt: row.reviewed_at,
      payload: row.changes,
      cafeId: row.cafe_id,
      cafeName: cafeNameMap.get(row.cafe_id) ?? null,
      reason: row.reason,
    })),
  ].sort(
    (a, b) =>
      new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
  );

  return NextResponse.json({ data: merged }, { status: 200 });
}

export async function PATCH(request: Request) {
  const isAuthenticated = await isAdminAuthenticatedFromCookies();
  if (!isAuthenticated) {
    return NextResponse.json(
      { message: "管理者ログインが必要です。" },
      { status: 401 },
    );
  }

  const supabase = getSupabaseServerClient();
  if (!supabase) {
    return NextResponse.json(
      { message: "Supabaseの環境変数が設定されていません。" },
      { status: 500 },
    );
  }

  let body: {
    id?: string;
    kind?: RequestKind;
    status?: RequestStatus;
    adminComment?: string | null;
    approvalData?: Record<string, unknown>;
  };
  try {
    body = (await request.json()) as typeof body;
  } catch (error) {
    return NextResponse.json(
      { message: "JSONの解析に失敗しました。", detail: String(error) },
      { status: 400 },
    );
  }

  if (!body.id || typeof body.id !== "string") {
    return NextResponse.json(
      { message: "リクエストIDが指定されていません。" },
      { status: 400 },
    );
  }
  if (!body.kind || !VALID_KINDS.has(body.kind)) {
    return NextResponse.json(
      { message: "kind は cafe_request または cafe_edit_request を指定してください。" },
      { status: 400 },
    );
  }
  if (!body.status || !VALID_STATUSES.has(body.status)) {
    return NextResponse.json(
      { message: "status が不正です。" },
      { status: 400 },
    );
  }

  // cafe_request: 紐づくカフェの approval_status を更新
  if (body.kind === "cafe_request") {
    const { data: reqRow, error: fetchError } = await supabase
      .from("cafe_requests")
      .select("cafe_id")
      .eq("id", body.id)
      .single();

    if (fetchError || !reqRow) {
      return NextResponse.json(
        { message: "リクエストデータの取得に失敗しました。", detail: fetchError?.message },
        { status: 500 },
      );
    }

    if (reqRow.cafe_id) {
      const cafeUpdatePayload: Record<string, unknown> = {
        approval_status: body.status,
      };

      if (body.status === "approved") {
        const { data: cafeRow, error: cafeFetchError } = await supabase
          .from("cafes")
          .select("id, prefecture, postal_code, address_line1, address_line2, address_line3, latitude, longitude")
          .eq("id", reqRow.cafe_id)
          .maybeSingle();

        if (cafeFetchError) {
          console.error("[admin/requests:PATCH] Failed to fetch cafe for geocoding", cafeFetchError);
          return NextResponse.json(
            { message: "承認対象カフェの取得に失敗しました。", detail: cafeFetchError.message },
            { status: 500 },
          );
        }

        if (cafeRow && (cafeRow.latitude == null || cafeRow.longitude == null)) {
          try {
            const coords = await geocodeCafeAddress(
              buildGeocodePayloadFromCafe(cafeRow as CafeRequestCafeRow),
            );
            if (coords) {
              cafeUpdatePayload.latitude = coords.latitude;
              cafeUpdatePayload.longitude = coords.longitude;
            }
          } catch (geoError) {
            console.warn("[admin/requests:PATCH] Geocoding failed during cafe_request approval", geoError);
          }
        }
      }

      const { error: cafeUpdateError } = await supabase
        .from("cafes")
        .update(cafeUpdatePayload)
        .eq("id", reqRow.cafe_id);

      if (cafeUpdateError) {
        console.error("[admin/requests:PATCH] Failed to update cafe approval_status", cafeUpdateError);
        return NextResponse.json(
          { message: "カフェの承認ステータス更新に失敗しました。", detail: cafeUpdateError.message },
          { status: 500 },
        );
      }
    }
  }

  // cafe_edit_request: 承認時にカフェ情報を自動更新
  if (body.status === "approved" && body.kind === "cafe_edit_request") {
    const { data: editRow, error: fetchError } = await supabase
      .from("cafe_edit_requests")
      .select("cafe_id, changes")
      .eq("id", body.id)
      .single();

    if (fetchError || !editRow) {
      return NextResponse.json(
        { message: "修正リクエストデータの取得に失敗しました。", detail: fetchError?.message },
        { status: 500 },
      );
    }

    const cafeUpdatePayload: Record<string, unknown> = {};

    if (body.approvalData && Object.keys(body.approvalData).length > 0) {
      Object.assign(cafeUpdatePayload, body.approvalData);
    } else {
      const changes = editRow.changes as {
        fields?: Record<string, { after: unknown }>;
        content?: string;
      };
      if (changes.fields) {
        for (const [field, diff] of Object.entries(changes.fields)) {
          cafeUpdatePayload[field] = diff.after;
        }
      }
    }

    if (Object.keys(cafeUpdatePayload).length > 0) {
      const { error: updateError } = await supabase
        .from("cafes")
        .update(cafeUpdatePayload)
        .eq("id", editRow.cafe_id);

      if (updateError) {
        console.error("[admin/requests:PATCH] Failed to update cafe", updateError);
        return NextResponse.json(
          { message: "カフェ情報の更新に失敗しました。", detail: updateError.message },
          { status: 500 },
        );
      }
    }
  }

  // リクエストレコードの更新
  const reviewedAt =
    body.status === "pending" || body.status === "withdrawn"
      ? null
      : new Date().toISOString();

  const adminComment =
    typeof body.adminComment === "string" && body.adminComment.trim()
      ? body.adminComment.trim()
      : null;

  const query =
    body.kind === "cafe_request"
      ? supabase
          .from("cafe_requests")
          .update({
            admin_comment: adminComment,
            reviewed_at: reviewedAt,
          })
          .eq("id", body.id)
          .select("id, admin_comment, reviewed_at, updated_at")
          .maybeSingle()
      : supabase
          .from("cafe_edit_requests")
          .update({
            status: body.status,
            admin_comment: adminComment,
            reviewed_at: reviewedAt,
          })
          .eq("id", body.id)
          .select("id, status, admin_comment, reviewed_at, updated_at")
          .maybeSingle();

  const { data, error } = await query;

  if (error) {
    console.error("[admin/requests:PATCH] Supabase update failed", error);
    return NextResponse.json(
      {
        message: "ステータス更新に失敗しました。",
        detail: String(error.message ?? error),
      },
      { status: 500 },
    );
  }

  if (!data) {
    return NextResponse.json(
      { message: "対象リクエストが見つかりません。" },
      { status: 404 },
    );
  }

  return NextResponse.json(
    {
      data: {
        id: data.id,
        kind: body.kind,
        status: body.status,
        adminComment: data.admin_comment,
        reviewedAt: data.reviewed_at,
        updatedAt: data.updated_at,
      },
    },
    { status: 200 },
  );
}
