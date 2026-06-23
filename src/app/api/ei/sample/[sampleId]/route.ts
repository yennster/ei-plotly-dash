// src/app/api/ei/sample/[sampleId]/route.ts — load one sample's full payload.
//
// GET proxy for /{projectId}/raw-data/{sampleId}. Returns
// { sample, payload, totalPayloadLength } so the client can build channels from
// payload.sensors (names/units) + payload.values (one row per timestep).
//
// `?points=N` caps the payload via Studio's `limitPayloadValues`, so a very
// large sample is downsampled server-side instead of shipping every reading to
// the browser. `totalPayloadLength` still reports the true length, letting the
// client reconstruct a correct full-duration x-axis.

import { NextResponse } from "next/server";
import type { EISampleResponse } from "@/lib/types";
import { EIRequestError, getSession, studioFetch } from "@/lib/ei-server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** Bounds for the payload cap, mirrored from url-params (defensive, server-side). */
const MIN_POINTS = 500;
const MAX_POINTS = 50000;

/** Parse and validate the sampleId path segment (positive integer). */
function parseSampleId(raw: string): number | null {
  const n = Number(raw);
  if (!Number.isFinite(n)) return null;
  const id = Math.trunc(n);
  return id >= 1 ? id : null;
}

/** Parse the optional payload cap (?points), clamped; null when absent/invalid. */
function parsePoints(raw: string | null): number | null {
  if (raw == null || raw.trim() === "") return null;
  const n = Number(raw);
  if (!Number.isFinite(n)) return null;
  return Math.min(MAX_POINTS, Math.max(MIN_POINTS, Math.trunc(n)));
}

export async function GET(
  req: Request,
  ctx: { params: Promise<{ sampleId: string }> },
): Promise<NextResponse> {
  const session = await getSession();
  if (!session) {
    return NextResponse.json(
      { success: false, error: "Not connected to Edge Impulse" },
      { status: 401 },
    );
  }

  const { sampleId: rawId } = await ctx.params;
  const sampleId = parseSampleId(rawId);
  if (sampleId == null) {
    return NextResponse.json(
      { success: false, error: "Invalid sample id" },
      { status: 400 },
    );
  }

  const url = new URL(req.url);
  const points = parsePoints(url.searchParams.get("points"));

  // Cap the payload server-side when requested. Keep all structured labels
  // (truncateStructuredLabels=false) so multi-label bands render in full.
  const qs = new URLSearchParams({ truncateStructuredLabels: "false" });
  if (points != null) qs.set("limitPayloadValues", String(points));

  try {
    const body = await studioFetch<EISampleResponse>(
      session,
      `/${session.projectId}/raw-data/${sampleId}?${qs.toString()}`,
    );
    return NextResponse.json({
      success: true,
      sample: body.sample,
      payload: body.payload,
      totalPayloadLength: body.totalPayloadLength,
    });
  } catch (err) {
    const status = err instanceof EIRequestError ? err.status : 502;
    const message = err instanceof Error ? err.message : "Failed to load sample";
    return NextResponse.json({ success: false, error: message }, { status });
  }
}
