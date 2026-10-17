import "server-only";

import { getSheetTable } from "./sheets";

const DETAIL_RANGE = "Detail!A:Z";

const NAME_COLUMN = 2;
const PHONE_COLUMN = 6;
const ADDRESS_COLUMN = 7;
const BAG_COUNT_COLUMN = 15;

export type DetailField = {
  label: string;
  value: string;
  href?: string;
};

export type DetailRecipient = {
  name: string;
  phone: string;
  address: string;
  bagCount: string;
  fields: DetailField[];
};

const FALLBACK_LABELS = [
  "A",
  "A (column B)",
  "Name",
  "Text vs call",
  "Primary language",
  "Call vs text; primary language",
  "Phone",
  "Address",
  "Contacted",
  "Saturday delivery",
  "Eligible for extra items",
  "Extra items",
  "Notes for this week",
  "Contactless delivery instructions",
  "Ongoing notes",
  "Saturday bag count",
  "Spanish delivery call preference",
];

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

function cleanHeader(header: string): string {
  return header.replace(/\s+/g, " ").trim();
}

function labelsFor(headers: string[]): string[] {
  const cleaned = headers.map(cleanHeader);
  const counts = new Map<string, number>();
  for (const header of cleaned) {
    if (!header) continue;
    counts.set(header, (counts.get(header) ?? 0) + 1);
  }

  return cleaned.map((header, index) => {
    if (!header) return FALLBACK_LABELS[index] ?? `Column ${columnLetter(index)}`;
    if ((counts.get(header) ?? 0) > 1) {
      return `${header} (column ${columnLetter(index)})`;
    }
    return header;
  });
}

export async function getDetailRecipients(): Promise<DetailRecipient[]> {
  const { headers, rows } = await getSheetTable(DETAIL_RANGE);
  const labels = labelsFor(headers);

  return rows
    .filter((row) => row.some((cell) => cell !== ""))
    .map((row) => {
      const fields: DetailField[] = [];
      labels.forEach((label, index) => {
        if (index === NAME_COLUMN) return;
        const value = row[index] ?? "";
        if (!value) return;
        fields.push({
          label,
          value,
          href: index === PHONE_COLUMN ? `tel:${value}` : undefined,
        });
      });

      return {
        name: row[NAME_COLUMN] ?? "",
        phone: row[PHONE_COLUMN] ?? "",
        address: row[ADDRESS_COLUMN] ?? "",
        bagCount: row[BAG_COUNT_COLUMN] ?? "",
        fields,
      };
    });
}
