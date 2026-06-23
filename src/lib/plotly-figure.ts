// src/lib/plotly-figure.ts — build a Plotly figure (data + layout) from a Dataset.
//
// Two layouts, both fully interactive (zoom/pan/box-select/hover, range slider,
// PNG export via the modebar):
//   - stacked: one subplot row per channel, sharing the time x-axis, each with
//     its own auto-scaled y-axis (so different magnitudes stay readable).
//   - overlay: every channel on a single shared y-axis with a legend.
//
// Colors are resolved to concrete hex per theme because Plotly renders to
// canvas/SVG and cannot read CSS variables. The layout is assembled as a plain
// object (dynamic yaxis2/yaxis3… keys) and cast to Partial<Layout> at the end.

import type { Data, Layout } from "plotly.js";
import type { Dataset, Theme, ViewMode } from "@/lib/types";
import { buildXAxis, decimate, type XAxis } from "@/lib/timeseries";

export interface FigureOptions {
  view: ViewMode;
  theme: Theme;
  rangeslider: boolean;
  /** Channel names to include. An empty array renders an empty frame. */
  selected: string[];
}

export interface Figure {
  data: Data[];
  layout: Partial<Layout>;
}

interface ThemePalette {
  font: string;
  grid: string;
  zero: string;
  axis: string;
}

const THEMES: Record<Theme, ThemePalette> = {
  light: { font: "#475569", grid: "#e2e8f0", zero: "#cbd5e1", axis: "#94a3b8" },
  dark: { font: "#94a3b8", grid: "#1f2a3c", zero: "#334155", axis: "#475569" },
};

/** Max points rendered per trace (decimated for interactivity). */
const MAX_POINTS = 6000;

/** Translucent fill so label bands sit behind the traces without hiding them. */
const BAND_OPACITY = 0.12;
/** Max bands to tag inline; above this we rely on the legend chips only. */
const MAX_BAND_TAGS = 12;

function axisLabel(name: string, units?: string): string {
  return units ? `${name} (${units})` : name;
}

/** "#3b82f6" → "rgba(59,130,246,a)". Returns the input unchanged if not 6-hex. */
function hexToRgba(hex: string, alpha: number): string {
  const m = /^#?([0-9a-f]{6})$/i.exec(hex);
  if (!m) return hex;
  const int = parseInt(m[1], 16);
  const r = (int >> 16) & 255;
  const g = (int >> 8) & 255;
  const b = int & 255;
  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
}

interface LabelDecor {
  shapes: Record<string, unknown>[];
  annotations: Record<string, unknown>[];
}

/**
 * Build the shaded multi-label regions (full-height bands across every subplot)
 * plus optional inline tags. Bands are indexed in ORIGINAL sample resolution and
 * mapped through `ax.dtX`, so they stay aligned even when the payload was
 * downsampled. Returns null when the dataset is single-label.
 */
function labelDecor(ds: Dataset, ax: XAxis, tagBg: string): LabelDecor | null {
  const segs = ds.labelSegments;
  if (!segs || segs.length === 0) return null;

  const shapes: Record<string, unknown>[] = [];
  const annotations: Record<string, unknown>[] = [];
  const tag = segs.length <= MAX_BAND_TAGS;

  for (const s of segs) {
    // endIndex is inclusive, so the band reaches the start of the next index.
    const x0 = s.startIndex * ax.dtX;
    const x1 = (s.endIndex + 1) * ax.dtX;
    shapes.push({
      type: "rect",
      xref: "x",
      yref: "paper",
      x0,
      x1,
      y0: 0,
      y1: 1,
      fillcolor: hexToRgba(s.color, BAND_OPACITY),
      line: { width: 0 },
      layer: "below",
    });
    if (tag) {
      annotations.push({
        xref: "x",
        yref: "paper",
        x: (x0 + x1) / 2,
        y: 1,
        yanchor: "top",
        text: s.label,
        showarrow: false,
        font: { color: s.color, size: 11 },
        bgcolor: tagBg,
        borderpad: 1,
        captureevents: false,
      });
    }
  }

  return { shapes, annotations };
}

export function buildFigure(ds: Dataset, opts: FigureOptions): Figure {
  const ax = buildXAxis(ds);
  const palette = THEMES[opts.theme];
  const selectedSet = new Set(opts.selected);
  const chans = ds.channels.filter((c) => selectedSet.has(c.name));

  const baseAxis = {
    gridcolor: palette.grid,
    zerolinecolor: palette.zero,
    linecolor: palette.axis,
    tickcolor: palette.axis,
    tickfont: { color: palette.font, size: 11 },
    automargin: true,
  };

  const data: Data[] = [];
  const layout: Record<string, unknown> = {
    autosize: true,
    margin: { l: 64, r: 18, t: 16, b: 48 },
    paper_bgcolor: "rgba(0,0,0,0)",
    plot_bgcolor: "rgba(0,0,0,0)",
    font: {
      color: palette.font,
      family: "ui-sans-serif, system-ui, -apple-system, sans-serif",
    },
    showlegend: opts.view === "overlay",
    legend: {
      orientation: "h",
      x: 0,
      y: 1.12,
      font: { color: palette.font, size: 12 },
    },
    hovermode: opts.view === "overlay" ? "x unified" : "closest",
  };

  // Multi-label bands sit behind every layout (drawn under the traces). Computed
  // once from the dataset + x-axis so all return paths render them.
  const tagBg =
    opts.theme === "dark" ? "rgba(15,23,42,0.6)" : "rgba(255,255,255,0.6)";
  const decor = labelDecor(ds, ax, tagBg);
  if (decor) {
    layout.shapes = decor.shapes;
    layout.annotations = decor.annotations;
  }

  // Nothing selected → return empty axes so the chart frame still renders.
  if (chans.length === 0) {
    layout.xaxis = { ...baseAxis, title: ax.label };
    layout.yaxis = { ...baseAxis };
    layout.height = 360;
    return { data, layout: layout as Partial<Layout> };
  }

  if (opts.view === "overlay") {
    for (const c of chans) {
      const { x, y } = decimate(ax.x, c.values, MAX_POINTS);
      data.push({
        type: "scattergl",
        mode: "lines",
        name: axisLabel(c.name, c.units),
        x,
        y,
        line: { color: c.color, width: 1.5 },
        hovertemplate: `%{y:.4g}<extra>${c.name}</extra>`,
      } as Data);
    }
    layout.xaxis = {
      ...baseAxis,
      title: ax.label,
      rangeslider: opts.rangeslider ? { thickness: 0.08 } : { visible: false },
    };
    layout.yaxis = { ...baseAxis };
    layout.height = 480;
    return { data, layout: layout as Partial<Layout> };
  }

  // ---- stacked: one row per channel, sharing the x-axis ----
  const n = chans.length;
  const gap = n > 1 ? 0.045 : 0;
  const rowH = (1 - gap * (n - 1)) / n;

  chans.forEach((c, i) => {
    const idx = i + 1; // 1-based axis index
    const yAxisKey = idx === 1 ? "yaxis" : `yaxis${idx}`;
    const yRef = idx === 1 ? "y" : `y${idx}`;
    // Channel 0 sits at the top; the last channel at the bottom.
    const top = 1 - i * (rowH + gap);
    const bottom = Math.max(0, top - rowH);

    const { x, y } = decimate(ax.x, c.values, MAX_POINTS);
    data.push({
      type: "scattergl",
      mode: "lines",
      name: c.name,
      x,
      y,
      xaxis: "x",
      yaxis: yRef,
      line: { color: c.color, width: 1.5 },
      hovertemplate: `%{y:.4g}<extra>${c.name}</extra>`,
    } as Data);

    layout[yAxisKey] = {
      ...baseAxis,
      domain: [bottom, top],
      title: { text: axisLabel(c.name, c.units), font: { color: c.color, size: 12 } },
    };
  });

  // The shared x-axis is anchored to the bottom-most subplot so ticks (and the
  // range slider) render underneath the whole stack.
  const bottomRef = n === 1 ? "y" : `y${n}`;
  layout.xaxis = {
    ...baseAxis,
    title: ax.label,
    anchor: bottomRef,
    rangeslider: opts.rangeslider ? { thickness: 0.06 } : { visible: false },
  };
  layout.height = Math.max(320, n * 150 + 96);

  return { data, layout: layout as Partial<Layout> };
}
