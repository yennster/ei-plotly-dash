"use client";

import { Activity, Github, Moon, Sun, LogOut } from "lucide-react";
import Link from "next/link";
import type { Theme } from "@/lib/types";
import { Button } from "@/components/ui/Button";
import { cn } from "@/lib/utils";

const GITHUB_URL = "https://github.com/yennster/ei-plotly-dash";

export function AppHeader({
  connected,
  projectName,
  projectId,
  theme,
  onToggleTheme,
  onDisconnect,
}: {
  connected: boolean;
  projectName?: string;
  projectId?: number;
  theme: Theme;
  onToggleTheme: () => void;
  onDisconnect: () => void;
}) {
  return (
    <header className="sticky top-0 z-20 border-b border-border bg-bg/85 backdrop-blur">
      <div className="mx-auto flex max-w-[1600px] items-center gap-3 px-5 py-2.5">
        <div className="flex items-center gap-2">
          <span className="flex h-7 w-7 items-center justify-center rounded-md bg-accent/10 text-accent">
            <Activity className="h-4 w-4" />
          </span>
          <div className="leading-tight">
            <div className="text-sm font-semibold tracking-tight">
              Edge Impulse · Plotly Dash
            </div>
            <div className="text-[11px] text-fg-muted">
              Interactive time-series explorer
            </div>
          </div>
        </div>

        <div className="ml-2 hidden items-center gap-2 sm:flex">
          <span
            className={cn(
              "inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-medium",
              connected
                ? "bg-accent/10 text-accent"
                : "bg-surface-2 text-fg-muted",
            )}
          >
            <span
              className={cn(
                "h-1.5 w-1.5 rounded-full",
                connected ? "bg-accent" : "bg-fg-muted",
              )}
            />
            {connected
              ? projectName
                ? `${projectName} · #${projectId}`
                : `Project #${projectId}`
              : "Not connected"}
          </span>
        </div>

        <div className="ml-auto flex items-center gap-1">
          <Link
            href="/url-parameters"
            className="hidden rounded-md px-2.5 py-1.5 text-sm text-fg-muted transition-colors hover:bg-surface-2 hover:text-fg sm:inline-block"
          >
            URL parameters
          </Link>
          <a
            href={GITHUB_URL}
            target="_blank"
            rel="noreferrer"
            aria-label="GitHub repository"
            title="GitHub repository"
            className="inline-flex h-9 w-9 items-center justify-center rounded-md text-fg-muted transition-colors hover:bg-surface-2 hover:text-fg"
          >
            <Github className="h-4 w-4" />
          </a>
          <button
            type="button"
            onClick={onToggleTheme}
            aria-label={`Switch to ${theme === "dark" ? "light" : "dark"} theme`}
            title={`Switch to ${theme === "dark" ? "light" : "dark"} theme`}
            className="inline-flex h-9 w-9 items-center justify-center rounded-md text-fg-muted transition-colors hover:bg-surface-2 hover:text-fg"
          >
            {theme === "dark" ? (
              <Sun className="h-4 w-4" />
            ) : (
              <Moon className="h-4 w-4" />
            )}
          </button>
          {connected && (
            <Button variant="ghost" size="sm" onClick={onDisconnect}>
              <LogOut className="h-3.5 w-3.5" />
              Disconnect
            </Button>
          )}
        </div>
      </div>
    </header>
  );
}
