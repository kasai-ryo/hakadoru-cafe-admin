"use server";

import { NextResponse } from "next/server";
import { getSupabaseServerClient } from "@/app/lib/supabaseServer";
import { isAdminAuthenticatedFromCookies } from "@/app/lib/adminAuth";
import { normalize } from "@geolonia/normalize-japanese-addresses";

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

const PREFECTURES = [
  "北海道","青森県","岩手県","宮城県","秋田県","山形県","福島県",
  "茨城県","栃木県","群馬県","埼玉県","千葉県","東京都","神奈川県",
  "新潟県","富山県","石川県","福井県","山梨県","長野県","岐阜県",
  "静岡県","愛知県","三重県","滋賀県","京都府","大阪府","兵庫県",
  "奈良県","和歌山県","鳥取県","島根県","岡山県","広島県","山口県",
  "徳島県","香川県","愛媛県","高知県","福岡県","佐賀県","長崎県",
  "熊本県","大分県","宮崎県","鹿児島県","沖縄県",
];

const VALID_OUTLETS = new Set(["all", "most", "half", "some", "none"]);
const VALID_LIGHTING = new Set(["dark", "normal", "bright"]);
const VALID_SMOKING = new Set(["no_smoking", "separated", "e_cigarette", "allowed"]);
const VALID_BRING_OWN_FOOD = new Set(["allowed", "not_allowed", "drinks_only"]);

function extractPrefecture(address: string): string {
  for (const pref of PREFECTURES) {
    if (address.includes(pref)) return pref;
  }
  return "東京都";
}

function parseHoursText(text: unknown): { from: string | null; to: string | null } {
  if (!text || typeof text !== "string" || !text.trim()) return { from: null, to: null };
  const match = text.match(/(\d{1,2}:\d{2})\s*[-~～ー]\s*(\d{1,2}:\d{2})/);
  if (match) {
    return { from: match[1], to: match[2] };
  }
  return { from: text.trim(), to: null };
}

function toStringOrNull(value: unknown): string | null {
  if (value === null || value === undefined || value === "") return null;
  return String(value);
}

function toNumberOrNull(value: unknown): number | null {
  if (value === null || value === undefined || value === "") return null;
  if (typeof value === "number") return value;
  const num = Number(value);
  return Number.isNaN(num) ? null : num;
}

function toBoolean(value: unknown): boolean {
  return value === true || value === "true";
}

function toValidEnum(value: unknown, validSet: Set<string>): string | null {
  if (!value || typeof value !== "string") return null;
  return validSet.has(value) ? value : null;
}

function buildCafeInsertFromRequest(data: Record<string, unknown>) {
  const name = String(data.name || "");

  // Detect new format (CafeFormPayload-style with addressLine1) vs old format (address string)
  const isNewFormat = "addressLine1" in data || "hoursWeekdayFrom" in data;

  let address: string;
  let addressLine1: string | null;
  let addressLine2: string | null;
  let addressLine3: string | null;
  let prefecture: string;
  let postalCode: string;
  let access: string | null;
  let hoursWeekdayFrom: string | null;
  let hoursWeekdayTo: string | null;
  let hoursWeekendFrom: string | null;
  let hoursWeekendTo: string | null;
  let hoursNote: string | null;

  if (isNewFormat) {
    prefecture = toStringOrNull(data.prefecture) || "東京都";
    addressLine1 = toStringOrNull(data.addressLine1);
    addressLine2 = toStringOrNull(data.addressLine2);
    addressLine3 = toStringOrNull(data.addressLine3);
    address = toStringOrNull(data.address) || `${prefecture}${addressLine1 || ""}${addressLine2 || ""}${addressLine3 || ""}`;
    postalCode = toStringOrNull(data.postalCode) || "";
    access = toStringOrNull(data.access);
    hoursWeekdayFrom = toStringOrNull(data.hoursWeekdayFrom);
    hoursWeekdayTo = toStringOrNull(data.hoursWeekdayTo);
    hoursWeekendFrom = toStringOrNull(data.hoursWeekendFrom);
    hoursWeekendTo = toStringOrNull(data.hoursWeekendTo);
    hoursNote = toStringOrNull(data.hoursNote);
  } else {
    address = String(data.address || "");
    prefecture = extractPrefecture(address);
    addressLine1 = address;
    addressLine2 = null;
    addressLine3 = null;
    postalCode = toStringOrNull(data.postal_code) || "";
    access = null;
    const weekdayHours = parseHoursText(data.hours_weekday);
    const weekendHours = parseHoursText(data.hours_weekend);
    hoursWeekdayFrom = weekdayHours.from;
    hoursWeekdayTo = weekdayHours.to;
    hoursWeekendFrom = weekendHours.from;
    hoursWeekendTo = weekendHours.to;
    hoursNote = toStringOrNull(data.notes);
  }

  const area = toStringOrNull(data.area) || address || "未設定";

  return {
    name,
    facility_type: toStringOrNull(data.facilityType) || toStringOrNull(data.facility_type) || "cafe",
    area,
    prefecture,
    postal_code: postalCode,
    address_line1: addressLine1,
    address_line2: addressLine2,
    address_line3: addressLine3,
    address,
    access,
    nearest_station: toStringOrNull(data.nearestStation) || toStringOrNull(data.nearest_station),
    phone: toStringOrNull(data.phone),
    status: "open",
    time_limit: toStringOrNull(data.timeLimit) || toStringOrNull(data.time_limit),
    hours_weekday_from: hoursWeekdayFrom,
    hours_weekday_to: hoursWeekdayTo,
    hours_weekend_from: hoursWeekendFrom,
    hours_weekend_to: hoursWeekendTo,
    hours_note: hoursNote,
    regular_holidays: Array.isArray(data.regularHolidays)
      ? data.regularHolidays
      : Array.isArray(data.regular_holidays)
        ? data.regular_holidays
        : [],
    seats: toNumberOrNull(data.seats),
    wifi: toBoolean(data.wifi),
    outlet: toValidEnum(data.outlet, VALID_OUTLETS),
    lighting: toValidEnum(data.lighting, VALID_LIGHTING),
    meeting_room: toBoolean(data.meetingRoom) || toBoolean(data.meeting_room),
    allow_short_leave: toBoolean(data.allowsShortLeave),
    private_booths: toBoolean(data.hasPrivateBooths),
    parking: toBoolean(data.parking),
    smoking: toValidEnum(data.smoking, VALID_SMOKING),
    coffee_price: toNumberOrNull(data.coffeePrice) ?? toNumberOrNull(data.coffee_price),
    bring_own_food: toValidEnum(data.bringOwnFood, VALID_BRING_OWN_FOOD) || toValidEnum(data.bring_own_food, VALID_BRING_OWN_FOOD),
    alcohol: toValidEnum(data.alcohol, new Set(["available", "night_only", "unavailable"])),
    services: Array.isArray(data.services) ? data.services : [],
    payment_methods: Array.isArray(data.paymentMethods)
      ? data.paymentMethods
      : Array.isArray(data.payment_methods)
        ? data.payment_methods
        : [],
    customer_types: Array.isArray(data.customerTypes) ? data.customerTypes : [],
    recommended_work: Array.isArray(data.recommendedWorkStyles) ? data.recommendedWorkStyles : [],
    crowd_levels: (data.crowdMatrix || {}) as Record<string, unknown>,
    ambience_casual: toNumberOrNull(data.ambienceCasual),
    ambience_modern: toNumberOrNull(data.ambienceModern),
    ambassador_comment: toStringOrNull(data.ambassadorComment),
    website: toStringOrNull(data.website),
    instagram_url: toStringOrNull(data.instagramUrl),
    tiktok_url: toStringOrNull(data.tiktokUrl),
    smoking_note: toStringOrNull(data.smokingNote),
    equipment_note: toStringOrNull(data.equipmentNote),
    main_menu: toStringOrNull(data.mainMenu),
    latitude: null as number | null,
    longitude: null as number | null,
  };
}

async function geocodeAddress(address: string): Promise<{ latitude: number; longitude: number } | null> {
  if (!address.trim()) return null;
  try {
    const result = await normalize(address);
    const lat = result?.point?.lat;
    const lng = result?.point?.lng;
    if (typeof lat === "number" && typeof lng === "number") {
      return { latitude: lat, longitude: lng };
    }
  } catch (e) {
    console.warn("[admin/requests] Geocoding failed", e);
  }
  return null;
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

  // 承認時のカフェ自動作成/更新
  if (body.status === "approved") {
    if (body.kind === "cafe_request") {
      // 掲載リクエスト承認 → カフェ自動作成
      const { data: requestRow, error: fetchError } = await supabase
        .from("cafe_requests")
        .select("data")
        .eq("id", body.id)
        .single();

      if (fetchError || !requestRow) {
        return NextResponse.json(
          { message: "リクエストデータの取得に失敗しました。", detail: fetchError?.message },
          { status: 500 },
        );
      }

      const mergedData = {
        ...(requestRow.data as Record<string, unknown>),
        ...(body.approvalData || {}),
      };

      const cafeInsert = buildCafeInsertFromRequest(mergedData);

      // ジオコーディング
      const coords = await geocodeAddress(cafeInsert.address);
      if (coords) {
        cafeInsert.latitude = coords.latitude;
        cafeInsert.longitude = coords.longitude;
      }

      const { error: cafeError } = await supabase
        .from("cafes")
        .insert(cafeInsert);

      if (cafeError) {
        console.error("[admin/requests:PATCH] Failed to create cafe", cafeError);
        return NextResponse.json(
          { message: "カフェの作成に失敗しました。", detail: cafeError.message },
          { status: 500 },
        );
      }
    }

    if (body.kind === "cafe_edit_request") {
      // 修正リクエスト承認 → カフェ情報自動更新
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
        // 管理者が値を調整した場合はそちらを使用
        Object.assign(cafeUpdatePayload, body.approvalData);
      } else {
        // 元のリクエストの after 値を使用
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
  }

  // ステータス更新
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
