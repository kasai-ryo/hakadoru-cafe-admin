"use server";

import { NextResponse } from "next/server";
import { getSupabaseServerClient } from "@/app/lib/supabaseServer";
import { isAdminAuthenticatedFromCookies } from "@/app/lib/adminAuth";

type RequestStatus = "pending" | "approved" | "rejected" | "withdrawn";
type RequestKind = "cafe_request" | "cafe_edit_request";

type CafeRequestRow = {
  id: string;
  account_id: string;
  request_type: string;
  status: RequestStatus;
  data: unknown;
  admin_comment: string | null;
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

const VALID_STATUSES = new Set<RequestStatus>([
  "pending",
  "approved",
  "rejected",
  "withdrawn",
]);

const VALID_KINDS = new Set<RequestKind>(["cafe_request", "cafe_edit_request"]);

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
        "id, account_id, request_type, status, data, admin_comment, created_at, updated_at, reviewed_at",
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

  const cafeIds = Array.from(new Set(cafeEditRequests.map((row) => row.cafe_id)));
  const cafeNameMap = new Map<string, string>();
  if (cafeIds.length > 0) {
    const { data: cafes, error: cafesError } = await supabase
      .from("cafes")
      .select("id, name")
      .in("id", cafeIds);
    if (cafesError) {
      console.error("[admin/requests:GET] Failed to fetch cafes", cafesError);
    } else {
      for (const cafe of cafes ?? []) {
        cafeNameMap.set(cafe.id as string, cafe.name as string);
      }
    }
  }

  const merged = [
    ...cafeRequests.map((row) => ({
      id: row.id,
      kind: "cafe_request" as const,
      accountId: row.account_id,
      requestType: row.request_type,
      status: row.status,
      adminComment: row.admin_comment,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
      reviewedAt: row.reviewed_at,
      payload: row.data,
      cafeId: null as string | null,
      cafeName: null as string | null,
      reason: null as string | null,
    })),
    ...cafeEditRequests.map((row) => ({
      id: row.id,
      kind: "cafe_edit_request" as const,
      accountId: row.account_id,
      requestType: row.request_type,
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

  const reviewedAt =
    body.status === "pending" || body.status === "withdrawn"
      ? null
      : new Date().toISOString();

  const updatePayload = {
    status: body.status,
    admin_comment:
      typeof body.adminComment === "string" && body.adminComment.trim()
        ? body.adminComment.trim()
        : null,
    reviewed_at: reviewedAt,
  };

  const query =
    body.kind === "cafe_request"
      ? supabase
          .from("cafe_requests")
          .update(updatePayload)
          .eq("id", body.id)
          .select("id, status, admin_comment, reviewed_at, updated_at")
          .maybeSingle()
      : supabase
          .from("cafe_edit_requests")
          .update(updatePayload)
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
        status: data.status,
        adminComment: data.admin_comment,
        reviewedAt: data.reviewed_at,
        updatedAt: data.updated_at,
      },
    },
    { status: 200 },
  );
}
