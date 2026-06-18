// src/lib/csv.ts — parse a local CSV file into a Dataset (standalone mode).
//
// The first column is treated as a timestamp/index when it is numeric and
// monotonic-ish; otherwise all numeric columns become channels on a 0..n-1
// index. This mirrors the Edge Impulse CSV convention (first column = time).

import Papa from "papaparse";
import type { Channel, Dataset } from "@/lib/types";
import { colorForIndex } from "@/lib/ei-client";

/** Heuristic: does this header name look like a time/index column? */
function looksLikeTime(name: string): boolean {
  return /^(time|timestamp|t|ms|seconds?|sec|index|idx|sample)\b/i.test(name.trim());
}

function toNum(v: unknown): number {
  if (typeof v === "number") return Number.isFinite(v) ? v : NaN;
  if (typeof v === "string") {
    const n = Number(v.trim());
    return Number.isFinite(n) ? n : NaN;
  }
  return NaN;
}

export interface ParsedCsv {
  dataset: Dataset;
  /** Non-fatal warnings (e.g. dropped non-numeric columns). */
  warnings: string[];
}

/** Parse CSV text into a Dataset. Throws on an empty / header-only file. */
export function parseCsv(text: string, name = "import.csv"): ParsedCsv {
  const res = Papa.parse<Record<string, string>>(text, {
    header: true,
    skipEmptyLines: true,
    dynamicTyping: false,
  });

  const rows = res.data.filter((r) => r && typeof r === "object");
  const fields = res.meta.fields ?? [];
  if (fields.length === 0 || rows.length === 0) {
    throw new Error("CSV has no data rows");
  }

  const warnings: string[] = [];

  // Decide the time column: an explicit time-looking first column that is fully
  // numeric. Otherwise fall back to a 0..n-1 index.
  let timeField: string | undefined;
  const first = fields[0];
  if (looksLikeTime(first)) {
    const allNumeric = rows.every((r) => !Number.isNaN(toNum(r[first])));
    if (allNumeric) timeField = first;
  }

  const channelFields = fields.filter((f) => f !== timeField);
  const channels: Channel[] = [];
  let colorIdx = 0;

  for (const field of channelFields) {
    let numericCount = 0;
    const values = rows.map((r) => {
      const n = toNum(r[field]);
      if (!Number.isNaN(n)) numericCount++;
      return Number.isNaN(n) ? 0 : n;
    });
    // Drop columns that are entirely non-numeric (labels, text, etc.).
    if (numericCount === 0) {
      warnings.push(`Dropped non-numeric column "${field}"`);
      continue;
    }
    channels.push({
      name: field,
      values,
      color: colorForIndex(colorIdx++),
    });
  }

  if (channels.length === 0) {
    throw new Error("CSV has no numeric data columns");
  }

  let time: number[] | undefined;
  if (timeField) {
    const raw = rows.map((r) => toNum(r[timeField]));
    // If the column is in milliseconds (large, integer-ish), convert to seconds
    // so the axis reads naturally.
    const span = raw[raw.length - 1] - raw[0];
    const looksMs = span > 1000 && raw.every((v) => Number.isInteger(v));
    time = looksMs ? raw.map((v) => v / 1000) : raw;
  }

  return {
    dataset: {
      channels,
      time,
      source: "csv",
      name,
    },
    warnings,
  };
}

/** Read a File and parse it into a Dataset. */
export async function parseCsvFile(file: File): Promise<ParsedCsv> {
  const text = await file.text();
  return parseCsv(text, file.name);
}
