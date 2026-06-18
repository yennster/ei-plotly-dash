// src/app/api/ei/session/route.ts — connect / status / disconnect.
//
// An Edge Impulse API key is project-scoped, so the project is resolved from the
// key itself — the user never supplies a project id.
//
// POST   validates the apiKey, resolves its project, then sets the httpOnly
//        `ei_session` cookie (sameSite:"none", secure, path:"/").
// GET    returns connection status WITHOUT exposing the apiKey.
// DELETE clears the cookie.

import { NextResponse } from "next/server";
import type { EISession } from "@/lib/types";
import {
  SESSION_COOKIE,
  EIRequestError,
  getSession,
  normalizeHost,
  serializeSession,
  studioBase,
  studioFetch,
} from "@/lib/ei-server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

interface ConnectBody {
  apiKey?: string;
  studioHost?: string;
  ingestionHost?: string;
}

interface EIProjectInfoResponse {
  success: boolean;
  error?: string;
  project?: { id: number; name?: string };
}

/** One week, so the session survives reloads/navigations inside the Studio iframe. */
const SESSION_MAX_AGE_SECONDS = 60 * 60 * 24 * 7;

const COOKIE_BASE = {
  httpOnly: true,
  secure: true,
  sameSite: "none" as const,
  path: "/",
  maxAge: SESSION_MAX_AGE_SECONDS,
  // CHIPS: partition the cookie per top-level site so modern browsers keep it in
  // the cross-site Studio iframe under stricter third-party-cookie policies.
  partitioned: true,
};

export async function POST(req: Request): Promise<NextResponse> {
  let body: ConnectBody;
  try {
    body = (await req.json()) as ConnectBody;
  } catch {
    return NextResponse.json(
      { success: false, error: "Invalid JSON body" },
      { status: 400 },
    );
  }

  const apiKey = typeof body.apiKey === "string" ? body.apiKey.trim() : "";
  if (!/^ei_/.test(apiKey)) {
    return NextResponse.json(
      { success: false, error: "An Edge Impulse API key (ei_...) is required" },
      { status: 400 },
    );
  }

  const studioHost = normalizeHost(body.studioHost);
  const ingestionHost = normalizeHost(body.ingestionHost);

  // Build a provisional session to validate against the Studio API.
  const provisional: EISession = {
    apiKey,
    projectId: 0,
    studioHost,
    ingestionHost,
  };

  try {
    // The key is project-scoped: resolve its project from the key's list.
    const listed = await studioFetch<{
      success: boolean;
      projects?: { id: number; name?: string }[];
    }>(provisional, `/projects`);
    const project = listed.projects?.[0];
    if (!project || !project.id || project.id < 1) {
      return NextResponse.json(
        {
          success: false,
          error: "No Edge Impulse project is accessible with this API key",
        },
        { status: 400 },
      );
    }

    const session: EISession = {
      apiKey,
      projectId: project.id,
      studioHost,
      ingestionHost,
    };

    const res = NextResponse.json({
      success: true,
      projectName: project.name,
      studioHost: studioBase(session),
    });
    res.cookies.set(SESSION_COOKIE, serializeSession(session), COOKIE_BASE);
    return res;
  } catch (err) {
    const status = err instanceof EIRequestError ? err.status : 502;
    const message =
      err instanceof Error ? err.message : "Failed to validate the API key";
    return NextResponse.json({ success: false, error: message }, { status });
  }
}

export async function GET(): Promise<NextResponse> {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ success: true, connected: false });
  }
  // Look up the project name for display; never leak the apiKey.
  let projectName: string | undefined;
  try {
    const info = await studioFetch<EIProjectInfoResponse>(
      session,
      `/${session.projectId}/`,
    );
    projectName = info.project?.name;
  } catch {
    // Status should still report "connected" even if the name lookup fails.
  }
  return NextResponse.json({
    success: true,
    connected: true,
    projectName,
    studioHost: studioBase(session),
  });
}

export async function DELETE(): Promise<NextResponse> {
  const res = NextResponse.json({ success: true, connected: false });
  res.cookies.set(SESSION_COOKIE, "", { ...COOKIE_BASE, maxAge: 0 });
  return res;
}
