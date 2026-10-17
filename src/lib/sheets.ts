import "server-only";

import { readFileSync } from "node:fs";
import path from "node:path";
import { JWT } from "google-auth-library";
import { google } from "googleapis";

const SHEETS_SCOPE = "https://www.googleapis.com/auth/spreadsheets.readonly";

type ServiceAccountKey = {
  type: "service_account";
  client_email: string;
  private_key: string;
};

export type SheetRow = Record<string, string>;

export type SheetTable = {
  headers: string[];
  rows: string[][];
};

function loadServiceAccount(): ServiceAccountKey {
  const fromEnv = process.env.GOOGLE_SERVICE_ACCOUNT_JSON;
  const raw = fromEnv
    ? fromEnv
    : readFileSync(
        path.join(process.cwd(), "google-service-account.json"),
        "utf8",
      );

  const parsed: unknown = JSON.parse(raw);
  if (!isServiceAccountKey(parsed)) {
    throw new Error(
      "Google credential must be a service account key with client_email and private_key.",
    );
  }
  return parsed;
}

function isServiceAccountKey(value: unknown): value is ServiceAccountKey {
  if (typeof value !== "object" || value === null) return false;
  const key = value as Record<string, unknown>;
  return (
    key.type === "service_account" &&
    typeof key.client_email === "string" &&
    typeof key.private_key === "string"
  );
}

function columnLetter(index: number): string {
  let n = index + 1;
  let letters = "";
  while (n > 0) {
    const rem = (n - 1) % 26;
    letters = String.fromCharCode(65 + rem) + letters;
    n = Math.floor((n - 1) / 26);
  }
  return letters;
}

function spreadsheetIdFromEnv(): string {
  const spreadsheetId = process.env.GOOGLE_SHEET_ID?.trim();
  if (!spreadsheetId) {
    throw new Error("Missing GOOGLE_SHEET_ID.");
  }
  // A gid like 1304562233 is the tab id in the URL, not the spreadsheet id.
  if (/^\d+$/.test(spreadsheetId)) {
    throw new Error(
      "GOOGLE_SHEET_ID is the tab id (gid) from the URL. Use the long id between /spreadsheets/d/ and /edit.",
    );
  }
  return spreadsheetId;
}

/**
 * Read a range. The first row is the header row.
 * Cells keep their column index, so duplicate headers stay distinct.
 */
export async function getSheetTable(range: string): Promise<SheetTable> {
  const spreadsheetId = spreadsheetIdFromEnv();

  let credentials: ServiceAccountKey;
  try {
    credentials = loadServiceAccount();
  } catch (error) {
    if (
      error instanceof Error &&
      "code" in error &&
      (error as NodeJS.ErrnoException).code === "ENOENT" &&
      !process.env.GOOGLE_SERVICE_ACCOUNT_JSON
    ) {
      throw new Error(
        "Missing Google credentials. Add google-service-account.json or set GOOGLE_SERVICE_ACCOUNT_JSON.",
      );
    }
    throw error;
  }

  const auth = new JWT({
    email: credentials.client_email,
    key: credentials.private_key,
    scopes: [SHEETS_SCOPE],
  });

  const sheets = google.sheets({ version: "v4", auth });
  const response = await sheets.spreadsheets.values.get({
    spreadsheetId,
    range,
  });

  const values = response.data.values ?? [];
  if (values.length === 0) return { headers: [], rows: [] };

  const width = Math.max(...values.map((row) => row.length));
  const headers = Array.from({ length: width }, (_, index) =>
    (values[0][index] ?? "").trim(),
  );
  const rows = values.slice(1).map((row) =>
    Array.from({ length: width }, (_, index) => (row[index] ?? "").trim()),
  );

  return { headers, rows };
}

/**
 * Read a sheet tab as objects keyed by header.
 * Duplicate headers are disambiguated with the column letter, so two
 * columns named "A" become "A" and "A (column B)".
 */
export async function getSheetRows(range = "Sheet1"): Promise<SheetRow[]> {
  const { headers, rows } = await getSheetTable(range);
  const counts = new Map<string, number>();
  for (const header of headers) {
    if (!header) continue;
    counts.set(header, (counts.get(header) ?? 0) + 1);
  }

  return rows.map((row) => {
    const record: SheetRow = {};
    headers.forEach((header, index) => {
      const label = header || `Column ${columnLetter(index)}`;
      const key =
        (counts.get(header) ?? 0) > 1
          ? `${label} (column ${columnLetter(index)})`
          : label;
      record[key] = row[index] ?? "";
    });
    return record;
  });
}
