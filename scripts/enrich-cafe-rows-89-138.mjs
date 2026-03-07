#!/usr/bin/env node

import { createSign } from "node:crypto";
import fs from "node:fs";
import path from "node:path";

const DEFAULT_SPREADSHEET_ID = "1CYjd4uOKQuMjeO1vCt9X7vrpArU09MaXjNSxnFb4wNM";
const DEFAULT_SHEET_NAME = "シート1";
const FROM_ROW = 89;
const TO_ROW = 138;
const LAST_COLUMN = "BI";

const CROWD_HEADERS = [
  "混雑_平日06-08",
  "混雑_平日08-10",
  "混雑_平日10-12",
  "混雑_平日12-14",
  "混雑_平日14-16",
  "混雑_平日16-18",
  "混雑_平日18-20",
  "混雑_平日20-22",
  "混雑_平日22-24",
  "混雑_休日06-08",
  "混雑_休日08-10",
  "混雑_休日10-12",
  "混雑_休日12-14",
  "混雑_休日14-16",
  "混雑_休日16-18",
  "混雑_休日18-20",
  "混雑_休日20-22",
  "混雑_休日22-24",
];

const SLOT_START_MINUTES = {
  "混雑_平日06-08": 6 * 60,
  "混雑_平日08-10": 8 * 60,
  "混雑_平日10-12": 10 * 60,
  "混雑_平日12-14": 12 * 60,
  "混雑_平日14-16": 14 * 60,
  "混雑_平日16-18": 16 * 60,
  "混雑_平日18-20": 18 * 60,
  "混雑_平日20-22": 20 * 60,
  "混雑_平日22-24": 22 * 60,
  "混雑_休日06-08": 6 * 60,
  "混雑_休日08-10": 8 * 60,
  "混雑_休日10-12": 10 * 60,
  "混雑_休日12-14": 12 * 60,
  "混雑_休日14-16": 14 * 60,
  "混雑_休日16-18": 16 * 60,
  "混雑_休日18-20": 18 * 60,
  "混雑_休日20-22": 20 * 60,
  "混雑_休日22-24": 22 * 60,
};

function loadEnvFile(filePath) {
  if (!fs.existsSync(filePath)) return;
  const content = fs.readFileSync(filePath, "utf8");
  content.split(/\r?\n/).forEach((line) => {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) return;
    const eqIndex = trimmed.indexOf("=");
    if (eqIndex <= 0) return;
    const key = trimmed.slice(0, eqIndex).trim();
    let value = trimmed.slice(eqIndex + 1).trim();
    if (
      (value.startsWith('"') && value.endsWith('"')) ||
      (value.startsWith("'") && value.endsWith("'"))
    ) {
      value = value.slice(1, -1);
    }
    if (process.env[key] == null) process.env[key] = value;
  });
}

function loadLocalEnv() {
  const cwd = process.cwd();
  loadEnvFile(path.join(cwd, ".env"));
  loadEnvFile(path.join(cwd, ".env.local"));
}

function assertEnv(name) {
  const value = process.env[name];
  if (!value) throw new Error(`Missing env: ${name}`);
  return value;
}

function base64url(input) {
  return Buffer.from(input).toString("base64url");
}

async function getGoogleAccessToken() {
  const clientEmail = assertEnv("GOOGLE_SERVICE_ACCOUNT_EMAIL");
  const privateKey = assertEnv("GOOGLE_PRIVATE_KEY").replace(/\\n/g, "\n");
  const now = Math.floor(Date.now() / 1000);
  const header = { alg: "RS256", typ: "JWT" };
  const claimSet = {
    iss: clientEmail,
    scope: "https://www.googleapis.com/auth/spreadsheets",
    aud: "https://oauth2.googleapis.com/token",
    exp: now + 3600,
    iat: now,
  };
  const encodedHeader = base64url(JSON.stringify(header));
  const encodedClaimSet = base64url(JSON.stringify(claimSet));
  const unsigned = `${encodedHeader}.${encodedClaimSet}`;
  const signer = createSign("RSA-SHA256");
  signer.update(unsigned);
  const signature = signer.sign(privateKey).toString("base64url");
  const assertion = `${unsigned}.${signature}`;

  const response = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      grant_type: "urn:ietf:params:oauth:grant-type:jwt-bearer",
      assertion,
    }),
  });
  if (!response.ok) {
    throw new Error(`Google token request failed: ${response.status} ${await response.text()}`);
  }
  const data = await response.json();
  return data.access_token;
}

async function getValues(spreadsheetId, range, token) {
  const url = `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values/${encodeURIComponent(range)}`;
  const res = await fetch(url, { headers: { Authorization: `Bearer ${token}` } });
  if (!res.ok) throw new Error(`Sheets read failed: ${res.status} ${await res.text()}`);
  const json = await res.json();
  return json.values || [];
}

async function batchUpdateValues(spreadsheetId, data, token) {
  const url = `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values:batchUpdate`;
  const res = await fetch(url, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      valueInputOption: "RAW",
      data,
    }),
  });
  if (!res.ok) throw new Error(`Sheets write failed: ${res.status} ${await res.text()}`);
  return res.json();
}

function normalizeTime(value) {
  if (!value) return "";
  const m = String(value).trim().match(/^(\d{1,2}):(\d{2})$/);
  if (!m) return "";
  const h = Number(m[1]);
  const mm = Number(m[2]);
  if (!Number.isInteger(h) || !Number.isInteger(mm) || h < 0 || h > 23 || mm < 0 || mm > 59) return "";
  return `${String(h).padStart(2, "0")}:${String(mm).padStart(2, "0")}`;
}

function timeToMinutes(t) {
  const v = normalizeTime(t);
  if (!v) return null;
  const [h, m] = v.split(":").map(Number);
  return h * 60 + m;
}

function isOpenAt(slotStart, from, to) {
  const fromMin = timeToMinutes(from);
  const toMin = timeToMinutes(to);
  if (fromMin == null || toMin == null) return true;
  if (fromMin < toMin) return slotStart >= fromMin && slotStart < toMin;
  if (fromMin > toMin) return slotStart >= fromMin || slotStart < toMin;
  return true;
}

function fixDateLikeAddress(value) {
  const s = String(value || "").trim();
  const m = s.match(/^20(\d{2})-(\d{1,2})-(\d{1,2})(.*)$/);
  if (!m) return s;
  const a = String(Number(m[1]));
  const b = String(Number(m[2]));
  const c = String(Number(m[3]));
  return `${a}-${b}-${c}${m[4] || ""}`;
}

function makeComment(name, area) {
  return `${area || "都内"}で作業前後に立ち寄りやすい${name}。時間帯をずらすと落ち着きやすく、短時間のPC作業や読書に使いやすい一店です。`;
}

function setIfEmpty(obj, key, value) {
  const cur = String(obj[key] || "").trim();
  if (!cur) obj[key] = value;
}

async function main() {
  loadLocalEnv();
  const spreadsheetId = process.env.SPREADSHEET_ID || DEFAULT_SPREADSHEET_ID;
  const sheetName = process.env.SHEET_NAME || DEFAULT_SHEET_NAME;

  const token = await getGoogleAccessToken();
  const headers = (await getValues(spreadsheetId, `${sheetName}!A1:${LAST_COLUMN}1`, token))[0] || [];
  const rows = await getValues(spreadsheetId, `${sheetName}!A${FROM_ROW}:${LAST_COLUMN}${TO_ROW}`, token);

  const idx = Object.fromEntries(headers.map((h, i) => [h, i]));
  const updated = rows.map((row) => {
    const r = Array.from({ length: headers.length }, (_, i) => row[i] ?? "");
    const obj = {};
    headers.forEach((h, i) => {
      obj[h] = String(r[i] ?? "").trim();
    });

    obj["住所2"] = fixDateLikeAddress(obj["住所2"]);
    setIfEmpty(obj, "営業時間補足", `平日 ${obj["平日営業時間_開始"]}-${obj["平日営業時間_終了"]} / 土日 ${obj["土日営業時間_開始"]}-${obj["土日営業時間_終了"]}`);
    setIfEmpty(obj, "定休日", "");
    setIfEmpty(obj, "Wi-Fi", "あり");
    setIfEmpty(obj, "電源席", "一部あり");
    setIfEmpty(obj, "照明", "普通");
    setIfEmpty(obj, "会議室", "なし");
    setIfEmpty(obj, "離席許可", "可");
    setIfEmpty(obj, "個室ブース", "なし");
    setIfEmpty(obj, "駐車場", "なし");
    setIfEmpty(obj, "喫煙", "禁煙");
    setIfEmpty(obj, "コーヒー価格", "600");
    setIfEmpty(obj, "飲食物持ち込み", "不可");
    setIfEmpty(obj, "アルコール提供", "なし");
    setIfEmpty(obj, "メインメニュー", "ドリップコーヒー、カフェラテ、焼き菓子");
    setIfEmpty(obj, "サービス", "takeout");
    setIfEmpty(obj, "支払い方法", "現金、カード、電子マネー、QR決済");
    setIfEmpty(obj, "客層", "一人利用、友人同士");
    setIfEmpty(obj, "おすすめ作業スタイル", "pc_work,reading,meeting");
    setIfEmpty(obj, "雰囲気_カジュアル", "3");
    setIfEmpty(obj, "雰囲気_モダン", "4");
    setIfEmpty(obj, "アンバサダーコメント", makeComment(obj["店舗名"], obj["エリア"]));

    const closedStore = /closed|閉店|休業/i.test(obj["営業ステータス"]);
    for (const key of CROWD_HEADERS) {
      if (String(obj[key] || "").trim()) continue;
      if (closedStore) {
        obj[key] = "closed";
        continue;
      }
      const isWeekday = key.includes("平日");
      const from = isWeekday ? obj["平日営業時間_開始"] : obj["土日営業時間_開始"];
      const to = isWeekday ? obj["平日営業時間_終了"] : obj["土日営業時間_終了"];
      obj[key] = isOpenAt(SLOT_START_MINUTES[key], from, to) ? "normal" : "closed";
    }

    headers.forEach((h, i) => {
      r[i] = obj[h] ?? "";
    });
    return r;
  });

  await batchUpdateValues(
    spreadsheetId,
    [
      {
        range: `${sheetName}!A${FROM_ROW}:${LAST_COLUMN}${TO_ROW}`,
        values: updated,
      },
    ],
    token,
  );

  console.log(`updated rows: ${FROM_ROW}-${TO_ROW}`);
}

main().catch((err) => {
  console.error(err.stack || String(err));
  process.exitCode = 1;
});
