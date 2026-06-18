// src/lib/types.ts — the single shared data model, imported everywhere.

/** A hex color string, e.g. "#3b82f6". */
export type HexColor = string;

/** Which Edge Impulse dataset bucket a sample belongs to. */
export type EICategory = "training" | "testing" | "anomaly";

/** UI theme. */
export type Theme = "dark" | "light";

/**
 * How the channels are laid out in the Plotly figure.
 * - `stacked`: one subplot row per channel, sharing the time axis (default).
 *   Each channel gets its own auto-scaled y-axis, so signals with different
 *   magnitudes stay readable.
 * - `overlay`: every channel drawn on a single shared y-axis.
 */
export type ViewMode = "overlay" | "stacked";

/**
 * One sensor axis / data series. `values` is the full-resolution data for the
 * series; `color` is a stable per-channel color assigned at load.
 */
export interface Channel {
  name: string;
  units?: string;
  values: number[];
  color: HexColor;
}

/**
 * A loaded time-series document. `time` is the explicit x-axis (seconds); when
 * absent the x-axis is derived from intervalMs / frequencyHz, or a 0..n-1 index.
 */
export interface Dataset {
  channels: Channel[];
  time?: number[];
  intervalMs?: number;
  frequencyHz?: number;
  source: "csv" | "edge-impulse";
  name: string;
  label?: string;
  category?: EICategory;
  sampleId?: number;
}

/** Server-side session, persisted only in the httpOnly `ei_session` cookie. */
export interface EISession {
  apiKey: string;
  projectId: number;
  studioHost?: string;
  ingestionHost?: string;
}

// ---- Edge Impulse wire shapes (validated at the proxy boundary) ----

/** Studio {success,error} envelope wrapping every JSON response. */
export interface EIEnvelope {
  success: boolean;
  error?: string;
}

/** A row in GET /{projectId}/raw-data (sample list metadata). */
export interface EISampleMeta {
  id: number;
  filename: string;
  label: string;
  category: EICategory;
  sensors: { name: string; units?: string }[];
  frequency?: number;
  intervalMs?: number;
  totalLengthMs?: number;
  valuesCount?: number;
}

/** payload object from GET /{projectId}/raw-data/{sampleId}. */
export interface EISamplePayload {
  device_type?: string;
  sensors: { name: string; units?: string }[];
  /** one inner array PER TIMESTEP, one number per sensor axis. */
  values: number[][];
  intervalMs?: number;
  frequencyHz?: number;
}

/** GET /{projectId}/raw-data/{sampleId} full body. */
export interface EISampleResponse extends EIEnvelope {
  sample: EISampleMeta;
  payload: EISamplePayload;
  totalPayloadLength: number;
}

// ---- URL params (parsed once at load, never throws) ----

export interface AppParams {
  apiKey?: string; // matches /^ei_/, moved to cookie then stripped from URL
  category?: EICategory;
  labels?: string[]; // comma list
  sample?: number; // alias sampleId, int >= 1 — auto-open on load
  channels?: string[]; // comma list of channel names to pre-select
  view: ViewMode; // overlay | stacked (default stacked)
  rangeslider: boolean; // show the Plotly range slider (default true)
  limit: number; // 1..1000, default 200
  offset: number; // >= 0, default 0
  theme?: Theme;
  embed: boolean; // hides chrome inside iframe
  studioHost?: string;
  ingestionHost?: string;
}
