"use server";

import { NextResponse } from "next/server";
import { createCafe } from "@/app/api/cafeStore";
import { buildCafeTableInsert, mapCafeRowToCafe } from "@/app/api/cafes";
import {
  validateCafePayload,
  uploadImagesToStorage,
  buildCafeImageInsertRows,
  rollbackCafeInsert,
  geocodeCafeAddress,
} from "@/app/api/cafes/serverHelpers";
import { getSupabaseServerClient } from "@/app/lib/supabaseServer";
import type { Cafe, CafeFormPayload } from "@/app/types/cafe";

export async function POST(request: Request) {
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
  let cafe: Cafe | null = null;
  // supabaseへ画像登録
  if (supabase) {
    try {
      await uploadImagesToStorage(supabase, payload);
    } catch (uploadError) {
      console.error("[cafes:POST] Storage upload failed", uploadError);
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
      const insertPayload = buildCafeTableInsert(payload);
      const { data, error } = await supabase
        .from("cafes")
        .insert(insertPayload)
        .select("*")
        .single();
      if (error) {
        throw error;
      }

      const cafeImageInserts = buildCafeImageInsertRows(
        data.id,
        payload,
      );
      if (cafeImageInserts.length > 0) {
        const { error: imageInsertError } = await supabase
          .from("cafe_images")
          .insert(cafeImageInserts);
        if (imageInsertError) {
          await rollbackCafeInsert(supabase, data.id);
          throw imageInsertError;
        }
      }

      cafe = mapCafeRowToCafe(data, cafeImageInserts);
    } catch (supabaseError) {
      console.error("[cafes:POST] Supabase insert failed", supabaseError);
      return NextResponse.json(
        {
          message: "Supabaseへの登録に失敗しました。",
          detail: String(
            (supabaseError as { message?: string }).message ??
            supabaseError,
          ),
        },
        { status: 500 },
      );
    }
  } else {
    // Supabaseの環境変数が未設定の場合はメモリストアにフォールバック
    cafe = createCafe(payload);
  }

  return NextResponse.json(
    { data: cafe },
    {
      status: 201,
      headers: {
        Location: `/api/cafes/${cafe.id}`,
      },
    },
  );
}
