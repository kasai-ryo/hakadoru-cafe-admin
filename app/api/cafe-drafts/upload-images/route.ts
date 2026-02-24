"use server";

import { NextResponse } from "next/server";
import { uploadImagesToStorage } from "@/app/api/cafes/serverHelpers";
import { getSupabaseServerClient } from "@/app/lib/supabaseServer";
import type { CafeFormPayload, ImageCategoryKey } from "@/app/types/cafe";

export async function POST(request: Request) {
  const supabase = getSupabaseServerClient();
  if (!supabase) {
    return NextResponse.json(
      { message: "Supabaseの環境変数が設定されていません。" },
      { status: 500 },
    );
  }

  let body: { payload?: CafeFormPayload };
  try {
    body = (await request.json()) as { payload?: CafeFormPayload };
  } catch (error) {
    return NextResponse.json(
      { message: "JSONの解析に失敗しました。", detail: String(error) },
      { status: 400 },
    );
  }

  const payload = body?.payload;
  if (!payload?.images) {
    return NextResponse.json(
      { message: "画像データが不足しています。" },
      { status: 400 },
    );
  }

  try {
    await uploadImagesToStorage(supabase, payload);
  } catch (error) {
    console.error("[cafe-drafts:upload-images] Storage upload failed", error);
    return NextResponse.json(
      {
        message: "下書き画像のアップロードに失敗しました。",
        detail: String((error as { message?: string }).message ?? error),
      },
      { status: 500 },
    );
  }

  const imageUpdates = {} as Record<
    ImageCategoryKey,
    {
      id: string;
      storagePath: string | null;
      caption: string;
      fileBase64: null;
    } | null
  >;

  (
    Object.keys(payload.images) as ImageCategoryKey[]
  ).forEach((key) => {
    const entry = payload.images[key];
    imageUpdates[key] = entry
      ? {
          id: entry.id,
          storagePath: entry.storagePath ?? null,
          caption: entry.caption ?? "",
          fileBase64: null,
        }
      : null;
  });

  return NextResponse.json({ imageUpdates }, { status: 200 });
}
