"use server";

import { NextResponse } from "next/server";
import { buildCafeTableInsert, mapCafeRowToCafe } from "@/app/api/cafes";
import {
  validateCafePayload,
  uploadImagesToStorage,
  buildCafeImageInsertRows,
} from "@/app/api/cafes/serverHelpers";
import { getSupabaseServerClient } from "@/app/lib/supabaseServer";
import type { CafeFormPayload } from "@/app/types/cafe";

type RouteContext = {
  params: Promise<{
    id: string;
  }>;
};

export async function PUT(request: Request, context: RouteContext) {
  const { id: cafeId } = await context.params;
  if (!cafeId) {
    return NextResponse.json(
      { message: "カフェIDが指定されていません。" },
      { status: 400 },
    );
  }

  let payload: CafeFormPayload;
  try {
    payload = (await request.json()) as CafeFormPayload;
  } catch (error) {
    return NextResponse.json(
      { message: "JSONの解析に失敗しました", detail: String(error) },
      { status: 400 },
    );
  }

  const errors = validateCafePayload(payload);
  if (errors.length > 0) {
    return NextResponse.json({ errors }, { status: 422 });
  }

  const supabase = getSupabaseServerClient();
  if (!supabase) {
    return NextResponse.json(
      { message: "Supabaseの環境変数が設定されていません。" },
      { status: 500 },
    );
  }

  const { data: existingCafe, error: fetchError } = await supabase
    .from("cafes")
    .select("*")
    .eq("id", cafeId)
    .maybeSingle();

  if (fetchError) {
    console.error("[cafes:PUT] Failed to fetch cafe", fetchError);
    return NextResponse.json(
      {
        message: "カフェ情報の取得に失敗しました。",
        detail: String(fetchError.message ?? fetchError),
      },
      { status: 500 },
    );
  }
  if (!existingCafe) {
    return NextResponse.json(
      { message: "指定されたカフェが見つかりません。" },
      { status: 404 },
    );
  }

  try {
    await uploadImagesToStorage(supabase, payload);
  } catch (uploadError) {
    console.error("[cafes:PUT] Storage upload failed", uploadError);
    return NextResponse.json(
      {
        message: "画像の保存に失敗しました。",
        detail: String(
          (uploadError as { message?: string }).message ?? uploadError,
        ),
      },
      { status: 500 },
    );
  }

  try {
    const updatePayload = buildCafeTableInsert(payload);
    const { data: updatedCafe, error: updateError } = await supabase
      .from("cafes")
      .update(updatePayload)
      .eq("id", cafeId)
      .select("*")
      .single();
    if (updateError || !updatedCafe) {
      throw updateError ?? new Error("更新後のレコード取得に失敗しました。");
    }

    const { data: previousImages, error: selectImageError } = await supabase
      .from("cafe_images")
      .select("*")
      .eq("cafe_id", cafeId);
    if (selectImageError) {
      throw selectImageError;
    }

    const { error: deleteError } = await supabase
      .from("cafe_images")
      .delete()
      .eq("cafe_id", cafeId);
    if (deleteError) {
      throw deleteError;
    }

    const nextImageRows = buildCafeImageInsertRows(cafeId, payload);
    if (nextImageRows.length > 0) {
      const { error: insertError } = await supabase
        .from("cafe_images")
        .insert(nextImageRows);
      if (insertError) {
        if (previousImages?.length) {
          await supabase.from("cafe_images").insert(previousImages);
        }
        throw insertError;
      }
    }

    return NextResponse.json(
      { data: mapCafeRowToCafe(updatedCafe) },
      { status: 200 },
    );
  } catch (error) {
    console.error("[cafes:PUT] Supabase update failed", error);
    return NextResponse.json(
      {
        message: "Supabaseの更新に失敗しました。",
        detail: String((error as { message?: string }).message ?? error),
      },
      { status: 500 },
    );
  }
}

export async function DELETE(
  _request: Request,
  context: RouteContext,
) {
  const { id: cafeId } = await context.params;
  if (!cafeId) {
    return NextResponse.json(
      { message: "カフェIDが指定されていません。" },
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

  const deletedAt = new Date().toISOString();
  const { data, error } = await supabase
    .from("cafes")
    .update({ deleted_at: deletedAt })
    .eq("id", cafeId)
    .select("*")
    .maybeSingle();

  if (error) {
    console.error("[cafes:DELETE] Failed to delete cafe", error);
    return NextResponse.json(
      {
        message: "カフェの削除に失敗しました。",
        detail: String(error.message ?? error),
      },
      { status: 500 },
    );
  }

  if (!data) {
    return NextResponse.json(
      { message: "指定されたカフェが見つかりません。" },
      { status: 404 },
    );
  }

  return NextResponse.json({ data: mapCafeRowToCafe(data) }, { status: 200 });
}
