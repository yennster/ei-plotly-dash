// src/lib/timeseries.ts — pure time-series helpers (x-axis, stats, decimation).

import type { Dataset } from "@/lib/types";

/** Longest channel length in the dataset (samples share one x-axis). */
export function maxLength(ds: Dataset): number {
  return ds.channels.reduce((m, c) => Math.max(m, c.values.length), 0);
}

/** True reading count of the source sample (≥ loaded length when downsampled). */
export function pointCount(ds: Dataset): number {
  return Math.max(maxLength(ds), ds.totalLength ?? 0);
}

export interface XAxis {
  /** x value per loaded timestep. */
  x: number[];
  /** Axis label (seconds when a sample rate is known, else sample index). */
  label: string;
  /** True when x is real time in seconds (vs. a 0..n-1 index). */
  isTime: boolean;
  /**
   * x units per ORIGINAL (full-resolution) sample index. Multiply a structured
   * label's start/end index by this to place its band, so bands stay aligned
   * even after server-side downsampling.
   */
  dtX: number;
}

/**
 * Build the shared x-axis. Priority: explicit time[] → intervalMs → frequencyHz
 * → 0..n-1 sample index. Time is expressed in seconds.
 *
 * When the payload was downsampled (totalLength > loaded length), the loaded
 * points are spread across the full original duration: loaded point i sits at
 * original index ≈ i * stride, so x keeps spanning the true range and label
 * bands (indexed in original resolution) line up.
 */
export function buildXAxis(ds: Dataset): XAxis {
  const n = maxLength(ds);

  if (ds.time && ds.time.length) {
    const x = ds.time.slice(0, n);
    const dtX = n > 1 ? (x[n - 1] - x[0]) / (n - 1) : 1;
    return { x, label: "Time (s)", isTime: true, dtX };
  }

  const total = ds.totalLength && ds.totalLength > n ? ds.totalLength : n;
  const stride = n > 0 ? total / n : 1;

  let dtMs: number | undefined;
  if (ds.intervalMs && ds.intervalMs > 0) dtMs = ds.intervalMs;
  else if (ds.frequencyHz && ds.frequencyHz > 0) dtMs = 1000 / ds.frequencyHz;

  if (dtMs) {
    const dtSec = dtMs / 1000;
    const x = new Array<number>(n);
    for (let i = 0; i < n; i++) x[i] = i * stride * dtSec;
    return { x, label: "Time (s)", isTime: true, dtX: dtSec };
  }

  const x = new Array<number>(n);
  for (let i = 0; i < n; i++) x[i] = i * stride;
  return { x, label: "Sample #", isTime: false, dtX: 1 };
}

export interface ChannelStats {
  count: number;
  min: number;
  max: number;
  mean: number;
  std: number;
  rms: number;
}

/** Summary statistics for a single channel's values. */
export function channelStats(values: number[]): ChannelStats {
  const count = values.length;
  if (count === 0) {
    return { count: 0, min: 0, max: 0, mean: 0, std: 0, rms: 0 };
  }
  let min = Infinity;
  let max = -Infinity;
  let sum = 0;
  let sumSq = 0;
  for (let i = 0; i < count; i++) {
    const v = values[i];
    if (v < min) min = v;
    if (v > max) max = v;
    sum += v;
    sumSq += v * v;
  }
  const mean = sum / count;
  const variance = Math.max(0, sumSq / count - mean * mean);
  return {
    count,
    min,
    max,
    mean,
    std: Math.sqrt(variance),
    rms: Math.sqrt(sumSq / count),
  };
}

/**
 * Stride-decimate parallel x/y arrays down to at most `maxPoints` points for
 * rendering. Always keeps the first and last point. Returns the inputs as-is
 * when already small enough. This keeps very long samples interactive in Plotly
 * without distorting the overall shape.
 */
export function decimate(
  x: number[],
  y: number[],
  maxPoints = 6000,
): { x: number[]; y: number[] } {
  const n = Math.min(x.length, y.length);
  if (n <= maxPoints) return { x: x.slice(0, n), y: y.slice(0, n) };

  const step = Math.ceil(n / maxPoints);
  const outX: number[] = [];
  const outY: number[] = [];
  for (let i = 0; i < n; i += step) {
    outX.push(x[i]);
    outY.push(y[i]);
  }
  // Always include the final sample so the time range is preserved.
  if (outX[outX.length - 1] !== x[n - 1]) {
    outX.push(x[n - 1]);
    outY.push(y[n - 1]);
  }
  return { x: outX, y: outY };
}

/** Format a number compactly for stat readouts. */
export function fmtNum(n: number): string {
  if (!Number.isFinite(n)) return "—";
  const abs = Math.abs(n);
  if (abs !== 0 && (abs < 1e-3 || abs >= 1e6)) return n.toExponential(2);
  return Number(n.toFixed(3)).toString();
}

/** Human-readable duration from a sample count + dataset timing. */
export function durationLabel(ds: Dataset): string {
  const n = maxLength(ds);
  if (n === 0) return "—";
  const total = pointCount(ds);
  const ax = buildXAxis(ds);
  if (!ax.isTime) return `${total.toLocaleString()} samples`;
  const seconds = ax.x[n - 1] - ax.x[0];
  if (!Number.isFinite(seconds) || seconds <= 0)
    return `${total.toLocaleString()} samples`;
  if (seconds < 1) return `${Math.round(seconds * 1000)} ms`;
  if (seconds < 60) return `${Number(seconds.toFixed(2))} s`;
  const m = Math.floor(seconds / 60);
  const s = Math.round(seconds % 60);
  return `${m}m ${s}s`;
}

/** Effective sample rate (Hz) for the dataset, or undefined when unknown. */
export function sampleRateHz(ds: Dataset): number | undefined {
  if (ds.frequencyHz && ds.frequencyHz > 0) return ds.frequencyHz;
  if (ds.intervalMs && ds.intervalMs > 0) return 1000 / ds.intervalMs;
  if (ds.time && ds.time.length >= 2) {
    const dt = ds.time[1] - ds.time[0];
    if (dt > 0) return 1 / dt;
  }
  return undefined;
}
