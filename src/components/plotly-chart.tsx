"use client";

// src/components/plotly-chart.tsx — thin React wrapper around Plotly.js.
//
// Plotly touches `window`/DOM, so the runtime bundle is imported dynamically
// (browser-only) inside an effect; the server renders just an empty container.
// We call Plotly.react() on every data/layout change (it diffs internally), keep
// the plot sized to its container with a ResizeObserver, and purge on unmount.

import * as React from "react";
import type { Data, Layout, Config } from "plotly.js";
import { Loader2 } from "lucide-react";

type PlotlyModule = typeof import("plotly.js-dist-min");

const CONFIG: Partial<Config> = {
  responsive: true,
  displaylogo: false,
  scrollZoom: true,
  // Keep the modebar focused on time-series interactions.
  modeBarButtonsToRemove: ["lasso2d", "select2d"],
  toImageButtonOptions: {
    format: "png",
    filename: "ei-timeseries",
    scale: 2,
  },
};

export function PlotlyChart({
  data,
  layout,
  className,
}: {
  data: Data[];
  layout: Partial<Layout>;
  className?: string;
}) {
  const ref = React.useRef<HTMLDivElement | null>(null);
  const plotly = React.useRef<PlotlyModule | null>(null);
  const [ready, setReady] = React.useState(false);

  // Load the Plotly runtime once.
  React.useEffect(() => {
    let cancelled = false;
    import("plotly.js-dist-min").then((mod) => {
      if (cancelled) return;
      plotly.current = mod;
      setReady(true);
    });
    return () => {
      cancelled = true;
    };
  }, []);

  // Render / update whenever the figure or the runtime changes.
  React.useEffect(() => {
    const el = ref.current;
    const Plotly = plotly.current;
    if (!el || !Plotly) return;
    void Plotly.react(el, data, layout, CONFIG);
  }, [ready, data, layout]);

  // Keep the plot sized to its container (sidebar toggles, window resize, …).
  React.useEffect(() => {
    const el = ref.current;
    if (!el || typeof ResizeObserver === "undefined") return;
    const ro = new ResizeObserver(() => {
      const Plotly = plotly.current;
      if (el && Plotly) Plotly.Plots.resize(el);
    });
    ro.observe(el);
    return () => ro.disconnect();
  }, [ready]);

  // Purge on unmount to release the WebGL context / listeners.
  React.useEffect(() => {
    const el = ref.current;
    return () => {
      const Plotly = plotly.current;
      if (el && Plotly) Plotly.purge(el);
    };
  }, []);

  return (
    <div className="relative w-full">
      <div ref={ref} className={className} style={{ width: "100%" }} />
      {!ready && (
        <div className="absolute inset-0 flex items-center justify-center text-fg-muted">
          <Loader2 className="ei-spinner h-5 w-5" />
        </div>
      )}
    </div>
  );
}
