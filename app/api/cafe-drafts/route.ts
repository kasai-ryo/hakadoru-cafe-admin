"use server";

import { NextResponse } from "next/server";
import { getSupabaseServerClient } from "@/app/lib/supabaseServer";
import { isAdminAuthenticatedFromCookies } from "@/app/lib/adminAuth";

type CafeDraftRow = {
  id: string;
  target_cafe_id: string | null;
  target_cafe_name: string | null;
  cafe_name: string | null;
  payload: unknown;
  created_at: string;
  updated_at: string;
};

export async function GET(request: Request) {
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

  const { searchParams } = new URL(request.url);
  const cafeId = searchParams.get("cafeId");
  const scope = searchParams.get("scope");

  let query = supabase
    .from("cafe_drafts")
    .select("*")
    .order("updated_at", { ascending: false })
    .limit(20);

  if (scope !== "all") {
    query = cafeId
      ? query.eq("target_cafe_id", cafeId)
      : query.is("target_cafe_id", null);
  }

  const { data, error } = await query;
  if (error) {
    console.error("[cafe-drafts:GET] Supabase select failed", error);
    return NextResponse.json(
      {
        message: "一時保存一覧の取得に失敗しました。",
        detail: String(error.message ?? error),
      },
      { status: 500 },
    );
  }

  const rows = (data ?? []) as CafeDraftRow[];
  return NextResponse.json({
    data: rows.map((row) => ({
      id: row.id,
      savedAt: row.updated_at ?? row.created_at,
      editingCafeId: row.target_cafe_id,
      editingCafeName: row.target_cafe_name,
      cafeName: row.cafe_name ?? "",
      payload: row.payload,
    })),
  });
}

export async function POST(request: Request) {
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
    draftId?: string | null;
    editingCafeId?: string | null;
    editingCafeName?: string | null;
    cafeName?: string | null;
    payload?: unknown;
  };
  try {
    body = (await request.json()) as typeof body;
  } catch (error) {
    return NextResponse.json(
      { message: "JSONの解析に失敗しました。", detail: String(error) },
      { status: 400 },
    );
  }

  if (!body || typeof body !== "object" || !body.payload || typeof body.payload !== "object") {
    return NextResponse.json(
      { message: "一時保存データが不正です。" },
      { status: 400 },
    );
  }

  const insertPayload = {
    target_cafe_id: body.editingCafeId ?? null,
    target_cafe_name: body.editingCafeName ?? null,
    cafe_name: body.cafeName ?? null,
    payload: body.payload,
  };

  const query = body.draftId
    ? supabase
        .from("cafe_drafts")
        .update(insertPayload)
        .eq("id", body.draftId)
        .select("*")
        .single()
    : supabase
        .from("cafe_drafts")
        .insert(insertPayload)
        .select("*")
        .single();

  const { data, error } = await query;

  if (error || !data) {
    console.error("[cafe-drafts:POST] Supabase upsert failed", error);
    return NextResponse.json(
      {
        message: "一時保存の保存に失敗しました。",
        detail: String(error?.message ?? error),
      },
      { status: 500 },
    );
  }

  const row = data as CafeDraftRow;
  return NextResponse.json(
    {
      data: {
        id: row.id,
        savedAt: row.updated_at ?? row.created_at,
      },
    },
    { status: body.draftId ? 200 : 201 },
  );
}
