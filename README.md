# Edge Impulse · Plotly Dash

An interactive **[Plotly](https://dash.plotly.com/) time-series dashboard for
Edge Impulse projects**. It runs both **standalone** and **embedded inside Edge
Impulse Studio** as an extension (iframe), and deep-links into the right
project, sample, and view through [URL query parameters](#url-parameters).

🔗 **Live:** https://dash.jennyspeelman.dev &nbsp;·&nbsp; **Repo:**
https://github.com/yennster/ei-plotly-dash

The package name is `ei-plotly-dash`.

---

## What it does

Studio plots every sensor axis of a sample on **one shared chart with a single
y-axis**, so a channel with a large magnitude (say a pressure signal in
`0..1000`) dominates the scale and flattens smaller channels (an accelerometer
in `±1`) into an unreadable line near zero.

This dashboard fixes that with Plotly's full interactive plotting:

- **Stacked subplots** (default) — one row per channel, each with its **own
  auto-scaled y-axis**, all sharing the same time x-axis and a synchronized
  hover. Every channel is readable regardless of magnitude.
- **Overlay** — all channels on one shared y-axis with a legend, for direct
  comparison when magnitudes are similar.
- **Full Plotly interactivity** — drag-to-zoom, pan, a **range slider** for
  fast time navigation, hover read-outs, double-click to autoscale, and **PNG
  export** from the modebar.
- **Reactive controls** (the Dash idea) — category, label filter, sample
  picker, per-channel show/hide, layout, and the range-slider toggle all update
  the figure live.
- **Summary stats** — per-channel min / max / mean / std / RMS, plus sample
  rate and duration, derived on the client.
- **Standalone CSV import** — drop in a local CSV (first column = time/index,
  the rest become channels) without connecting to Edge Impulse.

It connects to a project with an **Edge Impulse API key**, which is validated
server-side and stored only in an httpOnly cookie — it never reaches client
JavaScript (see [Security](#security)).

---

## URL parameters

The app is configured entirely through URL query parameters, so Studio (or any
host page) can link straight into the right state. Parsing happens once at load
and **never throws** — invalid values fall back to their default. Full reference
at [`/url-parameters`](https://dash.jennyspeelman.dev/url-parameters) and in
[docs/url-parameters.md](./docs/url-parameters.md).

| Parameter | Type | Default | Purpose |
| --- | --- | --- | --- |
| `apiKey` | `ei_…` | — | API key. Validated, moved to the httpOnly cookie, then **stripped from the URL**. |
| `project` / `eiProject` / `projectId` | int | first project | Project id to open. |
| `category` | enum | `training` | `training` \| `testing` \| `anomaly`. |
| `labels` | comma list | — | Filter the sample list, e.g. `idle,walk,run`. |
| `sample` / `sampleId` | int | — | Sample id to auto-open on load. |
| `channels` | comma list | all | Channel names to pre-select. |
| `view` | enum | `stacked` | `stacked` (per-channel subplots) \| `overlay`. |
| `rangeslider` / `slider` | bool | `true` | Show the Plotly range slider. |
| `limit` / `offset` | int | `200` / `0` | Sample-list paging. |
| `theme` | enum | `light` | `light` \| `dark`. |
| `embed` | bool | `false` | Hide the page header for iframe embedding. |
| `studioHost` / `ingestionHost` | URL | EI cloud | Self-hosted / enterprise API bases (host-allowlisted). |

```
https://dash.jennyspeelman.dev/?apiKey=ei_…&category=training&sample=98765&view=stacked&embed=1&theme=dark
```

When embedded in an iframe, parameters are also inherited from the parent frame
(own-window values win) — except the secret `apiKey`, which is only ever read
from the app's own URL so it can be stripped after load.

---

## Embedding in Edge Impulse Studio

```html
<iframe
  src="https://dash.jennyspeelman.dev/?project=12345&category=training&sample=98765&embed=1&theme=dark"
  title="Edge Impulse · Plotly Dash"
  style="width: 100%; height: 100%; border: 0;"
  allow="clipboard-write"
></iframe>
```

See [docs/edge-impulse-extension.md](./docs/edge-impulse-extension.md) for the
deep-link shape, framing (`frame-ancestors`), and cross-site cookie details.

---

## Security

The API key is treated as a secret end-to-end:

1. It is POSTed to `/api/ei/session`, validated against Studio, and stored only
   in an **httpOnly, secure, sameSite-none** `ei_session` cookie — never
   readable from client JS, never in localStorage.
2. It is then removed from the address bar with `history.replaceState` before
   the dashboard renders.
3. Every Edge Impulse request goes through the same-origin `/api/ei/*` proxy,
   which reads the cookie server-side and attaches the key. The browser never
   sees it again.
4. `studioHost` / `ingestionHost` overrides are **host-allowlisted** (https +
   `edgeimpulse.com` or `EI_ALLOWED_HOSTS`, no private/loopback addresses) so a
   crafted URL cannot exfiltrate the key or drive an SSRF.

---

## Tech stack

- **Next.js 15** (App Router) + **React 19** + **TypeScript**
- **Plotly.js** (`plotly.js-dist-min`, loaded lazily, browser-only)
- **Tailwind CSS v4**
- **pnpm**

---

## Local development

```bash
pnpm install
pnpm dev          # http://localhost:3000
pnpm typecheck    # tsc --noEmit
pnpm build        # next build
```

No environment variables are required. The optional Edge Impulse host overrides
are documented in [`.env.example`](./.env.example) and
[docs/deployment.md](./docs/deployment.md).

---

## Documentation

- [docs/url-parameters.md](./docs/url-parameters.md) — every URL parameter.
- [docs/edge-impulse-extension.md](./docs/edge-impulse-extension.md) — deep-link
  + iframe embedding.
- [docs/deployment.md](./docs/deployment.md) — deploying to Vercel, the
  `frame-ancestors` / cookie / HTTPS requirements.
