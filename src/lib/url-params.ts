// src/lib/url-params.ts — parse URL params exactly once, never throwing.
//
// Invalid values are dropped, enums are case-insensitive, booleans accept
// 1/true/yes/on vs 0/false/no/off, ints are clamped. The apiKey is only
// accepted when it matches /^ei_/. When embedded, parent-iframe query params
// are merged in (getIframeQueryParams), mirroring the Edge Impulse CSV editor.

import type { AppParams, EICategory, Theme, ViewMode } from "@/lib/types";

const TRUE_TOKENS = new Set(["1", "true", "yes", "on"]);
const FALSE_TOKENS = new Set(["0", "false", "no", "off"]);

/** Coerce a string to boolean; returns undefined when unrecognized. */
export function parseBool(raw: string | null | undefined): boolean | undefined {
  if (raw == null) return undefined;
  const t = raw.trim().toLowerCase();
  if (TRUE_TOKENS.has(t)) return true;
  if (FALSE_TOKENS.has(t)) return false;
  return undefined;
}

/** Parse an integer, returning undefined for anything non-finite/non-integer. */
export function parseIntStrict(raw: string | null | undefined): number | undefined {
  if (raw == null) return undefined;
  const t = raw.trim();
  if (!/^[+-]?\d+$/.test(t)) return undefined;
  const n = Number(t);
  return Number.isFinite(n) ? n : undefined;
}

/** Clamp a number into [min, max]. */
export function clamp(n: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, n));
}

/** Parse a value against a set of allowed lowercased enum members. */
export function parseEnum<T extends string>(
  raw: string | null | undefined,
  allowed: readonly T[],
): T | undefined {
  if (raw == null) return undefined;
  const t = raw.trim().toLowerCase();
  return allowed.find((a) => a.toLowerCase() === t);
}

/** Split a comma list, trim, drop empties. Returns undefined when nothing left. */
function parseList(raw: string | null | undefined): string[] | undefined {
  if (!raw) return undefined;
  const out = raw
    .split(",")
    .map((s) => s.trim())
    .filter((s) => s.length > 0);
  return out.length > 0 ? out : undefined;
}

const CATEGORIES = ["training", "testing", "anomaly"] as const;
const THEMES = ["dark", "light"] as const;
const VIEWS = ["overlay", "stacked"] as const;

/**
 * Default per-sample payload cap (Studio `limitPayloadValues`). Samples longer
 * than this are downsampled server-side so very large samples stay fast to
 * fetch and parse. The figure decimates further for rendering, so this only
 * needs headroom over the render budget.
 */
export const DEFAULT_MAX_POINTS = 8000;
const MIN_MAX_POINTS = 500;
const MAX_MAX_POINTS = 50000;

/** Read a param trying each candidate key in order. */
function pick(params: URLSearchParams, ...keys: string[]): string | null {
  for (const k of keys) {
    const v = params.get(k);
    if (v != null) return v;
  }
  return null;
}

/**
 * Parse the supplied search params into AppParams. Never throws. Accepts a
 * URLSearchParams, a query string, or a record of strings.
 */
export function parseParams(
  input: URLSearchParams | string | Record<string, string> | undefined,
): AppParams {
  const params = toSearchParams(input);

  const out: AppParams = {
    limit: 200,
    offset: 0,
    maxPoints: DEFAULT_MAX_POINTS,
    embed: false,
    view: "stacked",
    rangeslider: true,
  };

  // apiKey — only accepted when it matches /^ei_/.
  const apiKey = pick(params, "apiKey");
  if (apiKey && /^ei_/.test(apiKey)) out.apiKey = apiKey;

  // category
  const category = parseEnum<EICategory>(pick(params, "category"), CATEGORIES);
  if (category) out.category = category;

  // labels — comma list
  const labels = parseList(pick(params, "labels"));
  if (labels) out.labels = labels;

  // sample (alias sampleId), int >= 1
  const sample = parseIntStrict(pick(params, "sample", "sampleId"));
  if (sample != null && sample >= 1) out.sample = sample;

  // channels — comma list of channel names to pre-select
  const channels = parseList(pick(params, "channels"));
  if (channels) out.channels = channels;

  // view — overlay | stacked (default stacked)
  const view = parseEnum<ViewMode>(pick(params, "view"), VIEWS);
  if (view) out.view = view;

  // rangeslider — boolean (default true)
  const rangeslider = parseBool(pick(params, "rangeslider", "slider"));
  if (rangeslider != null) out.rangeslider = rangeslider;

  // limit 1..1000 (default 200)
  const limit = parseIntStrict(pick(params, "limit"));
  if (limit != null) out.limit = clamp(limit, 1, 1000);

  // offset >= 0 (default 0)
  const offset = parseIntStrict(pick(params, "offset"));
  if (offset != null) out.offset = Math.max(0, offset);

  // maxPoints (alias points) — per-sample payload cap, clamped
  const maxPoints = parseIntStrict(pick(params, "maxPoints", "points"));
  if (maxPoints != null)
    out.maxPoints = clamp(maxPoints, MIN_MAX_POINTS, MAX_MAX_POINTS);

  // theme
  const theme = parseEnum<Theme>(pick(params, "theme"), THEMES);
  if (theme) out.theme = theme;

  // embed
  const embed = parseBool(pick(params, "embed"));
  if (embed != null) out.embed = embed;

  // host overrides
  const studioHost = pick(params, "studioHost");
  if (studioHost && studioHost.trim()) out.studioHost = studioHost.trim();
  const ingestionHost = pick(params, "ingestionHost");
  if (ingestionHost && ingestionHost.trim()) out.ingestionHost = ingestionHost.trim();

  return out;
}

function toSearchParams(
  input: URLSearchParams | string | Record<string, string> | undefined,
): URLSearchParams {
  if (input == null) return new URLSearchParams();
  if (input instanceof URLSearchParams) return input;
  if (typeof input === "string") return new URLSearchParams(input);
  return new URLSearchParams(input);
}

/**
 * Params that must NEVER be inherited from a parent frame or the referrer.
 *
 * The apiKey is a secret. If we accepted an inherited apiKey we would
 * auto-connect with a key that remains visible in a URL the embedder controls.
 * So the apiKey is accepted ONLY when supplied to the app's own URL. Embedders
 * should POST the key to /api/ei/session directly instead when they do not want
 * it in the iframe src.
 */
const NON_INHERITABLE_KEYS = new Set(["apiKey"]);

/**
 * Merge parent-iframe query params for embedded mode. When running inside an
 * iframe we try to read the parent's location.search (same-origin only); if that
 * throws (cross-origin) we fall back to parsing document.referrer's query.
 * Own-window params take precedence over inherited parent params. Secret params
 * (apiKey) are NEVER taken from the inherited set — see NON_INHERITABLE_KEYS.
 *
 * Returns a single merged URLSearchParams. Never throws.
 */
export function getIframeQueryParams(): URLSearchParams {
  const merged = new URLSearchParams();

  if (typeof window === "undefined") return merged;

  // 1. Inherited from parent frame (lowest precedence).
  try {
    if (window.parent && window.parent !== window) {
      let parentSearch = "";
      try {
        parentSearch = window.parent.location.search;
      } catch {
        if (document.referrer) {
          try {
            parentSearch = new URL(document.referrer).search;
          } catch {
            parentSearch = "";
          }
        }
      }
      if (parentSearch) {
        for (const [k, v] of new URLSearchParams(parentSearch)) {
          if (NON_INHERITABLE_KEYS.has(k)) continue;
          merged.set(k, v);
        }
      }
    }
  } catch {
    // Ignore — embedding context is best-effort.
  }

  // 2. Own window params (highest precedence).
  try {
    for (const [k, v] of new URLSearchParams(window.location.search)) {
      merged.set(k, v);
    }
  } catch {
    // Ignore.
  }

  return merged;
}

/**
 * Convenience: parse the effective params for the current window, merging any
 * inherited iframe params. Safe to call on the server (returns defaults).
 */
export function parseCurrentParams(): AppParams {
  if (typeof window === "undefined") return parseParams(undefined);
  return parseParams(getIframeQueryParams());
}
