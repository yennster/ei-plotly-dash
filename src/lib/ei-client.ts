// src/lib/ei-client.ts — BROWSER-SIDE Edge Impulse helpers.
//
// Thin, typed wrappers over the same-origin /api/ei/* route handlers. These run
// in the browser and NEVER touch the API key (it lives only in the httpOnly
// `ei_session` cookie, which the same-origin fetch sends automatically).
//
// Also converts an Edge Impulse sample payload (sensors + values, one row per
// timestep) into the shared Dataset/Channel model.

import type {
  Channel,
  Dataset,
  EICategory,
  EISampleMeta,
  EISamplePayload,
} from "@/lib/types";

// ---- color palette --------------------------------------------------------

/** Deterministic palette (theme-friendly hex), assigned by channel index. */
export const PALETTE: readonly string[] = [
  "#3b82f6", // blue
  "#ef4444", // red
  "#22c55e", // green
  "#f59e0b", // amber
  "#a855f7", // purple
  "#06b6d4", // cyan
  "#ec4899", // pink
  "#84cc16", // lime
  "#f97316", // orange
  "#14b8a6", // teal
  "#6366f1", // indigo
  "#eab308", // yellow
];

export function colorForIndex(i: number): string {
  return PALETTE[((i % PALETTE.length) + PALETTE.length) % PALETTE.length];
}

// ---- response shapes from our own routes ----------------------------------

export interface ConnectResult {
  success: boolean;
  error?: string;
  projectId?: number;
  projectName?: string;
  studioHost?: string;
}

export interface SessionStatus {
  success: true;
  connected: boolean;
  projectId?: number;
  projectName?: string;
  studioHost?: string;
}

/** Thrown for any non-success response from our /api/ei/* routes. */
export class EIClientError extends Error {
  constructor(
    message: string,
    readonly status: number,
  ) {
    super(message);
    this.name = "EIClientError";
  }
}

// ---- low-level fetch helpers ----------------------------------------------

/** Fetch JSON and enforce the {success} envelope, THROWING on failure. */
async function requestJson<T>(input: string, init?: RequestInit): Promise<T> {
  const { ok, status, body } = await rawJson(input, init);
  const env = body as { success?: boolean; error?: string } | null;
  if (!ok || !env || env.success !== true) {
    const msg =
      (env && typeof env.error === "string" && env.error) ||
      `Request failed (${status})`;
    throw new EIClientError(msg, status);
  }
  return body as T;
}

/** Fetch JSON WITHOUT throwing on {success:false}; returns the parsed envelope. */
async function rawJson(
  input: string,
  init?: RequestInit,
): Promise<{ ok: boolean; status: number; body: unknown }> {
  const res = await fetch(input, {
    credentials: "same-origin",
    ...init,
    headers: {
      Accept: "application/json",
      ...(init?.headers ?? {}),
    },
  });
  let body: unknown;
  try {
    body = await res.json();
  } catch {
    body = { success: false, error: `Non-JSON response from ${input}` };
  }
  return { ok: res.ok, status: res.status, body };
}

// ---- session --------------------------------------------------------------

export interface ConnectInput {
  apiKey: string;
  projectId?: number;
  studioHost?: string;
  ingestionHost?: string;
}

/**
 * Validate + persist a session (POST /api/ei/session). Does NOT throw on a
 * rejected key/project — returns `{ success:false, error }` so the caller can
 * surface the message inline.
 */
export async function connectSession(input: ConnectInput): Promise<ConnectResult> {
  const { body } = await rawJson("/api/ei/session", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(input),
  });
  const env = (body ?? {}) as ConnectResult;
  return {
    success: env.success === true,
    error: typeof env.error === "string" ? env.error : undefined,
    projectId: typeof env.projectId === "number" ? env.projectId : undefined,
    projectName: typeof env.projectName === "string" ? env.projectName : undefined,
    studioHost: typeof env.studioHost === "string" ? env.studioHost : undefined,
  };
}

/** Read connection status without exposing the apiKey (GET /api/ei/session). */
export async function getSessionStatus(): Promise<SessionStatus> {
  return requestJson<SessionStatus>("/api/ei/session", { method: "GET" });
}

/** Clear the session (DELETE /api/ei/session). */
export async function disconnectSession(): Promise<void> {
  await requestJson<{ success: true }>("/api/ei/session", { method: "DELETE" });
}

// ---- samples --------------------------------------------------------------

export interface ListSamplesInput {
  category?: EICategory;
  labels?: string[];
  limit?: number;
  offset?: number;
}

interface ListSamplesResponse {
  success: true;
  samples: EISampleMeta[];
  totalCount: number;
  limit: number;
  offset: number;
  category: EICategory | null;
}

/** List sample metadata for the connected project (GET /api/ei/samples). */
export async function listSamples(
  input: ListSamplesInput = {},
): Promise<EISampleMeta[]> {
  const qs = new URLSearchParams();
  if (input.category) qs.set("category", input.category);
  if (typeof input.limit === "number") qs.set("limit", String(input.limit));
  if (typeof input.offset === "number") qs.set("offset", String(input.offset));
  if (input.labels && input.labels.length) qs.set("labels", input.labels.join(","));
  const q = qs.toString();
  const res = await requestJson<ListSamplesResponse>(
    `/api/ei/samples${q ? `?${q}` : ""}`,
    { method: "GET" },
  );
  return res.samples ?? [];
}

export interface GetSampleResult {
  success: true;
  sample: EISampleMeta;
  payload: EISamplePayload;
  totalPayloadLength: number;
}

/** Load one sample's full payload (GET /api/ei/sample/{id}). */
export async function getSample(sampleId: number): Promise<GetSampleResult> {
  return requestJson<GetSampleResult>(
    `/api/ei/sample/${encodeURIComponent(String(sampleId))}`,
    { method: "GET" },
  );
}

/** Load a sample by id and return a ready-to-plot Dataset. */
export async function loadSample(sampleId: number): Promise<Dataset> {
  const { sample, payload } = await getSample(sampleId);
  return datasetFromSample(sample, payload);
}

// ---- payload -> Dataset conversion ----------------------------------------

/**
 * Column-extract an EI payload into Channels: channel i = values.map(r => r[i]),
 * name/units from payload.sensors[i]. Non-finite cells become 0.
 */
export function channelsFromPayload(payload: EISamplePayload): Channel[] {
  const sensors = payload.sensors ?? [];
  const rows = payload.values ?? [];
  return sensors.map((sensor, i) => {
    const values = new Array<number>(rows.length);
    for (let r = 0; r < rows.length; r++) {
      const v = rows[r]?.[i];
      values[r] = typeof v === "number" && Number.isFinite(v) ? v : 0;
    }
    return {
      name: sensor.name,
      units: sensor.units,
      values,
      color: colorForIndex(i),
    } satisfies Channel;
  });
}

/** Build a complete Dataset from a loaded EI sample. */
export function datasetFromSample(
  sample: EISampleMeta,
  payload: EISamplePayload,
): Dataset {
  const channels = channelsFromPayload(payload);
  const intervalMs = payload.intervalMs ?? sample.intervalMs ?? undefined;
  const frequencyHz =
    payload.frequencyHz ??
    (sample.frequency && sample.frequency > 0 ? sample.frequency : undefined);

  return {
    channels,
    intervalMs,
    frequencyHz,
    source: "edge-impulse",
    name: sample.filename || sample.label || `sample-${sample.id}`,
    label: sample.label,
    category: sample.category,
    sampleId: sample.id,
  };
}
