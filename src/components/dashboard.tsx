"use client";

// src/components/dashboard.tsx — the client root. Parses URL params, manages the
// Edge Impulse session (auto-connect from ?apiKey=, or status check), lists and
// loads samples, and drives the reactive Plotly figure from the controls.

import * as React from "react";
import { Loader2, AlertTriangle, BarChart3 } from "lucide-react";
import type {
  AppParams,
  Dataset,
  EICategory,
  EISampleMeta,
  Theme,
  ViewMode,
} from "@/lib/types";
import { parseCurrentParams } from "@/lib/url-params";
import * as ei from "@/lib/ei-client";
import { parseCsvFile } from "@/lib/csv";
import { buildFigure } from "@/lib/plotly-figure";
import { AppHeader } from "@/components/app-header";
import { ConnectPanel } from "@/components/connect-panel";
import { ControlsPanel } from "@/components/controls-panel";
import { StatsCards } from "@/components/stats-cards";
import { PlotlyChart } from "@/components/plotly-chart";

function applyThemeClass(theme: Theme) {
  if (typeof document === "undefined") return;
  document.documentElement.classList.toggle("dark", theme === "dark");
  document.documentElement.style.colorScheme = theme;
}

function Banner({ message }: { message: string }) {
  return (
    <div className="flex items-start gap-2 rounded-md border border-danger/30 bg-danger/10 px-3 py-2 text-sm text-danger">
      <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
      <span>{message}</span>
    </div>
  );
}

export function Dashboard() {
  const paramsRef = React.useRef<AppParams | null>(null);
  const appliedParamSample = React.useRef(false);
  const appliedParamChannels = React.useRef(false);

  const [mounted, setMounted] = React.useState(false);
  const [initializing, setInitializing] = React.useState(true);
  const [theme, setTheme] = React.useState<Theme>("light");
  const [embed, setEmbed] = React.useState(false);

  const [connected, setConnected] = React.useState(false);
  const [projectName, setProjectName] = React.useState<string | undefined>();
  const [connecting, setConnecting] = React.useState(false);
  const [connectError, setConnectError] = React.useState<string | undefined>();

  const [category, setCategory] = React.useState<EICategory>("training");
  const [labelFilter, setLabelFilter] = React.useState("");
  const [samples, setSamples] = React.useState<EISampleMeta[]>([]);
  const [samplesLoading, setSamplesLoading] = React.useState(false);
  const [samplesError, setSamplesError] = React.useState<string | undefined>();
  const [selectedSampleId, setSelectedSampleId] = React.useState<number | null>(
    null,
  );

  const [dataset, setDataset] = React.useState<Dataset | null>(null);
  const [datasetLoading, setDatasetLoading] = React.useState(false);
  const [datasetError, setDatasetError] = React.useState<string | undefined>();

  const [selectedChannels, setSelectedChannels] = React.useState<string[]>([]);
  const [view, setView] = React.useState<ViewMode>("stacked");
  const [rangeslider, setRangeslider] = React.useState(true);

  // ---- mount: parse params, set initial UI, connect or check status ----
  React.useEffect(() => {
    const p = parseCurrentParams();
    paramsRef.current = p;

    const initialTheme: Theme = p.theme ?? "light";
    setTheme(initialTheme);
    applyThemeClass(initialTheme);
    setEmbed(p.embed);
    setView(p.view);
    setRangeslider(p.rangeslider);
    if (p.category) setCategory(p.category);
    if (p.labels) setLabelFilter(p.labels.join(","));
    setMounted(true);

    (async () => {
      try {
        if (p.apiKey) {
          setConnecting(true);
          const res = await ei.connectSession({
            apiKey: p.apiKey,
            studioHost: p.studioHost,
            ingestionHost: p.ingestionHost,
          });
          if (res.success) {
            setConnected(true);
            setProjectName(res.projectName);
          } else {
            setConnectError(res.error);
          }
          setConnecting(false);
        } else {
          const st = await ei.getSessionStatus();
          if (st.connected) {
            setConnected(true);
            setProjectName(st.projectName);
          }
        }
      } catch {
        // Fall through to the connect panel.
      } finally {
        setInitializing(false);
      }
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const labels = React.useMemo(
    () =>
      labelFilter
        .split(",")
        .map((s) => s.trim())
        .filter(Boolean),
    [labelFilter],
  );

  const applyChannelSelection = React.useCallback((ds: Dataset) => {
    const names = ds.channels.map((c) => c.name);
    const p = paramsRef.current;
    if (!appliedParamChannels.current && p?.channels) {
      appliedParamChannels.current = true;
      const subset = names.filter((n) => p.channels!.includes(n));
      setSelectedChannels(subset.length ? subset : names);
    } else {
      setSelectedChannels(names);
    }
  }, []);

  // ---- list samples when connected / category / labels change ----
  const loadSamples = React.useCallback(() => {
    if (!connected) return () => {};
    let cancelled = false;
    setSamplesLoading(true);
    setSamplesError(undefined);
    const p = paramsRef.current;
    ei.listSamples({ category, labels, limit: p?.limit, offset: p?.offset })
      .then((list) => {
        if (cancelled) return;
        setSamples(list);
        const target = p?.sample;
        setSelectedSampleId((cur) => {
          if (cur && list.some((s) => s.id === cur)) return cur;
          if (
            !appliedParamSample.current &&
            target &&
            list.some((s) => s.id === target)
          ) {
            appliedParamSample.current = true;
            return target;
          }
          return list.length ? list[0].id : null;
        });
      })
      .catch((e) => {
        if (!cancelled)
          setSamplesError(e instanceof Error ? e.message : "Failed to load samples");
      })
      .finally(() => {
        if (!cancelled) setSamplesLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [connected, category, labels]);

  React.useEffect(() => loadSamples(), [loadSamples]);

  // ---- load the selected sample's full payload ----
  React.useEffect(() => {
    if (selectedSampleId == null) return;
    let cancelled = false;
    setDatasetLoading(true);
    setDatasetError(undefined);
    ei.loadSample(selectedSampleId, paramsRef.current?.maxPoints)
      .then((ds) => {
        if (cancelled) return;
        setDataset(ds);
        applyChannelSelection(ds);
      })
      .catch((e) => {
        if (!cancelled)
          setDatasetError(e instanceof Error ? e.message : "Failed to load sample");
      })
      .finally(() => {
        if (!cancelled) setDatasetLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [selectedSampleId, applyChannelSelection]);

  // ---- handlers ----
  const toggleTheme = React.useCallback(() => {
    setTheme((t) => {
      const next = t === "dark" ? "light" : "dark";
      applyThemeClass(next);
      return next;
    });
  }, []);

  const handleConnect = React.useCallback(async (apiKey: string) => {
    setConnecting(true);
    setConnectError(undefined);
    try {
      const res = await ei.connectSession({ apiKey });
      if (res.success) {
        setConnected(true);
        setProjectName(res.projectName);
      } else {
        setConnectError(res.error ?? "Failed to connect");
      }
    } catch (e) {
      setConnectError(e instanceof Error ? e.message : "Failed to connect");
    } finally {
      setConnecting(false);
    }
  }, []);

  const handleDisconnect = React.useCallback(async () => {
    try {
      await ei.disconnectSession();
    } catch {
      // ignore
    }
    setConnected(false);
    setProjectName(undefined);
    setSamples([]);
    setSelectedSampleId(null);
    setDataset(null);
    setSelectedChannels([]);
    setSamplesError(undefined);
    setDatasetError(undefined);
  }, []);

  const handleImportCsv = React.useCallback(async (file: File) => {
    try {
      const { dataset: ds } = await parseCsvFile(file);
      setSelectedSampleId(null);
      setDataset(ds);
      setSelectedChannels(ds.channels.map((c) => c.name));
      setDatasetError(undefined);
    } catch (e) {
      setDatasetError(e instanceof Error ? e.message : "Failed to parse CSV");
    }
  }, []);

  const toggleChannel = React.useCallback((name: string) => {
    setSelectedChannels((cur) =>
      cur.includes(name) ? cur.filter((n) => n !== name) : [...cur, name],
    );
  }, []);

  const figure = React.useMemo(() => {
    if (!dataset) return null;
    return buildFigure(dataset, {
      view,
      theme,
      rangeslider,
      selected: selectedChannels,
    });
  }, [dataset, view, theme, rangeslider, selectedChannels]);

  // ---- render ----
  if (!mounted) {
    return (
      <div className="flex min-h-screen items-center justify-center text-fg-muted">
        <Loader2 className="ei-spinner h-5 w-5" />
      </div>
    );
  }

  const showConnect = !connected && !dataset;
  const channelMeta =
    dataset?.channels.map((c) => ({ name: c.name, color: c.color })) ?? [];

  return (
    <div className="min-h-screen">
      {!embed && (
        <AppHeader
          connected={connected}
          projectName={projectName}
          theme={theme}
          onToggleTheme={toggleTheme}
          onDisconnect={handleDisconnect}
        />
      )}

      {initializing && !connected && !dataset ? (
        <div className="flex min-h-[60vh] items-center justify-center text-fg-muted">
          <Loader2 className="ei-spinner h-5 w-5" />
        </div>
      ) : showConnect ? (
        <ConnectPanel
          onConnect={handleConnect}
          connecting={connecting}
          error={connectError}
          onImportCsv={handleImportCsv}
        />
      ) : (
        <main className="mx-auto max-w-[1600px] px-4 py-5">
          <div className="flex flex-col gap-5 lg:flex-row">
            <ControlsPanel
              connected={connected}
              category={category}
              onCategory={setCategory}
              labelFilter={labelFilter}
              onLabelFilter={setLabelFilter}
              onRefreshSamples={loadSamples}
              samples={samples}
              samplesLoading={samplesLoading}
              selectedSampleId={selectedSampleId}
              onSelectSample={setSelectedSampleId}
              channels={channelMeta}
              selectedChannels={selectedChannels}
              onToggleChannel={toggleChannel}
              onAllChannels={() =>
                setSelectedChannels(channelMeta.map((c) => c.name))
              }
              onNoChannels={() => setSelectedChannels([])}
              view={view}
              onView={setView}
              rangeslider={rangeslider}
              onRangeslider={setRangeslider}
              onImportCsv={handleImportCsv}
            />

            <section className="min-w-0 flex-1 space-y-4">
              {connectError && <Banner message={connectError} />}
              {samplesError && <Banner message={samplesError} />}
              {datasetError && <Banner message={datasetError} />}

              {dataset ? (
                <>
                  <StatsCards dataset={dataset} />
                  <div className="relative rounded-lg border border-border bg-surface p-2">
                    {datasetLoading && (
                      <div className="absolute inset-0 z-10 flex items-center justify-center bg-surface/60 text-fg-muted">
                        <Loader2 className="ei-spinner h-5 w-5" />
                      </div>
                    )}
                    {figure && (
                      <PlotlyChart data={figure.data} layout={figure.layout} />
                    )}
                  </div>
                </>
              ) : datasetLoading ? (
                <div className="flex min-h-[40vh] items-center justify-center gap-2 text-fg-muted">
                  <Loader2 className="ei-spinner h-5 w-5" />
                  Loading sample…
                </div>
              ) : (
                <div className="flex min-h-[40vh] flex-col items-center justify-center gap-2 text-center text-fg-muted">
                  <BarChart3 className="h-8 w-8 opacity-60" />
                  <p className="text-sm">
                    {samples.length === 0
                      ? "No samples in this category. Try another category or label filter."
                      : "Select a sample to plot its time-series."}
                  </p>
                </div>
              )}
            </section>
          </div>
        </main>
      )}
    </div>
  );
}
