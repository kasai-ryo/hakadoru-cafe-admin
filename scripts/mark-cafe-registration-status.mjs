#!/usr/bin/env node

import { createSign } from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import { createClient } from "@supabase/supabase-js";

const DEFAULT_SPREADSHEET_ID = "1CYjd4uOKQuMjeO1vCt9X7vrpArU09MaXjNSxnFb4wNM";
const DEFAULT_SHEET_NAME = "シート1";
const STATUS_HEADER = "登録状況";
const STATUS_DONE = "DB登録済み";
const STATUS_RULE_FORMULA = '=$B2="DB登録済み"';

function parseArgs(argv) {
  const args = {
    spreadsheetId: process.env.SPREADSHEET_ID || DEFAULT_SPREADSHEET_ID,
    sheetName: process.env.SHEET_NAME || DEFAULT_SHEET_NAME,
    fromRow: Number(process.env.FROM_ROW || 2),
    toRow: process.env.TO_ROW ? Number(process.env.TO_ROW) : null,
    apply: false,
  };
  for (let i = 0; i < argv.length; i += 1) {
    const a = argv[i];
    if (a === "--apply") args.apply = true;
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

function assertEnv(name) {
  const value = process.env[name];
  if (!value) throw new Error(`Missing env: ${name}`);
  return value;
}

function base64url(input) {
  return Buffer.from(input).toString("base64url");
}

function normalizeCafeName(value) {
  return String(value || "")
    .trim()
    .replace(/\s+/g, " ")
    .toLowerCase();
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

async function googleGetSheetMetadata(spreadsheetId, token) {
  const url = `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}?fields=sheets(properties(sheetId,title,gridProperties),conditionalFormats)`;
  const res = await fetch(url, { headers: { Authorization: `Bearer ${token}` } });
  if (!res.ok) {
    throw new Error(`Google Sheets metadata failed: ${res.status} ${await res.text()}`);
  }
  return res.json();
}

async function googleGetValues(spreadsheetId, range, token) {
  const url = `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values/${encodeURIComponent(range)}`;
  const res = await fetch(url, { headers: { Authorization: `Bearer ${token}` } });
  if (!res.ok) {
    throw new Error(`Google Sheets values.get failed: ${res.status} ${await res.text()}`);
  }
  const json = await res.json();
  return json.values || [];
}

async function googleBatchUpdate(spreadsheetId, requests, token) {
  const url = `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}:batchUpdate`;
  const res = await fetch(url, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ requests }),
  });
  if (!res.ok) {
    throw new Error(`Google Sheets batchUpdate failed: ${res.status} ${await res.text()}`);
  }
  return res.json();
}

async function googleBatchUpdateValues(spreadsheetId, data, token) {
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
  if (!res.ok) {
    throw new Error(`Google Sheets values.batchUpdate failed: ${res.status} ${await res.text()}`);
  }
  return res.json();
}

function chunkArray(items, size) {
  const chunks = [];
  for (let i = 0; i < items.length; i += size) {
    chunks.push(items.slice(i, i + size));
  }
  return chunks;
}

async function fetchExistingCafeNameSet(supabase, names) {
  const normalizedSet = new Set();
  const uniqueNames = Array.from(
    new Set(
      names
        .map((v) => String(v || "").trim())
        .filter(Boolean),
    ),
  );
  const chunks = chunkArray(uniqueNames, 100);
  for (const chunk of chunks) {
    const { data, error } = await supabase.from("cafes").select("name").in("name", chunk);
    if (error) throw new Error(`Failed to fetch existing cafes: ${error.message}`);
    (data || []).forEach((row) => normalizedSet.add(normalizeCafeName(row.name)));
  }
  return normalizedSet;
}

async function main() {
  loadLocalEnv();
  const args = parseArgs(process.argv.slice(2));

  const supabaseUrl = assertEnv("NEXT_PUBLIC_SUPABASE_URL");
  const serviceRoleKey = assertEnv("SUPABASE_SERVICE_ROLE_KEY");
  const supabase = createClient(supabaseUrl, serviceRoleKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });

  const token = await getGoogleAccessToken();
  const metadata = await googleGetSheetMetadata(args.spreadsheetId, token);
  const sheet = (metadata.sheets || []).find((s) => s.properties?.title === args.sheetName);
  if (!sheet) throw new Error(`Sheet not found: ${args.sheetName}`);

  const sheetId = sheet.properties.sheetId;
  const columnCount = sheet.properties.gridProperties?.columnCount || 120;

  const headerRow = await googleGetValues(args.spreadsheetId, `${args.sheetName}!A1:Z1`, token);
  const headerValues = headerRow[0] || [];
  const hasStatusColumn = headerValues[1] === STATUS_HEADER;

  if (!hasStatusColumn && args.apply) {
    await googleBatchUpdate(
      args.spreadsheetId,
      [
        {
          insertDimension: {
            range: {
              sheetId,
              dimension: "COLUMNS",
              startIndex: 1,
              endIndex: 2,
            },
            inheritFromBefore: false,
          },
        },
      ],
      token,
    );
    await googleBatchUpdateValues(
      args.spreadsheetId,
      [{ range: `${args.sheetName}!B1`, values: [[STATUS_HEADER]] }],
      token,
    );
  }

  const nameColumn = await googleGetValues(args.spreadsheetId, `${args.sheetName}!A1:A`, token);
  const rows = nameColumn.map((r) => (r[0] ? String(r[0]) : ""));
  const lastRow = rows.length;
  const startRow = Math.max(2, args.fromRow);
  const endRow = args.toRow ? Math.min(args.toRow, lastRow) : lastRow;

  const targetNames = [];
  for (let rowNumber = startRow; rowNumber <= endRow; rowNumber += 1) {
    targetNames.push(rows[rowNumber - 1] || "");
  }

  const existingCafeNameSet = await fetchExistingCafeNameSet(supabase, targetNames);
  const statusValues = [];
  let matched = 0;
  for (let rowNumber = startRow; rowNumber <= endRow; rowNumber += 1) {
    const normalized = normalizeCafeName(rows[rowNumber - 1] || "");
    const isRegistered = normalized && existingCafeNameSet.has(normalized);
    statusValues.push([isRegistered ? STATUS_DONE : ""]);
    if (isRegistered) matched += 1;
  }

  const conditionalFormats = sheet.conditionalFormats || [];
  const hasStatusRule = conditionalFormats.some((rule) => {
    const formula =
      rule?.booleanRule?.condition?.values?.[0]?.userEnteredValue ||
      rule?.booleanRule?.condition?.values?.[0]?.relativeDate;
    return formula === STATUS_RULE_FORMULA;
  });

  if (args.apply) {
    await googleBatchUpdateValues(
      args.spreadsheetId,
      [
        {
          range: `${args.sheetName}!B${startRow}:B${endRow}`,
          values: statusValues,
        },
      ],
      token,
    );

    if (!hasStatusRule) {
      await googleBatchUpdate(
        args.spreadsheetId,
        [
          {
            addConditionalFormatRule: {
              rule: {
                ranges: [
                  {
                    sheetId,
                    startRowIndex: 1,
                    endRowIndex: endRow,
                    startColumnIndex: 0,
                    endColumnIndex: columnCount + 1,
                  },
                ],
                booleanRule: {
                  condition: {
                    type: "CUSTOM_FORMULA",
                    values: [{ userEnteredValue: STATUS_RULE_FORMULA }],
                  },
                  format: {
                    backgroundColor: {
                      red: 0.92,
                      green: 0.92,
                      blue: 0.92,
                    },
                    textFormat: {
                      foregroundColor: {
                        red: 0.4,
                        green: 0.4,
                        blue: 0.4,
                      },
                    },
                  },
                },
              },
              index: 0,
            },
          },
        ],
        token,
      );
    }
  }

  console.log(`mode: ${args.apply ? "apply" : "dry-run"}`);
  console.log(`sheet: ${args.sheetName}`);
  console.log(`rows: ${startRow}..${endRow}`);
  console.log(`processed: ${Math.max(0, endRow - startRow + 1)}`);
  console.log(`dbRegistered: ${matched}`);
  console.log(`statusColumnInserted: ${hasStatusColumn ? "no" : args.apply ? "yes" : "pending"}`);
  console.log(`conditionalRuleAdded: ${hasStatusRule ? "no" : args.apply ? "yes" : "pending"}`);
}

main().catch((err) => {
  console.error(err.stack || String(err));
  process.exitCode = 1;
});
