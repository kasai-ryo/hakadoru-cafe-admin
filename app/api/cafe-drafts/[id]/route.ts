"use server";

import { NextResponse } from "next/server";
import { getSupabaseServerClient } from "@/app/lib/supabaseServer";

type RouteContext = {
  params: Promise<{
    id: string;
  }>;
};

export async function DELETE(
  _request: Request,
  context: RouteContext,
) {
  const { id } = await context.params;
  if (!id) {
    return NextResponse.json(
      { message: "一時保存IDが指定されていません。" },
      { status: 400 },
    );
  }

  const supabase = getSupabaseServerClient();
  if (!supabase) {
    return NextResponse.json(
      { message: "Supabaseの環境変数が設定されていません。" },
      { status: 500 },
    );
  }

  const { error } = await supabase
    .from("cafe_drafts")
    .delete()
    .eq("id", id);

  if (error) {
    console.error("[cafe-drafts:DELETE] Supabase delete failed", error);
    return NextResponse.json(
      {
        message: "一時保存の削除に失敗しました。",
        detail: String(error.message ?? error),
      },
      { status: 500 },
    );
  }

  return NextResponse.json({ ok: true }, { status: 200 });
}

export async function GET(
  _request: Request,
  context: RouteContext,
) {
  const { id } = await context.params;
  if (!id) {
    return NextResponse.json(
      { message: "一時保存IDが指定されていません。" },
      { status: 400 },
    );
  }

  const supabase = getSupabaseServerClient();
  if (!supabase) {
    return NextResponse.json(
      { message: "Supabaseの環境変数が設定されていません。" },
      { status: 500 },
    );
  }

  const { data, error } = await supabase
    .from("cafe_drafts")
    .select("*")
    .eq("id", id)
    .maybeSingle();

  if (error) {
    console.error("[cafe-drafts:GET:id] Supabase select failed", error);
    return NextResponse.json(
      {
        message: "一時保存の取得に失敗しました。",
        detail: String(error.message ?? error),
      },
      { status: 500 },
    );
  }

  if (!data) {
    return NextResponse.json(
      { message: "指定された一時保存が見つかりません。" },
      { status: 404 },
    );
  }

  return NextResponse.json({
    data: {
      id: data.id,
      savedAt: data.updated_at ?? data.created_at,
      editingCafeId: data.target_cafe_id,
      editingCafeName: data.target_cafe_name,
      cafeName: data.cafe_name ?? "",
      payload: data.payload,
    },
  });
}
