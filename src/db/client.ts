import "server-only";
import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import * as schema from "./schema";

const url = process.env.DATABASE_URL;
if (!url) throw new Error("DATABASE_URL is not set");

// PgBouncer in transaction mode does not keep prepared statements between calls.
const sql = postgres(url, { max: 5, prepare: !url.includes("pgbouncer=true") });

export const db = drizzle(sql, { schema });
export type Db = typeof db;
