"use client";

import * as React from "react";
import { Activity, Upload, KeyRound, Loader2 } from "lucide-react";
import { Card } from "@/components/ui/Card";
import { Input } from "@/components/ui/Input";
import { Button } from "@/components/ui/Button";

export function ConnectPanel({
  onConnect,
  connecting,
  error,
  onImportCsv,
}: {
  onConnect: (apiKey: string, projectId?: number) => void;
  connecting: boolean;
  error?: string;
  onImportCsv: (file: File) => void;
}) {
  const [apiKey, setApiKey] = React.useState("");
  const [projectId, setProjectId] = React.useState("");
  const fileRef = React.useRef<HTMLInputElement | null>(null);

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    const pid = projectId.trim() ? Number(projectId.trim()) : undefined;
    onConnect(apiKey.trim(), Number.isFinite(pid) ? pid : undefined);
  };

  return (
    <div className="mx-auto flex max-w-md flex-col items-center px-5 py-16">
      <span className="mb-4 flex h-12 w-12 items-center justify-center rounded-xl bg-accent/10 text-accent">
        <Activity className="h-6 w-6" />
      </span>
      <h1 className="text-xl font-semibold tracking-tight">
        Connect to Edge Impulse
      </h1>
      <p className="mt-2 text-center text-sm text-fg-muted">
        Paste a project API key to browse and plot its time-series samples. The
        key is validated server-side, stored only in an httpOnly cookie, and
        never exposed to the page.
      </p>

      <Card className="mt-6 w-full">
        <form onSubmit={submit} className="space-y-3">
          <div className="space-y-1.5">
            <label className="text-xs font-medium text-fg-muted">
              API key
            </label>
            <div className="relative">
              <KeyRound className="pointer-events-none absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-fg-muted" />
              <Input
                value={apiKey}
                onChange={(e) => setApiKey(e.target.value)}
                placeholder="ei_0123456789abcdef…"
                className="pl-8 font-mono"
                autoComplete="off"
                spellCheck={false}
              />
            </div>
          </div>

          <div className="space-y-1.5">
            <label className="text-xs font-medium text-fg-muted">
              Project ID <span className="text-fg-muted/70">(optional)</span>
            </label>
            <Input
              value={projectId}
              onChange={(e) => setProjectId(e.target.value)}
              placeholder="Defaults to the key's first project"
              inputMode="numeric"
            />
          </div>

          {error && (
            <p className="rounded-md bg-danger/10 px-3 py-2 text-sm text-danger">
              {error}
            </p>
          )}

          <Button
            type="submit"
            className="w-full"
            disabled={connecting || !/^ei_/.test(apiKey.trim())}
          >
            {connecting ? (
              <>
                <Loader2 className="ei-spinner h-4 w-4" />
                Connecting…
              </>
            ) : (
              "Connect"
            )}
          </Button>
        </form>
      </Card>

      <div className="mt-6 flex w-full items-center gap-3 text-xs text-fg-muted">
        <span className="h-px flex-1 bg-border" />
        or
        <span className="h-px flex-1 bg-border" />
      </div>

      <input
        ref={fileRef}
        type="file"
        accept=".csv,text/csv"
        className="hidden"
        onChange={(e) => {
          const f = e.target.files?.[0];
          if (f) onImportCsv(f);
          e.target.value = "";
        }}
      />
      <Button
        variant="outline"
        className="mt-6 w-full"
        onClick={() => fileRef.current?.click()}
      >
        <Upload className="h-4 w-4" />
        Import a local CSV
      </Button>
      <p className="mt-2 text-center text-xs text-fg-muted">
        First column is treated as time/index; the rest become channels.
      </p>
    </div>
  );
}
