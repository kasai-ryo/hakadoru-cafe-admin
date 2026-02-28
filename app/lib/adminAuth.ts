import { createHmac, timingSafeEqual } from "crypto";
import { cookies } from "next/headers";

export const ADMIN_SESSION_COOKIE_NAME = "hakadoru-admin-session";
export const ADMIN_SESSION_MAX_AGE_SECONDS = 60 * 60 * 12;

function getAdminId() {
  return process.env.ADMIN_LOGIN_ID ?? "cafe";
}

function getAdminPassword() {
  return process.env.ADMIN_LOGIN_PASSWORD ?? "hakadoru";
}

function getSessionSecret() {
  return process.env.ADMIN_SESSION_SECRET ?? "dev-admin-session-secret";
}

function asBuffer(value: string) {
  return Buffer.from(value, "utf8");
}

function safeEqual(left: string, right: string) {
  const leftBuffer = asBuffer(left);
  const rightBuffer = asBuffer(right);
  if (leftBuffer.length !== rightBuffer.length) return false;
  return timingSafeEqual(leftBuffer, rightBuffer);
}

function signPayload(payloadBase64: string) {
  return createHmac("sha256", getSessionSecret())
    .update(payloadBase64)
    .digest("base64url");
}

export function verifyAdminCredentials(id: string, password: string) {
  return safeEqual(id, getAdminId()) && safeEqual(password, getAdminPassword());
}

export function createAdminSessionToken() {
  const payloadBase64 = Buffer.from(
    JSON.stringify({
      sub: getAdminId(),
      exp: Math.floor(Date.now() / 1000) + ADMIN_SESSION_MAX_AGE_SECONDS,
    }),
    "utf8",
  ).toString("base64url");
  const signature = signPayload(payloadBase64);
  return `${payloadBase64}.${signature}`;
}

export function verifyAdminSessionToken(token: string | null | undefined) {
  if (!token) return false;
  const [payloadBase64, signature] = token.split(".");
  if (!payloadBase64 || !signature) return false;
  const expectedSignature = signPayload(payloadBase64);
  if (!safeEqual(signature, expectedSignature)) return false;

  try {
    const payload = JSON.parse(
      Buffer.from(payloadBase64, "base64url").toString("utf8"),
    ) as { sub?: string; exp?: number };
    if (!payload?.sub || !payload?.exp) return false;
    if (!safeEqual(payload.sub, getAdminId())) return false;
    return payload.exp > Math.floor(Date.now() / 1000);
  } catch {
    return false;
  }
}

export async function isAdminAuthenticatedFromCookies() {
  const cookieStore = await cookies();
  return verifyAdminSessionToken(
    cookieStore.get(ADMIN_SESSION_COOKIE_NAME)?.value,
  );
}
