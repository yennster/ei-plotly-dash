# Registering as an Edge Impulse extension

Edge Impulse · Plotly Dash is designed to run as an **Edge Impulse Studio
extension / integration**: Studio embeds the app in an iframe and deep-links to
it with URL parameters so it opens directly on the right project and sample.

This page covers the deep-link URL shape, how the iframe embedding works, and
what the extension does.

---

## What the extension does

When opened from inside Edge Impulse Studio for a given sample, the extension:

1. Receives the category and sample id (and, on first connect, an API key) via
   URL parameters — see [URL parameters](./url-parameters.md). The project is
   resolved automatically from the project-scoped API key.
2. Validates the API key server-side and stores it in the httpOnly `ei_session`
   cookie. If supplied as a URL parameter, the key remains in the iframe URL.
3. Loads the sample's time-series through the same-origin proxy
   (`GET /api/ei/sample/{id}` → Edge Impulse `GET /{projectId}/raw-data/{id}`).
   Channel `i` is `payload.values.map(row => row[i])`, named from
   `payload.sensors[i].name`. (The plural `GET /api/ei/samples` is the list
   endpoint.)
4. Renders the channels as an **interactive Plotly figure** — stacked
   per-channel subplots (each auto-scaled, sharing the time axis) or an overlay,
   with zoom, pan, a range slider, hover, and PNG export.
5. Lets the user filter samples by category/label, pick a sample, show/hide
   channels, switch layout, and toggle the range slider — all reactive.

When embedded, pass `embed=1` so the app's page header is hidden and the
dashboard fills the iframe. Pass `theme=dark|light` to match Studio.

This is a **read-only analysis surface** — it visualizes project data and does
not write back to Edge Impulse, so it is safe to embed broadly.

---

## Deep-link URL shape

The host (Studio or your own launcher) links to the deployed app with query
parameters. The general shape:

```
https://dash.jennyspeelman.dev/?apiKey=<ei_…>&category=<training|testing|anomaly>&sample=<id>&embed=1
```

| Part | Purpose |
| --- | --- |
| `apiKey=ei_…` | API key. Validated, stored in the `ei_session` cookie, and left in the query string. Optional once a session cookie already exists. The project is resolved from the key. |
| `category=…` | Dataset bucket the sample lives in. |
| `sample=<id>` | Sample to auto-open (alias `sampleId`). |
| `view=stacked\|overlay` | Optional figure layout (default `stacked`). |
| `channels=a,b,c` | Optional channels to pre-select. |
| `rangeslider=0\|1` | Optional range slider toggle (default on). |
| `embed=1` | Hide the page header for iframe embedding. |
| `theme=dark\|light` | Optional — match Studio's theme. |
| `studioHost` / `ingestionHost` | Optional — self-hosted / enterprise Edge Impulse origin with protocol, without API paths. |

Once the session cookie is set, subsequent links can omit `apiKey`:

```
https://dash.jennyspeelman.dev/?category=training&sample=98765&embed=1
```

---

## Embedding via iframe

```html
<iframe
  src="https://dash.jennyspeelman.dev/?category=training&sample=98765&embed=1&theme=dark"
  title="Edge Impulse · Plotly Dash"
  style="width: 100%; height: 100%; border: 0;"
  allow="clipboard-write"
></iframe>
```

For this to work, three things must line up:

1. **Framing must be allowed.** The app sends a
   `Content-Security-Policy: frame-ancestors` header (configured in
   `next.config.ts`) that permits framing by `'self'` and the specific origin
   `https://studio.edgeimpulse.com`. It does **not** send `X-Frame-Options:
   DENY`, and it does **not** use a `*.edgeimpulse.com` wildcard. To embed in a
   different known host, add that exact origin to `frame-ancestors`.

2. **The session cookie must survive the iframe.** The `ei_session` cookie is
   set with `sameSite: "none"`, `secure: true`, and `partitioned: true` (CHIPS),
   so it is sent on same-origin proxy requests even when the app is a cross-site
   iframe. This requires the app to be served over **HTTPS**.

3. **Inherited parameters.** When framed, the app merges query parameters
   inherited from the parent frame (parent `location.search` when same-origin,
   else `document.referrer`). The app's own URL parameters take precedence.
   **The `apiKey` is never inherited** from the parent/referrer — pass it only
   to the app's own iframe `src`, or POST it to `/api/ei/session` directly.

See [Deployment](./deployment.md) for the full CSP / cookie / HTTPS details.

---

## Connecting without a deep link

The extension also works standalone. With `embed` unset, the app shows a connect
panel where a user can:

- Paste an API key (and optional project id) to connect — the same validation
  path as the `apiKey` URL parameter — then browse and plot samples.
- Import a local CSV file instead of connecting to Edge Impulse (first column =
  time/index, the rest become channels).

This is useful for development and for inspecting data that is not yet in an
Edge Impulse project.
