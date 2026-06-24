# URL parameters

Edge Impulse · Plotly Dash is configured through URL query parameters, so Edge
Impulse Studio (or any host page) can deep-link straight into the right project,
sample, and view. Parameters are parsed **once at load** and parsing **never
throws**: invalid values fall back to their default, enums are case-insensitive,
booleans accept `1/true/yes/on` and `0/false/no/off`, and integers are clamped
to their range.

There is also an in-app version of this page at
[`/url-parameters`](https://dash.jennyspeelman.dev/url-parameters).

## Reference

| Parameter | Aliases | Type | Default | Description |
| --- | --- | --- | --- | --- |
| `apiKey` | | string `ei_…` | — | Edge Impulse API key. Validated, stored in the httpOnly `ei_session` cookie, and left in the query string. Only accepted when it starts with `ei_`. The project is resolved automatically from the (project-scoped) key. |
| `category` | | enum | `training` | Dataset bucket: `training`, `testing`, or `anomaly`. |
| `labels` | | comma list | — | Filter the sample list to these labels, e.g. `labels=idle,walk,run`. |
| `sample` | `sampleId` | integer ≥ 1 | — | Sample id to auto-open on load. |
| `channels` | | comma list | all | Channel names to pre-select, e.g. `channels=accX,accY,accZ`. Unknown names are ignored. |
| `view` | | enum | `stacked` | `stacked` (one auto-scaled subplot per channel, shared time axis) or `overlay` (all channels on one y-axis with a legend). |
| `rangeslider` | `slider` | boolean | `true` | Show the Plotly range slider under the time axis. |
| `limit` | | integer 1–1000 | `200` | Page size for the sample list. |
| `offset` | | integer ≥ 0 | `0` | Page offset for the sample list. |
| `maxPoints` | `points` | integer 500–50000 | `8000` | Per-sample payload cap. Samples longer than this are downsampled server-side (Studio `limitPayloadValues`) so very large samples stay fast to load; the true length and full-duration time axis are preserved. |
| `theme` | | enum | `light` | Force the UI theme: `light` or `dark`. |
| `embed` | | boolean | `false` | Strip the page header for iframe embedding; keep the controls and plot. |
| `studioHost` | | URL | `https://studio.edgeimpulse.com` | Override the Studio origin. Include the protocol, e.g. `https://studio.edgeimpulse.com` or, in local development, `http://localhost:4800`. Do not include `/v1/api`. |
| `ingestionHost` | | URL | `https://ingestion.edgeimpulse.com` | Override the Ingestion origin. Include the protocol and do not include the `/api` path. |

## Examples

Open a specific training sample (stacked subplots):

```
/?category=training&sample=98765
```

Connect with an API key:

```
/?apiKey=ei_xxxxxxxxxxxx&sample=98765
```

Overlay only the accelerometer channels, no range slider:

```
/?sample=98765&view=overlay&channels=accX,accY,accZ&rangeslider=0
```

Filter by label, larger page size:

```
/?category=testing&labels=idle,walk,run&limit=500
```

Cap a very large sample to ~4000 points for a faster load:

```
/?sample=98765&maxPoints=4000
```

Embedded, dark theme to match Studio:

```
/?category=training&sample=98765&embed=1&theme=dark
```

## Inherited parameters (embedded mode)

When the app runs inside an iframe, parameters are also merged from the parent
frame (parent `location.search` when same-origin, else `document.referrer`).
The app's own URL parameters take precedence.

**The `apiKey` is never inherited** from the parent/referrer — it is only
accepted on the app's own URL. Embedders should pass `apiKey` only to the app's
own iframe `src`, or POST it to `/api/ei/session` directly; never place it in
the parent page's URL, where it would persist in a URL the embedder controls.
