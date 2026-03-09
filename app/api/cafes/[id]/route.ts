"use server";

import { NextResponse } from "next/server";
import { buildCafeTableInsert, mapCafeRowToCafe } from "@/app/api/cafes";
import {
  validateCafePayload,
  uploadImagesToStorage,
  buildCafeImageInsertRows,
  geocodeCafeAddress,
} from "@/app/api/cafes/serverHelpers";
import { getSupabaseServerClient } from "@/app/lib/supabaseServer";
import { isAdminAuthenticatedFromCookies } from "@/app/lib/adminAuth";
import type { CafeFormPayload } from "@/app/types/cafe";

type RouteContext = {
  params: Promise<{
    id: string;
  }>;
};

export async function PUT(request: Request, context: RouteContext) {
  const isAuthenticated = await isAdminAuthenticatedFromCookies();
  if (!isAuthenticated) {
    return NextResponse.json(
      { message: "管理者ログインが必要です。" },
      { status: 401 },
    );
  }

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

  try {
    const coords = await geocodeCafeAddress(payload);
    if (coords) {
      payload = {
        ...payload,
        latitude: coords.latitude,
        longitude: coords.longitude,
      };
    }
  } catch (geoError) {
    console.warn("[cafes:PUT] Geocoding failed", geoError);
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
    const updatePayload = {
      ...buildCafeTableInsert(payload),
      // 管理画面からの直接更新は承認済みとして扱う
      approval_status: "approved",
      // 編集対象外カラムは既存値を保持
      area: existingCafe.area,
      allow_short_leave: existingCafe.allow_short_leave,
      parking: existingCafe.parking,
      coffee_price: existingCafe.coffee_price,
      bring_own_food: existingCafe.bring_own_food,
      customer_types: existingCafe.customer_types,
    };
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
      { data: mapCafeRowToCafe(updatedCafe, nextImageRows) },
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
  const isAuthenticated = await isAdminAuthenticatedFromCookies();
  if (!isAuthenticated) {
    return NextResponse.json(
      { message: "管理者ログインが必要です。" },
      { status: 401 },
    );
  }

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
    .select("*, cafe_images(*)")
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

export async function PATCH(
  request: Request,
  context: RouteContext,
) {
  const isAuthenticated = await isAdminAuthenticatedFromCookies();
  if (!isAuthenticated) {
    return NextResponse.json(
      { message: "管理者ログインが必要です。" },
      { status: 401 },
    );
  }

  const { id: cafeId } = await context.params;
  if (!cafeId) {
    return NextResponse.json(
      { message: "カフェIDが指定されていません。" },
      { status: 400 },
    );
  }

  let body: { isPublic?: boolean; approvalStatus?: string };
  try {
    body = (await request.json()) as { isPublic?: boolean; approvalStatus?: string };
  } catch (error) {
    return NextResponse.json(
      { message: "JSONの解析に失敗しました", detail: String(error) },
      { status: 400 },
    );
  }

  const hasIsPublic = typeof body.isPublic === "boolean";
  const hasApprovalStatus = typeof body.approvalStatus === "string";

  if (!hasIsPublic && !hasApprovalStatus) {
    return NextResponse.json(
      { message: "isPublic(boolean) または approvalStatus(string) の指定が必要です。" },
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

  const updatePayload: Record<string, unknown> = {};
  if (hasIsPublic) {
    updatePayload.deleted_at = body.isPublic ? null : new Date().toISOString();
  }
  if (hasApprovalStatus) {
    updatePayload.approval_status = body.approvalStatus;
  }

  const { data, error } = await supabase
    .from("cafes")
    .update(updatePayload)
    .eq("id", cafeId)
    .select("*, cafe_images(*)")
    .maybeSingle();

  if (error) {
    console.error("[cafes:PATCH] Failed to update visibility", error);
    return NextResponse.json(
      {
        message: "公開状態の更新に失敗しました。",
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
