"use server";

import { NextResponse } from "next/server";
import { isAdminAuthenticatedFromCookies } from "@/app/lib/adminAuth";

export async function GET() {
  const authenticated = await isAdminAuthenticatedFromCookies();
  return NextResponse.json({ authenticated }, { status: 200 });
}
