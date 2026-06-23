# Deployment

Edge Impulse · Plotly Dash is a standard Next.js (App Router) app. The
recommended host is **Vercel**, but any platform that can run a Next.js server
build over HTTPS will work. HTTPS is **required** because the session cookie is
`secure` + `sameSite: "none"` so it can be embedded inside the Studio iframe.

The production deployment lives at **https://dash.jennyspeelman.dev**.

---

## Deploying to Vercel

### 1. Import the project

Push the repository to GitHub and import it in the Vercel dashboard, or use the
CLI:

```bash
pnpm install -g vercel
vercel            # first run: link the project
vercel --prod     # deploy to production
```

Vercel auto-detects Next.js. The relevant build settings:

| Setting | Value |
| --- | --- |
| Framework preset | Next.js |
| Install command | `pnpm install` |
| Build command | `pnpm build` (`next build`) |
| Node.js version | 22.x |

The package manager is pnpm (pnpm 11); Vercel reads `pnpm-lock.yaml`
automatically. `pnpm-workspace.yaml` approves the `sharp` build script (a Next
transitive dependency) so installs are non-interactive.

### 2. Environment variables

No secrets are required — the Edge Impulse API key is supplied at runtime by the
user and stored only in the `ei_session` cookie. The only environment variables
are the **optional** Edge Impulse host overrides (see `.env.example`):

| Variable | Default | Purpose |
| --- | --- | --- |
| `EI_STUDIO_HOST` | `https://studio.edgeimpulse.com/v1/api` | Default Studio API base. |
| `EI_INGESTION_HOST` | `https://ingestion.edgeimpulse.com/api` | Default Ingestion API base. |
| `EI_ALLOWED_HOSTS` | — | Comma-separated extra hostnames to allow for self-hosted / enterprise Edge Impulse. |

Set these in **Project → Settings → Environment Variables** only if you target a
self-hosted / enterprise Edge Impulse instance. Per-session overrides
(`studioHost` / `ingestionHost` URL params) take precedence.

### 3. Custom subdomain

Add `dash.jennyspeelman.dev` under **Project → Settings → Domains** and point a
CNAME at Vercel as instructed. Vercel provisions a TLS certificate
automatically, so the deployment is served over HTTPS — which the `secure`
session cookie requires.

---

## Embedding requirements (iframe / CSP / cookies)

To embed the app inside Edge Impulse Studio, the deployment must satisfy all of
the following. The repo is already configured for the Edge Impulse origin.

### HTTPS

The app **must** be served over HTTPS. The `ei_session` cookie is `secure`, so
browsers will not send it over plain HTTP, and an embedded `sameSite: "none"`
cookie is invalid without `secure`.

### Framing (CSP `frame-ancestors`)

`next.config.ts` sends a `Content-Security-Policy` header on every route:

```
Content-Security-Policy: frame-ancestors 'self' https://studio.edgeimpulse.com;
```

This is the modern replacement for `X-Frame-Options`. The app intentionally does
**not** send `X-Frame-Options: DENY`. To embed in a **different** host, add that
origin to the `FRAME_ANCESTORS` list in `next.config.ts` and redeploy.

In **development** (`NODE_ENV !== "production"`), `http://localhost:*` and
`http://127.0.0.1:*` are also allowed so the app can be framed by a local
harness while testing. These dev-only origins are dropped from the production
build, so the deployed policy stays scoped to `'self'` and Studio.

### Cross-site cookie (`sameSite: "none"`, partitioned)

`/api/ei/session` sets the cookie with:

```
httpOnly: true
secure:   true
sameSite: "none"
partitioned: true   // CHIPS
path:     "/"
```

`sameSite: "none"` is required so the browser sends the cookie on the
same-origin proxy requests (`/api/ei/*`) while the app runs as a cross-site
iframe inside Studio. `partitioned` (CHIPS) keeps it working under stricter
third-party-cookie policies. Because the cookie is `httpOnly`, the API key it
carries cannot be read from the page.

### Browser third-party cookie settings

Some browsers block third-party cookies by default, which can prevent the
session cookie from being stored in the Studio iframe. If connecting works
standalone but fails when embedded, check that third-party cookies are permitted
for the app's domain.

---

## Verifying a deployment

```bash
pnpm install
pnpm build
pnpm start            # serves the production build on :3000

# Confirm the framing header is present
curl -sI https://dash.jennyspeelman.dev/ | grep -i content-security-policy
```

You should see the `frame-ancestors` directive listing `'self'` and the Edge
Impulse Studio origin. Then load a deep link with `embed=1` inside an iframe on
an allowed origin and confirm the dashboard renders with the page header hidden
and the session cookie set (DevTools → Application → Cookies → `ei_session`,
marked `HttpOnly`, `Secure`, `SameSite=None`, `Partitioned`).
