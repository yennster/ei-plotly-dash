// src/lib/ei-server.ts — SERVER-ONLY Edge Impulse helpers.
//
// All Studio calls flow through here so the API key never reaches client JS.
// The session lives in the httpOnly `ei_session` cookie. This mirrors the proven
// Edge Impulse CSV editor proxy architecture.

import "server-only";
import { cookies } from "next/headers";
import type { EIEnvelope, EISession } from "@/lib/types";
import { normalizeAllowedHost } from "@/lib/ei-host";

/** Name of the httpOnly session cookie. */
export const SESSION_COOKIE = "ei_session";

/** Default Edge Impulse Studio API base. */
export const DEFAULT_STUDIO_HOST = "https://studio.edgeimpulse.com/v1/api";

/** Default Edge Impulse Ingestion API base. */
export const DEFAULT_INGESTION_HOST = "https://ingestion.edgeimpulse.com/api";

/**
 * Extra allowed hostnames for self-hosted / enterprise Edge Impulse instances,
 * configured server-side via EI_ALLOWED_HOSTS (comma-separated bare hostnames).
 * Never client-controllable.
 */
function envAllowedHosts(): string[] {
  const raw = process.env.EI_ALLOWED_HOSTS;
  if (!raw) return [];
  return raw
    .split(",")
    .map((s) => s.trim().toLowerCase())
    .filter(Boolean);
}

/**
 * Normalize + VALIDATE a host override against the allowlist (see
 * `@/lib/ei-host`). Returns undefined for any host that is not an https URL with
 * an allowlisted, non-private hostname, so callers fall back to the safe
 * default.
 *
 * SECURITY: these overrides are attacker-controllable (URL params, inherited
 * iframe params). Every Studio call attaches the secret x-api-key, so an
 * unvalidated host would let a malicious page exfiltrate the key or drive a
 * server-side request to internal/metadata endpoints (SSRF).
 */
export function normalizeHost(host: string | undefined | null): string | undefined {
  return normalizeAllowedHost(host, envAllowedHosts());
}

/** Resolve the Studio base URL for a session (with env + per-session override). */
export function studioBase(session?: Pick<EISession, "studioHost"> | null): string {
  return (
    normalizeHost(session?.studioHost) ??
    normalizeHost(process.env.EI_STUDIO_HOST) ??
    DEFAULT_STUDIO_HOST
  );
}

/** Resolve the Ingestion base URL for a session (with env + per-session override). */
export function ingestionBase(
  session?: Pick<EISession, "ingestionHost"> | null,
): string {
  return (
    normalizeHost(session?.ingestionHost) ??
    normalizeHost(process.env.EI_INGESTION_HOST) ??
    DEFAULT_INGESTION_HOST
  );
}

/** Serialize a session for storage in the cookie value. */
export function serializeSession(session: EISession): string {
  return JSON.stringify(session);
}

/** Parse a session from a cookie value; returns null on any failure. */
export function deserializeSession(raw: string | undefined | null): EISession | null {
  if (!raw) return null;
  try {
    const obj = JSON.parse(raw) as Partial<EISession>;
    if (
      obj &&
      typeof obj.apiKey === "string" &&
      /^ei_/.test(obj.apiKey) &&
      typeof obj.projectId === "number" &&
      Number.isFinite(obj.projectId)
    ) {
      return {
        apiKey: obj.apiKey,
        projectId: obj.projectId,
        studioHost: typeof obj.studioHost === "string" ? obj.studioHost : undefined,
        ingestionHost:
          typeof obj.ingestionHost === "string" ? obj.ingestionHost : undefined,
      };
    }
  } catch {
    // fall through
  }
  return null;
}

/** Read and parse the current request's session cookie. Null if absent/invalid. */
export async function getSession(): Promise<EISession | null> {
  const store = await cookies();
  return deserializeSession(store.get(SESSION_COOKIE)?.value);
}

/** Standard x-api-key auth headers for Studio calls. */
export function authHeaders(session: EISession): HeadersInit {
  return {
    "x-api-key": session.apiKey,
    Accept: "application/json",
  };
}

export class EIRequestError extends Error {
  constructor(
    message: string,
    readonly status: number,
  ) {
    super(message);
    this.name = "EIRequestError";
  }
}

/**
 * Fetch a Studio JSON endpoint and unwrap the {success,error} envelope.
 *
 * `path` is appended to the Studio base; it should start with "/". On a non-OK
 * HTTP status, or `success:false`, throws EIRequestError.
 */
export async function studioFetch<T extends EIEnvelope = EIEnvelope>(
  session: EISession,
  path: string,
  init?: RequestInit,
): Promise<T> {
  const url = `${studioBase(session)}${path}`;
  const res = await fetch(url, {
    ...init,
    headers: {
      ...authHeaders(session),
      ...(init?.headers ?? {}),
    },
    cache: "no-store",
  });

  let body: unknown;
  try {
    body = await res.json();
  } catch {
    throw new EIRequestError(
      `Edge Impulse returned a non-JSON response (${res.status})`,
      res.status,
    );
  }

  const env = body as Partial<EIEnvelope> | null;
  if (!res.ok || !env || env.success !== true) {
    const msg =
      (env && typeof env.error === "string" && env.error) ||
      `Edge Impulse request failed (${res.status})`;
    throw new EIRequestError(msg, res.ok ? 502 : res.status);
  }

  return body as T;
}
