#!/usr/bin/env node

import { createSign, randomUUID } from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import { createClient } from "@supabase/supabase-js";
import { normalize } from "@geolonia/normalize-japanese-addresses";

const DEFAULT_SPREADSHEET_ID = "1CYjd4uOKQuMjeO1vCt9X7vrpArU09MaXjNSxnFb4wNM";
const DEFAULT_SHEET_NAME = "シート1";
const LAST_COLUMN = "CR";

const REQUIRED_FIELDS = [
  "name",
  "facilityType",
  "prefecture",
  "postalCode",
  "addressLine1",
  "addressLine2",
  "nearestStation",
];

const ALLOWED_REGULAR_HOLIDAY_VALUES = new Set([
  "monday",
  "tuesday",
  "wednesday",
  "thursday",
  "friday",
  "saturday",
  "sunday",
  "holiday",
]);

const ALLOWED_SERVICE_VALUES = new Set([
  "pet_ok",
  "terrace",
  "takeout",
  "window_seat",
]);

const ALLOWED_RECOMMENDED_WORK_VALUES = new Set([
  "pc_work",
  "reading",
  "study",
  "meeting",
]);

const CROWD_KEYS = [
  "weekday0608",
  "weekday0810",
  "weekday1012",
  "weekday1214",
  "weekday1416",
  "weekday1618",
  "weekday1820",
  "weekday2022",
  "weekday2224",
  "weekend0608",
  "weekend0810",
  "weekend1012",
  "weekend1214",
  "weekend1416",
  "weekend1618",
  "weekend1820",
  "weekend2022",
  "weekend2224",
];

const CROWD_SLOT_START_MINUTES = {
  weekday0608: 6 * 60,
  weekday0810: 8 * 60,
  weekday1012: 10 * 60,
  weekday1214: 12 * 60,
  weekday1416: 14 * 60,
  weekday1618: 16 * 60,
  weekday1820: 18 * 60,
  weekday2022: 20 * 60,
  weekday2224: 22 * 60,
  weekend0608: 6 * 60,
  weekend0810: 8 * 60,
  weekend1012: 10 * 60,
  weekend1214: 12 * 60,
  weekend1416: 14 * 60,
  weekend1618: 16 * 60,
  weekend1820: 18 * 60,
  weekend2022: 20 * 60,
  weekend2224: 22 * 60,
};

const IMAGE_KEYS = [
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

const IMAGE_HEADER_MAP = {
  main: ["画像_メイン_パス", "画像_メイン_キャプション"],
  exterior: ["画像_外観_パス", "画像_外観_キャプション"],
  interior: ["画像_内観_パス", "画像_内観_キャプション"],
  power: ["画像_電源席_パス", "画像_電源席_キャプション"],
  drink: ["画像_ドリンク_パス", "画像_ドリンク_キャプション"],
  food: ["画像_フード_パス", "画像_フード_キャプション"],
  other1: ["画像_その他1_パス", "画像_その他1_キャプション"],
  other2: ["画像_その他2_パス", "画像_その他2_キャプション"],
  other3: ["画像_その他3_パス", "画像_その他3_キャプション"],
  other4: ["画像_その他4_パス", "画像_その他4_キャプション"],
  other5: ["画像_その他5_パス", "画像_その他5_キャプション"],
  other6: ["画像_その他6_パス", "画像_その他6_キャプション"],
  other7: ["画像_その他7_パス", "画像_その他7_キャプション"],
  other8: ["画像_その他8_パス", "画像_その他8_キャプション"],
  other9: ["画像_その他9_パス", "画像_その他9_キャプション"],
  other10: ["画像_その他10_パス", "画像_その他10_キャプション"],
};

function parseArgs(argv) {
  const args = {
    spreadsheetId: process.env.SPREADSHEET_ID || DEFAULT_SPREADSHEET_ID,
    sheetName: process.env.SHEET_NAME || DEFAULT_SHEET_NAME,
    fromRow: Number(process.env.FROM_ROW || 2),
    toRow: process.env.TO_ROW ? Number(process.env.TO_ROW) : null,
    apply: false,
    help: false,
  };
  for (let i = 0; i < argv.length; i += 1) {
    const a = argv[i];
    if (a === "--apply") args.apply = true;
    else if (a === "--help" || a === "-h") args.help = true;
    else if (a === "--spreadsheet-id") args.spreadsheetId = argv[++i];
    else if (a === "--sheet") args.sheetName = argv[++i];
    else if (a === "--from-row") args.fromRow = Number(argv[++i]);
    else if (a === "--to-row") args.toRow = Number(argv[++i]);
  }
  return args;
}

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
    if (process.env[key] == null) {
      process.env[key] = value;
    }
  });
}

function loadLocalEnv() {
  const cwd = process.cwd();
  loadEnvFile(path.join(cwd, ".env"));
  loadEnvFile(path.join(cwd, ".env.local"));
}

function printHelp() {
  console.log(`Usage:
  npm run drafts:import -- [options]
  npm run drafts:import:apply -- [options]

Options:
  --apply                    Insert cafes into cafes table as public (deleted_at null)
  --spreadsheet-id <id>      Spreadsheet ID (default: env SPREADSHEET_ID or preset)
  --sheet <name>             Sheet name (default: env SHEET_NAME or シート1)
  --from-row <n>             Start row number (default: 2)
  --to-row <n>               End row number (default: last row)
  --help, -h                 Show this help

Required env:
  NEXT_PUBLIC_SUPABASE_URL
  SUPABASE_SERVICE_ROLE_KEY
  GOOGLE_SERVICE_ACCOUNT_EMAIL
  GOOGLE_PRIVATE_KEY
`);
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
    scope: "https://www.googleapis.com/auth/spreadsheets.readonly",
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

async function fetchSheetValues(spreadsheetId, sheetName) {
  const token = await getGoogleAccessToken();
  const range = encodeURIComponent(`${sheetName}!A1:${LAST_COLUMN}`);
  const url = `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values/${range}`;
  const res = await fetch(url, {
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!res.ok) {
    throw new Error(`Google Sheets read failed: ${res.status} ${await res.text()}`);
  }
  const data = await res.json();
  return data.values || [];
}

function emptyPayload() {
  const crowdMatrix = {};
  CROWD_KEYS.forEach((key) => {
    crowdMatrix[key] = "unknown";
  });
  const images = {};
  IMAGE_KEYS.forEach((key) => {
    images[key] = null;
  });
  return {
    name: "",
    facilityType: "cafe",
    area: "",
    prefecture: "東京都",
    postalCode: "",
    addressLine1: "",
    addressLine2: "",
    addressLine3: "",
    access: "",
    nearestStation: "",
    phone: "",
    status: "open",
    timeLimit: "",
    hoursWeekdayFrom: "",
    hoursWeekdayTo: "",
    hoursWeekendFrom: "",
    hoursWeekendTo: "",
    hoursNote: "",
    regularHolidays: [],
    seats: "",
    wifi: true,
    outlet: "all",
    lighting: "normal",
    meetingRoom: false,
    allowsShortLeave: false,
    hasPrivateBooths: false,
    parking: false,
    smoking: "no_smoking",
    coffeePrice: 0,
    bringOwnFood: "not_allowed",
    alcohol: "unavailable",
    mainMenu: "",
    services: [],
    paymentMethods: [],
    customerTypes: [],
    recommendedWorkStyles: [],
    crowdMatrix,
    ambienceCasual: 3,
    ambienceModern: 3,
    ambassadorComment: "",
    website: "",
    instagramUrl: "",
    tiktokUrl: "",
    smokingNote: "",
    equipmentNote: "",
    latitude: null,
    longitude: null,
    images,
  };
}

function toObject(headers, row) {
  const result = {};
  headers.forEach((h, i) => {
    result[h] = (row[i] ?? "").toString().trim();
  });
  return result;
}

function asNumber(value, fallback = 0) {
  const n = Number(String(value).replace(/[^\d.-]/g, ""));
  return Number.isFinite(n) ? n : fallback;
}

function asScore1to5(value, fallback = 3) {
  const raw = String(value ?? "").trim();
  if (!raw) return fallback;
  const n = Number(raw.replace(/[^\d.-]/g, ""));
  if (!Number.isFinite(n)) return fallback;
  const rounded = Math.round(n);
  return Math.min(5, Math.max(1, rounded));
}

function normalizeTime(value) {
  if (!value) return "";
  const v = String(value)
    .replace(/[０-９]/g, (s) => String.fromCharCode(s.charCodeAt(0) - 0xfee0))
    .replace(/：/g, ":")
    .trim();
  const m = v.match(/^(\d{1,2}):(\d{1,2})$/);
  if (!m) return "";
  const h = Number(m[1]);
  const mm = Number(m[2]);
  if (!Number.isInteger(h) || !Number.isInteger(mm) || h < 0 || h > 23 || mm < 0 || mm > 59) {
    return "";
  }
  return `${String(h).padStart(2, "0")}:${String(mm).padStart(2, "0")}`;
}

function extractTimes(text) {
  if (!text) return [];
  const normalized = String(text)
    .replace(/[０-９]/g, (s) => String.fromCharCode(s.charCodeAt(0) - 0xfee0))
    .replace(/：/g, ":");
  const matches = normalized.match(/\b\d{1,2}:\d{2}\b/g) || [];
  const result = [];
  matches.forEach((m) => {
    const t = normalizeTime(m);
    if (t) result.push(t);
  });
  return result;
}

function inferRangesFromNote(note) {
  const times = extractTimes(note);
  if (times.length >= 4) {
    return {
      weekdayFrom: times[0],
      weekdayTo: times[1],
      weekendFrom: times[2],
      weekendTo: times[3],
    };
  }
  if (times.length >= 2) {
    return {
      weekdayFrom: times[0],
      weekdayTo: times[1],
      weekendFrom: times[0],
      weekendTo: times[1],
    };
  }
  return null;
}

function asNullableNumber(value) {
  if (!value) return null;
  const n = Number(value);
  return Number.isFinite(n) ? n : null;
}

function splitList(value) {
  if (!value) return [];
  return value
    .split(/[、,，/\n]/)
    .map((v) => v.trim())
    .filter(Boolean);
}

function parseStrictList(value, allowedValues) {
  const values = splitList(value);
  const invalid = values.filter((v) => !allowedValues.has(v));
  return { values: values.filter((v) => allowedValues.has(v)), invalid };
}

function asBool(value, defaultValue = false) {
  if (!value) return defaultValue;
  const v = value.toLowerCase();
  if (["あり", "有", "yes", "true", "1", "可能"].some((k) => v.includes(k))) return true;
  if (["なし", "無", "no", "false", "0", "不可"].some((k) => v.includes(k))) return false;
  return defaultValue;
}

function mapFacilityType(value) {
  if (!value) return "cafe";
  if (value.includes("ハイブリッド") || value.includes("カフェ＋コワーキング")) return "hybrid";
  if (value.includes("コワーキング")) return "coworking";
  if (value.includes("その他")) return "other";
  return "cafe";
}

function mapStatus(value) {
  if (!value) return "open";
  if (/closed|閉店|休業/i.test(value)) return "closed";
  if (/recent|新規|開店/i.test(value)) return "recently_opened";
  return "open";
}

function mapOutlet(value) {
  const v = value || "";
  if (/全席あり|all/i.test(v)) return "all";
  if (/8割|most/i.test(v)) return "most";
  if (/5割|半分|half/i.test(v)) return "half";
  if (/3割|一部|some/i.test(v)) return "some";
  if (/なし|none/i.test(v)) return "none";
  return "all";
}

function mapLighting(value) {
  if (!value) return "normal";
  if (/暗|dark/i.test(value)) return "dark";
  if (/明|bright/i.test(value)) return "bright";
  return "normal";
}

function mapSmoking(value) {
  if (!value) return "no_smoking";
  if (/分煙|separate/i.test(value)) return "separated";
  if (/喫煙可|allowed/i.test(value)) return "allowed";
  if (/電子|e-cig/i.test(value)) return "e_cigarette";
  return "no_smoking";
}

function mapBringOwnFood(value) {
  if (!value) return "not_allowed";
  if (/可|allowed/i.test(value)) return "allowed";
  if (/ドリンク|飲み物/.test(value)) return "drinks_only";
  return "not_allowed";
}

function mapAlcohol(value) {
  if (!value) return "unavailable";
  if (/夜|night/i.test(value)) return "night_only";
  if (/あり|available/i.test(value)) return "available";
  return "unavailable";
}

function timeToMinutes(value) {
  const t = normalizeTime(value);
  if (!t) return null;
  const [h, m] = t.split(":").map(Number);
  return h * 60 + m;
}

function isOpenAt(slotStartMinutes, from, to) {
  const fromMin = timeToMinutes(from);
  const toMin = timeToMinutes(to);
  if (fromMin == null || toMin == null) return true;

  if (fromMin < toMin) {
    return slotStartMinutes >= fromMin && slotStartMinutes < toMin;
  }

  if (fromMin > toMin) {
    return slotStartMinutes >= fromMin || slotStartMinutes < toMin;
  }

  return true;
}

function fillCrowdByHours(crowdMatrix, keyPrefix, from, to) {
  CROWD_KEYS.filter((k) => k.startsWith(keyPrefix)).forEach((key) => {
    const slotStart = CROWD_SLOT_START_MINUTES[key];
    crowdMatrix[key] = isOpenAt(slotStart, from, to) ? "normal" : "closed";
  });
}

function createImage(path, caption) {
  if (!path) return null;
  return {
    id: randomUUID(),
    storagePath: path,
    caption: caption || "",
  };
}

function rowToPayload(row) {
  const p = emptyPayload();
  const enumErrors = [];
  p.name = row["店舗名"] || "";
  p.facilityType = mapFacilityType(row["施設タイプ"]);
  p.area = row["エリア"] || "";
  p.prefecture = row["都道府県"] || "";
  p.postalCode = row["郵便番号"] || "";
  p.addressLine1 = row["住所1"] || "";
  p.addressLine2 = row["住所2"] || "";
  p.addressLine3 = row["住所3"] || "";
  p.access = row["アクセス"] || "";
  p.nearestStation = row["最寄駅"] || "";
  p.phone = row["電話番号"] || "";
  p.status = mapStatus(row["営業ステータス"]);
  p.timeLimit = row["利用時間制限"] || "";
  p.hoursWeekdayFrom = normalizeTime(row["平日営業時間_開始"]) || "";
  p.hoursWeekdayTo = normalizeTime(row["平日営業時間_終了"]) || "";
  p.hoursWeekendFrom = normalizeTime(row["土日営業時間_開始"]) || "";
  p.hoursWeekendTo = normalizeTime(row["土日営業時間_終了"]) || "";
  p.hoursNote = row["営業時間補足"] || "";
  if (!p.hoursWeekdayFrom || !p.hoursWeekdayTo || !p.hoursWeekendFrom || !p.hoursWeekendTo) {
    const inferred = inferRangesFromNote(p.hoursNote);
    if (inferred) {
      p.hoursWeekdayFrom = p.hoursWeekdayFrom || inferred.weekdayFrom;
      p.hoursWeekdayTo = p.hoursWeekdayTo || inferred.weekdayTo;
      p.hoursWeekendFrom = p.hoursWeekendFrom || inferred.weekendFrom;
      p.hoursWeekendTo = p.hoursWeekendTo || inferred.weekendTo;
    }
  }
  const regularHolidays = parseStrictList(
    row["定休日"],
    ALLOWED_REGULAR_HOLIDAY_VALUES,
  );
  p.regularHolidays = regularHolidays.values;
  if (regularHolidays.invalid.length > 0) {
    enumErrors.push(
      `定休日: ${regularHolidays.invalid.join(", ")} (allowed: ${Array.from(
        ALLOWED_REGULAR_HOLIDAY_VALUES,
      ).join(", ")})`,
    );
  }
  p.seats = row["席数"] ? asNumber(row["席数"], 0) : "";
  p.wifi = asBool(row["Wi-Fi"], true);
  p.outlet = mapOutlet(row["電源席"]);
  p.lighting = mapLighting(row["照明"]);
  p.meetingRoom = asBool(row["会議室"], false);
  p.allowsShortLeave = asBool(row["離席許可"], false);
  p.hasPrivateBooths = asBool(row["個室ブース"], false);
  p.parking = asBool(row["駐車場"], false);
  p.smoking = mapSmoking(row["喫煙"]);
  p.coffeePrice = asNumber(row["コーヒー価格"], 0);
  p.bringOwnFood = mapBringOwnFood(row["飲食物持ち込み"]);
  p.alcohol = mapAlcohol(row["アルコール提供"]);
  p.mainMenu = row["メインメニュー"] || "";
  const services = parseStrictList(row["サービス"], ALLOWED_SERVICE_VALUES);
  p.services = services.values;
  if (services.invalid.length > 0) {
    enumErrors.push(
      `サービス: ${services.invalid.join(", ")} (allowed: ${Array.from(
        ALLOWED_SERVICE_VALUES,
      ).join(", ")})`,
    );
  }
  p.paymentMethods = splitList(row["支払い方法"]);
  p.customerTypes = splitList(row["客層"]);
  const recommendedWorkStyles = parseStrictList(
    row["おすすめ作業スタイル"],
    ALLOWED_RECOMMENDED_WORK_VALUES,
  );
  p.recommendedWorkStyles = recommendedWorkStyles.values;
  if (recommendedWorkStyles.invalid.length > 0) {
    enumErrors.push(
      `おすすめ作業スタイル: ${recommendedWorkStyles.invalid.join(
        ", ",
      )} (allowed: ${Array.from(ALLOWED_RECOMMENDED_WORK_VALUES).join(", ")})`,
    );
  }

  fillCrowdByHours(p.crowdMatrix, "weekday", p.hoursWeekdayFrom, p.hoursWeekdayTo);
  fillCrowdByHours(p.crowdMatrix, "weekend", p.hoursWeekendFrom, p.hoursWeekendTo);

  p.ambienceCasual = asScore1to5(row["雰囲気_カジュアル"], 3);
  p.ambienceModern = asScore1to5(row["雰囲気_モダン"], 3);
  p.ambassadorComment = row["アンバサダーコメント"] || "";
  p.website = row["公式サイト"] || "";
  p.instagramUrl = row["Instagram URL"] || "";
  p.tiktokUrl = row["TikTok URL"] || "";
  p.smokingNote = row["喫煙補足"] || "";
  p.equipmentNote = row["設備補足"] || "";
  p.latitude = asNullableNumber(row["緯度"]);
  p.longitude = asNullableNumber(row["経度"]);

  IMAGE_KEYS.forEach((key) => {
    const [pathHeader, captionHeader] = IMAGE_HEADER_MAP[key];
    p.images[key] = createImage(row[pathHeader], row[captionHeader]);
  });

  return { payload: p, enumErrors };
}

function validatePayload(payload) {
  const missing = REQUIRED_FIELDS.filter((field) => {
    const value = payload[field];
    return !value || (typeof value === "string" && value.trim() === "");
  });
  return missing;
}

function normalizeCafeName(value) {
  return String(value || "")
    .trim()
    .replace(/\s+/g, " ")
    .toLowerCase();
}

function chunkArray(items, size) {
  const chunks = [];
  for (let i = 0; i < items.length; i += size) {
    chunks.push(items.slice(i, i + size));
  }
  return chunks;
}

function buildCafeTableInsert(payload) {
  const seats = typeof payload.seats === "number" ? payload.seats : Number(payload.seats) || null;
  const address = [payload.prefecture, payload.addressLine1, payload.addressLine2, payload.addressLine3]
    .filter(Boolean)
    .join("");
  return {
    name: payload.name,
    facility_type: payload.facilityType,
    area: payload.area,
    prefecture: payload.prefecture,
    postal_code: payload.postalCode,
    address_line1: payload.addressLine1,
    address_line2: payload.addressLine2 || null,
    address_line3: payload.addressLine3 || null,
    address,
    access: payload.access || null,
    nearest_station: payload.nearestStation || null,
    phone: payload.phone || null,
    status: payload.status,
    time_limit: payload.timeLimit || null,
    hours_weekday_from: payload.hoursWeekdayFrom || null,
    hours_weekday_to: payload.hoursWeekdayTo || null,
    hours_weekend_from: payload.hoursWeekendFrom || null,
    hours_weekend_to: payload.hoursWeekendTo || null,
    hours_note: payload.hoursNote || null,
    regular_holidays: payload.regularHolidays,
    seats,
    wifi: payload.wifi,
    outlet: payload.outlet,
    lighting: payload.lighting,
    meeting_room: payload.meetingRoom,
    allow_short_leave: payload.allowsShortLeave,
    private_booths: payload.hasPrivateBooths,
    parking: payload.parking,
    smoking: payload.smoking,
    coffee_price: payload.coffeePrice || null,
    bring_own_food: payload.bringOwnFood,
    alcohol: payload.alcohol,
    main_menu: payload.mainMenu || null,
    services: payload.services,
    payment_methods: payload.paymentMethods,
    customer_types: payload.customerTypes,
    recommended_work: payload.recommendedWorkStyles,
    crowd_levels: payload.crowdMatrix,
    ambience_casual: payload.ambienceCasual,
    ambience_modern: payload.ambienceModern,
    ambassador_comment: payload.ambassadorComment || null,
    website: payload.website || null,
    instagram_url: payload.instagramUrl || null,
    tiktok_url: payload.tiktokUrl || null,
    smoking_note: payload.smokingNote || null,
    equipment_note: payload.equipmentNote || null,
    latitude: payload.latitude ?? null,
    longitude: payload.longitude ?? null,
    deleted_at: null,
  };
}

async function geocodeFromPayload(payload) {
  const queryParts = [payload.prefecture, payload.addressLine1, payload.addressLine2, payload.addressLine3]
    .filter((part) => part && String(part).trim().length > 0)
    .map((part) => String(part).trim());
  const query = queryParts.join(" ") || payload.postalCode;
  if (!query) return null;

  try {
    const result = await normalize(query);
    const lat = result?.point?.lat;
    const lng = result?.point?.lng;
    if (typeof lat === "number" && typeof lng === "number") {
      return { latitude: lat, longitude: lng };
    }
  } catch (error) {
    return null;
  }
  return null;
}

async function main() {
  loadLocalEnv();
  const args = parseArgs(process.argv.slice(2));
  if (args.help) {
    printHelp();
    return;
  }
  const supabaseUrl = assertEnv("NEXT_PUBLIC_SUPABASE_URL");
  const serviceRoleKey = assertEnv("SUPABASE_SERVICE_ROLE_KEY");
  const supabase = createClient(supabaseUrl, serviceRoleKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });

  const values = await fetchSheetValues(args.spreadsheetId, args.sheetName);
  if (values.length < 2) {
    console.log("No rows found.");
    return;
  }

  const headers = values[0];
  const startIndex = Math.max(1, args.fromRow - 1);
  const endIndex = args.toRow ? Math.min(values.length - 1, args.toRow - 1) : values.length - 1;

  const candidateNames = [];
  const seenCandidateNames = new Set();
  for (let i = startIndex; i <= endIndex; i += 1) {
    const row = toObject(headers, values[i] || []);
    const normalized = normalizeCafeName(row["店舗名"]);
    if (!normalized || seenCandidateNames.has(normalized)) continue;
    seenCandidateNames.add(normalized);
    candidateNames.push(row["店舗名"].trim());
  }

  const existingCafeNameSet = new Set();
  const existingCafeByName = new Map();
  if (candidateNames.length > 0) {
    const chunks = chunkArray(candidateNames, 100);
    for (const chunk of chunks) {
      const { data: cafeRows, error: cafeSelectError } = await supabase
        .from("cafes")
        .select("id, name, latitude, longitude")
        .in("name", chunk);
      if (cafeSelectError) {
        throw new Error(`Failed to load existing cafes: ${cafeSelectError.message}`);
      }
      (cafeRows || []).forEach((cafe) => {
        const normalizedName = normalizeCafeName(cafe.name);
        existingCafeNameSet.add(normalizedName);
        if (!existingCafeByName.has(normalizedName)) {
          existingCafeByName.set(normalizedName, cafe);
        }
      });
    }
  }

  const failures = [];
  let success = 0;
  let dryRunCount = 0;
  let inserted = 0;
  let updatedCoords = 0;
  let skippedExistingCafe = 0;
  let enumValidationErrorCount = 0;

  for (let i = startIndex; i <= endIndex; i += 1) {
    const row = toObject(headers, values[i] || []);
    if (!row["店舗名"]) continue;
    const normalizedName = normalizeCafeName(row["店舗名"]);
    if (existingCafeNameSet.has(normalizedName)) {
      if (args.apply) {
        const existingCafe = existingCafeByName.get(normalizedName);
        if (existingCafe && (existingCafe.latitude == null || existingCafe.longitude == null)) {
          const { payload: payloadForGeocode, enumErrors } = rowToPayload(row);
          if (enumErrors.length > 0) {
            enumValidationErrorCount += 1;
            failures.push({
              row: i + 1,
              cafe: row["店舗名"],
              reason: enumErrors.join(" | "),
            });
            continue;
          }
          const geocoded = await geocodeFromPayload(payloadForGeocode);
          if (geocoded) {
            const { error: updateError } = await supabase
              .from("cafes")
              .update({
                latitude: geocoded.latitude,
                longitude: geocoded.longitude,
              })
              .eq("id", existingCafe.id);
            if (updateError) {
              failures.push({
                row: i + 1,
                cafe: row["店舗名"],
                reason: `update coords failed: ${updateError.message}`,
              });
            } else {
              updatedCoords += 1;
            }
          }
        }
      }
      skippedExistingCafe += 1;
      continue;
    }
    const { payload, enumErrors } = rowToPayload(row);
    if (enumErrors.length > 0) {
      enumValidationErrorCount += 1;
      failures.push({
        row: i + 1,
        cafe: row["店舗名"],
        reason: enumErrors.join(" | "),
      });
      continue;
    }
    const missing = validatePayload(payload);
    if (missing.length > 0) {
      failures.push({ row: i + 1, cafe: row["店舗名"], reason: `missing required: ${missing.join(", ")}` });
      continue;
    }

    if (!args.apply) {
      dryRunCount += 1;
      continue;
    }

    if (payload.latitude == null || payload.longitude == null) {
      const geocoded = await geocodeFromPayload(payload);
      if (geocoded) {
        payload.latitude = geocoded.latitude;
        payload.longitude = geocoded.longitude;
      }
    }

    const cafeInsertPayload = buildCafeTableInsert(payload);
    const { error } = await supabase.from("cafes").insert(cafeInsertPayload);

    if (error) {
      failures.push({ row: i + 1, cafe: row["店舗名"], reason: error.message });
      continue;
    }
    inserted += 1;
    success += 1;
  }

  console.log(`mode: ${args.apply ? "apply" : "dry-run"}`);
  console.log(`rows: ${args.fromRow}..${args.toRow ?? "end"}`);
  console.log(`processed: ${Math.max(0, endIndex - startIndex + 1)}`);
  console.log(`success: ${success}`);
  console.log(`inserted: ${inserted}`);
  console.log(`updatedCoords: ${updatedCoords}`);
  console.log(`skippedExistingCafe: ${skippedExistingCafe}`);
  console.log(`dryRunCandidates: ${dryRunCount}`);
  console.log(`failed: ${failures.length}`);
  if (failures.length > 0) {
    console.log("--- failures ---");
    failures.forEach((f) => {
      console.log(`row ${f.row} (${f.cafe}): ${f.reason}`);
    });
  }

  if (enumValidationErrorCount > 0) {
    throw new Error(
      `Unsupported enum values found in ${enumValidationErrorCount} row(s). Update sheet values to allowed English keys.`,
    );
  }
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
