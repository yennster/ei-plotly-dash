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
 * A contiguous run of one label inside a multi-label sample, resolved to a
 * concrete color for rendering. `startIndex`/`endIndex` are ORIGINAL
 * full-resolution sample indices (endIndex inclusive), so they stay correct
 * even when the payload was server-side downsampled (see Dataset.totalLength).
 */
export interface LabelSegment {
  label: string;
  startIndex: number;
  endIndex: number;
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
  /** Time-segmented labels (multi-label samples); undefined when single-label. */
  labelSegments?: LabelSegment[];
  /** Distinct labels present, in first-seen order (for legends / pickers). */
  labelList?: string[];
  /**
   * True number of readings in the source sample. Differs from the channel
   * length only when the payload was downsampled server-side
   * (limitPayloadValues); used to reconstruct the true-duration x-axis.
   */
  totalLength?: number;
  /** True when the loaded payload was downsampled (totalLength > channel length). */
  downsampled?: boolean;
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

/**
 * One label run inside a multi-label sample, as returned by Studio.
 * `endIndex` is INCLUSIVE: `{ startIndex: 0, endIndex: 3 }` covers 0,1,2,3.
 * Multiply an index by the sample's `intervalMs` to get a time code.
 */
export interface EIStructuredLabel {
  startIndex: number;
  endIndex: number;
  label: string;
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
  /** Time-segmented labels; present on multi-label samples. */
  structuredLabels?: EIStructuredLabel[];
  /** Distinct labels present on a multi-label sample. */
  structuredLabelsList?: string[];
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
  maxPoints: number; // per-sample payload cap (limitPayloadValues), 500..50000
  theme?: Theme;
  embed: boolean; // hides chrome inside iframe
  studioHost?: string;
  ingestionHost?: string;
}
