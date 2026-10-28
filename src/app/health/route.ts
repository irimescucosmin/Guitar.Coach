import { sql } from "drizzle-orm";
import { db } from "@/db/client";

/** Fly's health check: the process answers and the database is reachable. */
export async function GET() {
  try {
    await db.execute(sql`select 1`);
    return Response.json({ ok: true });
  } catch {
    return Response.json({ ok: false }, { status: 503 });
  }
}

export const dynamic = "force-dynamic";
