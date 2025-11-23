import { Buffer } from "node:buffer";
import type { SupabaseClient } from "@supabase/supabase-js";
import type {
  CafeFormPayload,
  ImageCategoryKey,
} from "@/app/types/cafe";

export const REQUIRED_TEXT_FIELDS: Array<
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

export const REQUIRED_IMAGE_CATEGORIES: ImageCategoryKey[] = [
  "main",
  "exterior",
  "interior",
  "power",
  "drink",
];

export const ALL_IMAGE_CATEGORIES: ImageCategoryKey[] = [
  "main",
  "exterior",
  "interior",
  "power",
  "drink",
  "food",
  "other1",
  "other2",
  "other3",
  "other4",
  "other5",
  "other6",
  "other7",
  "other8",
  "other9",
  "other10",
];

const STORAGE_BUCKET =
  process.env.SUPABASE_STORAGE_BUCKET?.trim() || "cafeimages";

export function validateCafePayload(payload: Partial<CafeFormPayload>) {
  const errors: string[] = [];

  REQUIRED_TEXT_FIELDS.forEach((field) => {
    const value = payload[field];
    if (!value || (typeof value === "string" && value.trim() === "")) {
      errors.push(`${field}は必須です`);
    }
  });

  REQUIRED_IMAGE_CATEGORIES.forEach((key) => {
    const entry = payload.images?.[key];
    if (!entry?.storagePath && !entry?.fileBase64) {
      errors.push(`${key}画像は必須です`);
    }
  });

  return errors;
}

export async function uploadImagesToStorage(
  supabase: SupabaseClient,
  payload: CafeFormPayload,
) {
  if (!STORAGE_BUCKET) {
    throw new Error("SUPABASE_STORAGE_BUCKETが設定されていません。");
  }
  if (!payload.images) {
    throw new Error("画像データが不足しています。");
  }
  for (const category of ALL_IMAGE_CATEGORIES) {
    const entry = payload.images[category];
    if (!entry || !entry.fileBase64) {
      continue;
    }
    const storagePath =
      entry.storagePath ||
      generateStoragePath(payload.name, category, entry.fileBase64);
    const { contentType, base64Payload } = parseBase64(entry.fileBase64);
    const fileBuffer = Buffer.from(base64Payload, "base64");
    const { error } = await supabase.storage
      .from(STORAGE_BUCKET)
      .upload(storagePath, fileBuffer, {
        cacheControl: "3600",
        contentType,
        upsert: true,
      });
    if (error) {
      throw error;
    }
    entry.storagePath = storagePath;
    entry.fileBase64 = null;
  }
}

function parseBase64(data: string) {
  const match = data.match(/^data:(.+);base64,(.+)$/);
  if (match) {
    return {
      contentType: match[1],
      base64Payload: match[2],
    };
  }
  return {
    contentType: "image/jpeg",
    base64Payload: data,
  };
}

function generateStoragePath(
  cafeName: string,
  category: string,
  dataUrl: string,
) {
  const { contentType } = parseBase64(dataUrl);
  const ext = contentType.split("/")[1] || "jpg";
  const slug = cafeName
    ? cafeName
        .trim()
        .toLowerCase()
        .replace(/\s+/g, "-")
        .replace(/[^a-z0-9-]/g, "")
    : "";
  const safeName = slug || "cafe";
  return `cafes/${safeName}/${category}-${Date.now()}.${ext}`;
}

export function buildCafeImageInsertRows(
  cafeId: string,
  payload: CafeFormPayload,
) {
  if (!payload.images) {
    return [];
  }
  const rows: Array<{
    cafe_id: string;
    image_url: string;
    image_type: ImageCategoryKey;
    display_order: number;
  }> = [];
  ALL_IMAGE_CATEGORIES.forEach((category, index) => {
    const path = payload.images[category]?.storagePath;
    if (path) {
      rows.push({
        cafe_id: cafeId,
        image_url: path,
        image_type: category,
        display_order: index + 1,
      });
    }
  });
  return rows;
}

export async function rollbackCafeInsert(
  supabase: SupabaseClient,
  cafeId: string,
) {
  const { error } = await supabase.from("cafes").delete().eq("id", cafeId);
  if (error) {
    console.error(
      "[cafes] Failed to rollback cafe insert",
      cafeId,
      error,
    );
  }
}
