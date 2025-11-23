"use server";

import { NextResponse } from "next/server";
import { createCafe } from "@/app/api/cafeStore";
import { buildCafeTableInsert, mapCafeRowToCafe } from "@/app/api/cafes";
import { getSupabaseServerClient } from "@/app/lib/supabaseServer";
import type {
  Cafe,
  CafeFormPayload,
  ImageCategoryKey,
} from "@/app/types/cafe";

const REQUIRED_TEXT_FIELDS: Array<
  keyof Pick<
    CafeFormPayload,
    | "name"
    | "facilityType"
    | "area"
    | "prefecture"
    | "postalCode"
    | "addressLine1"
    | "addressLine2"
  >
> = [
    "name",
    "facilityType",
    "area",
    "prefecture",
    "postalCode",
    "addressLine1",
    "addressLine2",
  ];

const REQUIRED_IMAGE_CATEGORIES: ImageCategoryKey[] = [
  "main",
  "exterior",
  "interior",
  "power",
  "drink",
];

function validateCafePayload(payload: Partial<CafeFormPayload>) {
  const errors: string[] = [];

  REQUIRED_TEXT_FIELDS.forEach((field) => {
    const value = payload[field];
    if (!value || (typeof value === "string" && value.trim() === "")) {
      errors.push(`${field}は必須です`);
    }
  });

  REQUIRED_IMAGE_CATEGORIES.forEach((key) => {
    if (!payload.images?.[key]?.storagePath) {
      errors.push(`${key}画像は必須です`);
    }
  });

  return errors;
}

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

  if (supabase) {
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
      cafe = mapCafeRowToCafe(data);
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
