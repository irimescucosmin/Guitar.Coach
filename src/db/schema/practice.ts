import { index, integer, jsonb, pgTable, primaryKey, real, text, timestamp, uuid } from "drizzle-orm/pg-core";
import { user } from "./auth";

/** A chord counts as learned once it rang clean three strums in a row. */
export const chordMastery = pgTable(
  "chord_mastery",
  {
    userId: text("user_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    chord: text("chord").notNull(),
    learnedAt: timestamp("learned_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [primaryKey({ columns: [t.userId, t.chord] })],
);

/**
 * Every finished run, never overwritten: the best is a query, and the history
 * is what a progress chart will read later.
 *
 * `value` depends on `mode`: step = average milliseconds per change (lower is
 * better), timed = share of bars right, 0 to 1 (higher is better).
 */
export const practiceRuns = pgTable(
  "practice_runs",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    userId: text("user_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    songId: text("song_id").notNull(),
    mode: text("mode", { enum: ["step", "timed"] }).notNull(),
    value: real("value").notNull(),
    bpm: integer("bpm"),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [index("practice_runs_user_song_idx").on(t.userId, t.songId)],
);

/**
 * The first-run questionnaire, one row per player, replaced when answered
 * again. Stored whole as JSON and validated on every read: the questions will
 * change more often than the schema should.
 */
export const playerProfile = pgTable("player_profile", {
  userId: text("user_id")
    .primaryKey()
    .references(() => user.id, { onDelete: "cascade" }),
  answers: jsonb("answers").notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});
