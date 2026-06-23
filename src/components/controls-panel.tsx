"use client";

import * as React from "react";
import { RefreshCw, Upload, Layers, LineChart } from "lucide-react";
import type { EICategory, EISampleMeta, ViewMode } from "@/lib/types";
import { Select } from "@/components/ui/Select";
import { Input } from "@/components/ui/Input";
import { Button } from "@/components/ui/Button";
import { cn } from "@/lib/utils";

const CATEGORIES: EICategory[] = ["training", "testing", "anomaly"];

function Section({
  title,
  children,
  action,
}: {
  title: string;
  children: React.ReactNode;
  action?: React.ReactNode;
}) {
  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <span className="text-[11px] font-semibold uppercase tracking-wide text-fg-muted">
          {title}
        </span>
        {action}
      </div>
      {children}
    </div>
  );
}

export interface ControlsPanelProps {
  connected: boolean;
  category: EICategory;
  onCategory: (c: EICategory) => void;
  labelFilter: string;
  onLabelFilter: (v: string) => void;
  onRefreshSamples: () => void;

  samples: EISampleMeta[];
  samplesLoading: boolean;
  selectedSampleId: number | null;
  onSelectSample: (id: number) => void;

  channels: { name: string; color: string }[];
  selectedChannels: string[];
  onToggleChannel: (name: string) => void;
  onAllChannels: () => void;
  onNoChannels: () => void;

  view: ViewMode;
  onView: (v: ViewMode) => void;
  rangeslider: boolean;
  onRangeslider: (v: boolean) => void;

  onImportCsv: (file: File) => void;
}

export function ControlsPanel(props: ControlsPanelProps) {
  const fileRef = React.useRef<HTMLInputElement | null>(null);

  return (
    <aside className="flex w-full flex-col gap-5 lg:w-72 lg:shrink-0">
      {props.connected && (
        <>
          <Section
            title="Dataset"
            action={
              <button
                type="button"
                onClick={props.onRefreshSamples}
                title="Refresh samples"
                className="text-fg-muted transition-colors hover:text-fg"
              >
                <RefreshCw
                  className={cn(
                    "h-3.5 w-3.5",
                    props.samplesLoading && "ei-spinner",
                  )}
                />
              </button>
            }
          >
            <Select
              value={props.category}
              onChange={(e) => props.onCategory(e.target.value as EICategory)}
              aria-label="Dataset category"
            >
              {CATEGORIES.map((c) => (
                <option key={c} value={c}>
                  {c[0].toUpperCase() + c.slice(1)}
                </option>
              ))}
            </Select>
            <Input
              value={props.labelFilter}
              onChange={(e) => props.onLabelFilter(e.target.value)}
              placeholder="Filter labels (e.g. idle,walk)"
              aria-label="Filter by label"
            />
          </Section>

          <Section title={`Sample (${props.samples.length})`}>
            <Select
              value={props.selectedSampleId ?? ""}
              onChange={(e) => props.onSelectSample(Number(e.target.value))}
              disabled={props.samples.length === 0}
              aria-label="Select sample"
            >
              {props.samples.length === 0 && (
                <option value="">
                  {props.samplesLoading ? "Loading…" : "No samples"}
                </option>
              )}
              {props.samples.map((s) => {
                const multi = s.structuredLabelsList?.length
                  ? s.structuredLabelsList
                  : null;
                const labelText = multi
                  ? `${multi.slice(0, 3).join("/")}${multi.length > 3 ? "…" : ""}`
                  : s.label;
                return (
                  <option key={s.id} value={s.id}>
                    {labelText ? `${labelText} · ` : ""}
                    {s.filename || `sample-${s.id}`} (#{s.id})
                  </option>
                );
              })}
            </Select>
          </Section>
        </>
      )}

      {props.channels.length > 0 && (
        <Section
          title={`Channels (${props.selectedChannels.length}/${props.channels.length})`}
          action={
            <div className="flex gap-2 text-xs">
              <button
                type="button"
                onClick={props.onAllChannels}
                className="text-accent hover:underline"
              >
                All
              </button>
              <button
                type="button"
                onClick={props.onNoChannels}
                className="text-fg-muted hover:underline"
              >
                None
              </button>
            </div>
          }
        >
          <div className="max-h-56 space-y-1 overflow-y-auto rounded-md border border-border bg-surface p-1.5">
            {props.channels.map((c) => {
              const checked = props.selectedChannels.includes(c.name);
              return (
                <label
                  key={c.name}
                  className="flex cursor-pointer items-center gap-2 rounded px-2 py-1 text-sm hover:bg-surface-2"
                >
                  <input
                    type="checkbox"
                    checked={checked}
                    onChange={() => props.onToggleChannel(c.name)}
                    className="accent-[var(--accent)]"
                  />
                  <span
                    className="inline-block h-2.5 w-2.5 rounded-sm"
                    style={{ backgroundColor: c.color }}
                  />
                  <span className="truncate">{c.name}</span>
                </label>
              );
            })}
          </div>
        </Section>
      )}

      <Section title="Layout">
        <div className="grid grid-cols-2 gap-1.5 rounded-md border border-border bg-surface p-1">
          <button
            type="button"
            onClick={() => props.onView("stacked")}
            className={cn(
              "flex items-center justify-center gap-1.5 rounded px-2 py-1.5 text-sm font-medium transition-colors",
              props.view === "stacked"
                ? "bg-accent text-accent-fg"
                : "text-fg-muted hover:bg-surface-2",
            )}
          >
            <Layers className="h-3.5 w-3.5" />
            Stacked
          </button>
          <button
            type="button"
            onClick={() => props.onView("overlay")}
            className={cn(
              "flex items-center justify-center gap-1.5 rounded px-2 py-1.5 text-sm font-medium transition-colors",
              props.view === "overlay"
                ? "bg-accent text-accent-fg"
                : "text-fg-muted hover:bg-surface-2",
            )}
          >
            <LineChart className="h-3.5 w-3.5" />
            Overlay
          </button>
        </div>
        <label className="flex cursor-pointer items-center gap-2 px-1 text-sm text-fg-muted">
          <input
            type="checkbox"
            checked={props.rangeslider}
            onChange={(e) => props.onRangeslider(e.target.checked)}
            className="accent-[var(--accent)]"
          />
          Show range slider
        </label>
      </Section>

      <Section title="Local data">
        <input
          ref={fileRef}
          type="file"
          accept=".csv,text/csv"
          className="hidden"
          onChange={(e) => {
            const f = e.target.files?.[0];
            if (f) props.onImportCsv(f);
            e.target.value = "";
          }}
        />
        <Button
          variant="outline"
          size="sm"
          className="w-full"
          onClick={() => fileRef.current?.click()}
        >
          <Upload className="h-3.5 w-3.5" />
          Import local CSV
        </Button>
      </Section>
    </aside>
  );
}
