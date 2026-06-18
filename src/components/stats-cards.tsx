"use client";

import type { Dataset } from "@/lib/types";
import {
  channelStats,
  durationLabel,
  fmtNum,
  maxLength,
  sampleRateHz,
} from "@/lib/timeseries";

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg border border-border bg-surface px-3 py-2">
      <div className="text-[11px] uppercase tracking-wide text-fg-muted">
        {label}
      </div>
      <div className="mt-0.5 truncate text-sm font-semibold" title={value}>
        {value}
      </div>
    </div>
  );
}

export function StatsCards({ dataset }: { dataset: Dataset }) {
  const n = maxLength(dataset);
  const rate = sampleRateHz(dataset);

  return (
    <div className="space-y-3">
      <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-6">
        <Stat label="Sample" value={dataset.name} />
        <Stat label="Label" value={dataset.label ?? "—"} />
        <Stat label="Channels" value={String(dataset.channels.length)} />
        <Stat label="Points" value={n.toLocaleString()} />
        <Stat label="Duration" value={durationLabel(dataset)} />
        <Stat
          label="Sample rate"
          value={rate ? `${fmtNum(rate)} Hz` : "—"}
        />
      </div>

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
