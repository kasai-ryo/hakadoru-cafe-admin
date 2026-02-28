"use server";

import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import {
  ADMIN_SESSION_COOKIE_NAME,
  ADMIN_SESSION_MAX_AGE_SECONDS,
  createAdminSessionToken,
  verifyAdminCredentials,
} from "@/app/lib/adminAuth";

export async function POST(request: Request) {
  let body: { id?: string; password?: string };
  try {
    body = (await request.json()) as typeof body;
  } catch (error) {
    return NextResponse.json(
      { message: "JSONの解析に失敗しました。", detail: String(error) },
      { status: 400 },
    );
  }

  if (
    !body?.id ||
    typeof body.id !== "string" ||
    !body.password ||
    typeof body.password !== "string"
  ) {
    return NextResponse.json(
      { message: "IDとパスワードを指定してください。" },
      { status: 400 },
    );
  }

  if (!verifyAdminCredentials(body.id, body.password)) {
    return NextResponse.json(
      { message: "IDまたはパスワードが正しくありません。" },
      { status: 401 },
    );
  }

  const token = createAdminSessionToken();
  const cookieStore = await cookies();
  cookieStore.set(ADMIN_SESSION_COOKIE_NAME, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: ADMIN_SESSION_MAX_AGE_SECONDS,
  });

  return NextResponse.json({ ok: true }, { status: 200 });
}
