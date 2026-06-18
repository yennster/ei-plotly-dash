import type { Metadata } from "next";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";

export const metadata: Metadata = {
  title: "URL parameters · Edge Impulse Plotly Dash",
  description:
    "Reference for the URL query parameters that configure the Edge Impulse Plotly Dash time-series explorer, standalone or embedded.",
};

interface Param {
  name: string;
  alias?: string;
  type: string;
  def: string;
  desc: string;
}

const PARAMS: Param[] = [
  {
    name: "apiKey",
    type: "string ei_…",
    def: "—",
    desc: "Edge Impulse API key. Validated, moved into the httpOnly ei_session cookie, then stripped from the URL. Only accepted when it starts with ei_.",
  },
  {
    name: "project",
    alias: "eiProject / projectId",
    type: "integer ≥ 1",
    def: "—",
    desc: "Project id to open. Optional — defaults to the API key's first project when omitted.",
  },
  {
    name: "category",
    type: "enum",
    def: "training",
    desc: "Dataset bucket to list and load from: training, testing, or anomaly. Case-insensitive.",
  },
  {
    name: "labels",
    type: "comma list",
    def: "—",
    desc: "Filter the sample list to these labels, e.g. labels=idle,walk,run.",
  },
  {
    name: "sample",
    alias: "sampleId",
    type: "integer ≥ 1",
    def: "—",
    desc: "Id of the sample to auto-open on load.",
  },
  {
    name: "channels",
    type: "comma list",
    def: "all",
    desc: "Channel names to pre-select, e.g. channels=accX,accY,accZ. Unknown names are ignored.",
  },
  {
    name: "view",
    type: "enum",
    def: "stacked",
    desc: "Figure layout: stacked (one auto-scaled subplot per channel, shared time axis) or overlay (all channels on one y-axis with a legend).",
  },
  {
    name: "rangeslider",
    alias: "slider",
    type: "boolean",
    def: "true",
    desc: "Show the Plotly range slider under the time axis for quick range navigation.",
  },
  {
    name: "limit",
    type: "integer 1–1000",
    def: "200",
    desc: "Page size for the sample list. Clamped to the 1..1000 range.",
  },
  {
    name: "offset",
    type: "integer ≥ 0",
    def: "0",
    desc: "Page offset for the sample list. Negative values clamp to 0.",
  },
  {
    name: "theme",
    type: "enum",
    def: "light",
    desc: "Force the UI theme: light or dark. Case-insensitive.",
  },
  {
    name: "embed",
    type: "boolean",
    def: "false",
    desc: "Strips the page header for iframe embedding, keeping the controls and the interactive plot.",
  },
  {
    name: "studioHost",
    type: "URL",
    def: "studio.edgeimpulse.com",
    desc: "Override the Studio API base URL. Must be an https URL whose host is edgeimpulse.com (or an allowlisted self-hosted host).",
  },
  {
    name: "ingestionHost",
    type: "URL",
    def: "ingestion.edgeimpulse.com",
    desc: "Override the Ingestion API base URL, under the same host allowlist as studioHost.",
  },
];

const EXAMPLES: { label: string; url: string }[] = [
  {
    label: "Open a specific training sample, stacked subplots",
    url: "/?category=training&sample=98765",
  },
  {
    label: "Connect with an API key (stripped from the URL after load)",
    url: "/?apiKey=ei_xxxxxxxxxxxx&sample=98765",
  },
  {
    label: "Overlay only the accelerometer channels, no range slider",
    url: "/?sample=98765&view=overlay&channels=accX,accY,accZ&rangeslider=0",
  },
  {
    label: "Filter by label, with a larger page size",
    url: "/?category=testing&labels=idle,walk,run&limit=500",
  },
  {
    label: "Embedded, dark theme to match Studio",
    url: "/?sample=98765&embed=1&theme=dark",
  },
];

export default function UrlParametersPage() {
  return (
    <div className="min-h-dvh bg-bg text-fg">
      <header className="sticky top-0 z-10 border-b border-border bg-bg/85 backdrop-blur">
        <div className="mx-auto flex max-w-4xl items-center gap-3 px-5 py-3">
          <Link
            href="/"
            className="inline-flex items-center gap-1.5 rounded-md px-2 py-1.5 text-sm text-fg-muted transition-colors hover:bg-surface-2 hover:text-fg"
          >
            <ArrowLeft className="h-4 w-4" />
            Dashboard
          </Link>
          <span className="text-sm font-medium text-fg-muted">
            URL parameters
          </span>
        </div>
      </header>

      <main className="mx-auto max-w-4xl px-5 py-10">
        <h1 className="text-3xl font-semibold tracking-tight">URL parameters</h1>
        <p className="mt-3 max-w-2xl text-[15px] leading-relaxed text-fg-muted">
          Edge Impulse Plotly Dash is configured through URL query parameters, so
          Edge Impulse Studio (or any host page) can deep-link straight into the
          right project, sample, and view. Parameters are parsed once at load and
          parsing never throws: invalid values fall back to their default, enums
          are case-insensitive, booleans accept 1/true/yes/on and 0/false/no/off,
          and integers are clamped to their range. When embedded in an iframe,
          parameters are also inherited from the parent frame (own-window values
          win), except the secret <code className="font-mono">apiKey</code>.
        </p>

        <section className="mt-10">
          <div className="overflow-x-auto rounded-xl border border-border">
            <table className="w-full border-collapse text-left text-sm">
              <thead>
                <tr className="bg-surface-2 text-xs uppercase tracking-wide text-fg-muted">
                  <th className="px-4 py-2.5 font-semibold">Parameter</th>
                  <th className="px-4 py-2.5 font-semibold">Type</th>
                  <th className="px-4 py-2.5 font-semibold">Default</th>
                  <th className="px-4 py-2.5 font-semibold">Description</th>
                </tr>
              </thead>
              <tbody>
                {PARAMS.map((p) => (
                  <tr key={p.name} className="border-t border-border align-top">
                    <td className="whitespace-nowrap px-4 py-3">
                      <code className="rounded bg-surface-2 px-1.5 py-0.5 font-mono text-[13px] text-fg">
                        {p.name}
                      </code>
                      {p.alias ? (
                        <span className="ml-1.5 text-xs text-fg-muted">
                          / {p.alias}
                        </span>
                      ) : null}
                    </td>
                    <td className="whitespace-nowrap px-4 py-3 font-mono text-[13px] text-fg-muted">
                      {p.type}
                    </td>
                    <td className="whitespace-nowrap px-4 py-3 font-mono text-[13px] text-fg-muted">
                      {p.def}
                    </td>
                    <td className="px-4 py-3 text-fg-muted">{p.desc}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>

        <section className="mt-12">
          <h2 className="text-xl font-semibold tracking-tight">Examples</h2>
          <div className="mt-4 flex flex-col gap-4">
            {EXAMPLES.map((ex) => (
              <div key={ex.url}>
                <p className="text-sm text-fg-muted">{ex.label}</p>
                <pre className="mt-1.5 overflow-x-auto rounded-lg border border-border bg-surface-2 px-3 py-2.5 text-[13px]">
                  <code className="font-mono text-fg">{ex.url}</code>
                </pre>
              </div>
            ))}
          </div>
        </section>

        <section className="mt-12">
          <h2 className="text-xl font-semibold tracking-tight">
            The API key never stays in the URL
          </h2>
          <ol className="mt-4 max-w-2xl list-decimal space-y-2 pl-5 text-[15px] leading-relaxed text-fg-muted marker:text-fg-muted">
            <li>
              The key is posted to{" "}
              <code className="rounded bg-surface-2 px-1 py-0.5 font-mono text-[13px] text-fg">
                /api/ei/session
              </code>
              , where the server validates it against Edge Impulse Studio.
            </li>
            <li>
              On success it is stored only in an httpOnly, secure, sameSite-none{" "}
              <code className="rounded bg-surface-2 px-1 py-0.5 font-mono text-[13px] text-fg">
                ei_session
              </code>{" "}
              cookie, never readable from client JavaScript and never written to
              localStorage.
            </li>
            <li>
              The key is then removed from the address bar with
              history.replaceState before the dashboard renders, so it never
              lingers in history, bookmarks, or the referrer.
            </li>
          </ol>
          <p className="mt-4 max-w-2xl text-sm text-fg-muted">
            Every subsequent request goes through the same-origin proxy routes,
            which read the cookie server-side and attach the key. The browser
            never sees it again.
          </p>
        </section>
      </main>
    </div>
  );
}
