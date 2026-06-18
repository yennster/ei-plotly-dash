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
| `apiKey` | | string `ei_…` | — | Edge Impulse API key. Validated, moved into the httpOnly `ei_session` cookie, then stripped from the URL. Only accepted when it starts with `ei_`. The project is resolved automatically from the (project-scoped) key. |
| `category` | | enum | `training` | Dataset bucket: `training`, `testing`, or `anomaly`. |
| `labels` | | comma list | — | Filter the sample list to these labels, e.g. `labels=idle,walk,run`. |
| `sample` | `sampleId` | integer ≥ 1 | — | Sample id to auto-open on load. |
| `channels` | | comma list | all | Channel names to pre-select, e.g. `channels=accX,accY,accZ`. Unknown names are ignored. |
| `view` | | enum | `stacked` | `stacked` (one auto-scaled subplot per channel, shared time axis) or `overlay` (all channels on one y-axis with a legend). |
| `rangeslider` | `slider` | boolean | `true` | Show the Plotly range slider under the time axis. |
| `limit` | | integer 1–1000 | `200` | Page size for the sample list. |
| `offset` | | integer ≥ 0 | `0` | Page offset for the sample list. |
| `theme` | | enum | `light` | Force the UI theme: `light` or `dark`. |
| `embed` | | boolean | `false` | Strip the page header for iframe embedding; keep the controls and plot. |
| `studioHost` | | URL | `studio.edgeimpulse.com` | Override the Studio API base. https + host-allowlisted. |
| `ingestionHost` | | URL | `ingestion.edgeimpulse.com` | Override the Ingestion API base. https + host-allowlisted. |

## Examples

Open a specific training sample (stacked subplots):

```
/?category=training&sample=98765
```

Connect with an API key (stripped from the URL after load):

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

Embedded, dark theme to match Studio:

```
/?category=training&sample=98765&embed=1&theme=dark
```

## Inherited parameters (embedded mode)

When the app runs inside an iframe, parameters are also merged from the parent
frame (parent `location.search` when same-origin, else `document.referrer`).
The app's own URL parameters take precedence.

**The `apiKey` is never inherited** from the parent/referrer — it is only
accepted on the app's own URL, so it can be moved into the cookie and stripped
from the address bar. Embedders should pass `apiKey` only to the app's own
iframe `src`, or POST it to `/api/ei/session` directly; never place it in the
parent page's URL, where it would persist in a URL the embedder controls.
