// Applied by Fly's release_command before new machines take traffic.
import nextEnv from "@next/env";
import { drizzle } from "drizzle-orm/postgres-js";
import { migrate } from "drizzle-orm/postgres-js/migrator";
import postgres from "postgres";

// Plain node reads no .env file, whatever the flags: this is the loader next dev
// and next build use, so a script resolves variables exactly as the app does.
// On Fly there is no file and they come from the machine's environment.
nextEnv.loadEnvConfig(process.cwd());

const url = process.env.DATABASE_URL;
if (!url) throw new Error("DATABASE_URL is not set");
const sql = postgres(url, { max: 1, onnotice: () => {} });
await migrate(drizzle(sql), { migrationsFolder: "./drizzle" });
await sql.end();
console.log("migrations applied");
