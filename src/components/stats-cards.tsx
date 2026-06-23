"use client";

import type { Dataset } from "@/lib/types";
import {
  channelStats,
  durationLabel,
  fmtNum,
  pointCount,
  sampleRateHz,
} from "@/lib/timeseries";

function Stat({
  label,
  value,
  title,
  hint,
}: {
  label: string;
  value: string;
  title?: string;
  hint?: string;
}) {
  return (
    <div className="rounded-lg border border-border bg-surface px-3 py-2">
      <div className="text-[11px] uppercase tracking-wide text-fg-muted">
        {label}
      </div>
      <div className="mt-0.5 truncate text-sm font-semibold" title={title ?? value}>
        {value}
      </div>
      {hint ? (
        <div className="truncate text-[11px] text-fg-muted" title={hint}>
          {hint}
        </div>
      ) : null}
    </div>
  );
}

/** Distinct label → band color, derived from the dataset's label segments. */
function labelColors(dataset: Dataset): Map<string, string> {
  const map = new Map<string, string>();
  for (const s of dataset.labelSegments ?? []) {
    if (!map.has(s.label)) map.set(s.label, s.color);
  }
  return map;
}

export function StatsCards({ dataset }: { dataset: Dataset }) {
  const total = pointCount(dataset);
  const loaded = dataset.channels.reduce(
    (m, c) => Math.max(m, c.values.length),
    0,
  );
  const rate = sampleRateHz(dataset);

  const colors = labelColors(dataset);
  const isMulti = colors.size > 1;
  const labelList = dataset.labelList ?? [];

  return (
    <div className="space-y-3">
      <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-6">
        <Stat label="Sample" value={dataset.name} />
        <Stat
          label={isMulti ? "Labels" : "Label"}
          value={isMulti ? `${colors.size} labels` : dataset.label ?? "—"}
          title={isMulti ? labelList.join(", ") : dataset.label ?? "—"}
        />
        <Stat label="Channels" value={String(dataset.channels.length)} />
        <Stat
          label="Points"
          value={total.toLocaleString()}
          hint={
            dataset.downsampled
              ? `downsampled to ${loaded.toLocaleString()}`
              : undefined
          }
          title={
            dataset.downsampled
              ? `${total.toLocaleString()} readings, downsampled to ${loaded.toLocaleString()} for display`
              : `${total.toLocaleString()} readings`
          }
        />
        <Stat label="Duration" value={durationLabel(dataset)} />
        <Stat label="Sample rate" value={rate ? `${fmtNum(rate)} Hz` : "—"} />
      </div>

      {isMulti && (
        <div className="flex flex-wrap items-center gap-x-3 gap-y-1.5 rounded-lg border border-border bg-surface px-3 py-2">
          <span className="text-[11px] font-semibold uppercase tracking-wide text-fg-muted">
            Labels
          </span>
          {[...colors.entries()].map(([label, color]) => (
            <span
              key={label}
              className="inline-flex items-center gap-1.5 text-sm"
            >
              <span
                className="inline-block h-2.5 w-2.5 rounded-sm"
                style={{ backgroundColor: color }}
              />
              <span className="truncate">{label}</span>
            </span>
          ))}
        </div>
      )}

      <div className="overflow-x-auto rounded-lg border border-border">
        <table className="w-full border-collapse text-left text-sm">
          <thead>
            <tr className="bg-surface-2 text-[11px] uppercase tracking-wide text-fg-muted">
              <th className="px-3 py-2 font-semibold">Channel</th>
              <th className="px-3 py-2 text-right font-semibold">Min</th>
              <th className="px-3 py-2 text-right font-semibold">Max</th>
              <th className="px-3 py-2 text-right font-semibold">Mean</th>
              <th className="px-3 py-2 text-right font-semibold">Std</th>
              <th className="px-3 py-2 text-right font-semibold">RMS</th>
            </tr>
          </thead>
          <tbody>
            {dataset.channels.map((c) => {
              const s = channelStats(c.values);
              return (
                <tr key={c.name} className="border-t border-border">
                  <td className="px-3 py-2">
                    <span className="inline-flex items-center gap-2">
                      <span
                        className="inline-block h-2.5 w-2.5 rounded-sm"
                        style={{ backgroundColor: c.color }}
                      />
                      <span className="font-medium">{c.name}</span>
                      {c.units ? (
                        <span className="text-xs text-fg-muted">{c.units}</span>
                      ) : null}
                    </span>
                  </td>
                  <td className="px-3 py-2 text-right font-mono text-[13px] text-fg-muted">
                    {fmtNum(s.min)}
                  </td>
                  <td className="px-3 py-2 text-right font-mono text-[13px] text-fg-muted">
                    {fmtNum(s.max)}
                  </td>
                  <td className="px-3 py-2 text-right font-mono text-[13px] text-fg-muted">
                    {fmtNum(s.mean)}
                  </td>
                  <td className="px-3 py-2 text-right font-mono text-[13px] text-fg-muted">
                    {fmtNum(s.std)}
                  </td>
                  <td className="px-3 py-2 text-right font-mono text-[13px] text-fg-muted">
                    {fmtNum(s.rms)}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
