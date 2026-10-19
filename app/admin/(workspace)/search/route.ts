import { NextResponse } from "next/server";
import { currentAdmin } from "@/lib/admin/auth";
import { searchLeads } from "@/lib/admin/search";

/**
 * Instant results for the top bar.
 *
 * Inside the (workspace) group but a route handler, so the layout's
 * redirect does not apply to it — the admin check is repeated here
 * explicitly. A route handler is an endpoint whatever directory it
 * sits in, and this one returns seller contact details.
 */
export const dynamic = "force-dynamic";

export async function GET(request: Request): Promise<NextResponse> {
  const admin = await currentAdmin();
  if (!admin) {
    return NextResponse.json({ error: "Not signed in" }, { status: 401 });
  }
  const term = new URL(request.url).searchParams.get("q") ?? "";
  try {
    return NextResponse.json({ hits: await searchLeads(term) });
  } catch (error) {
    console.error("admin search failed", error);
    return NextResponse.json({ hits: [] });
  }
}
