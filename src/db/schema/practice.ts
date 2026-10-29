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

/** Every one-minute change test, never overwritten: the best per pair is a query. */
export const changeTests = pgTable(
  "change_tests",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    userId: text("user_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    /** Two chords in path order, "G-D". */
    pair: text("pair").notNull(),
    count: integer("count").notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [index("change_tests_user_pair_idx").on(t.userId, t.pair)],
);

/**
 * Routine blocks done, per local day of the player ("2026-10-29"): the day
 * comes from the browser, because "today" is the player's, not the server's.
 */
export const routineLog = pgTable(
  "routine_log",
  {
    userId: text("user_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    day: text("day").notNull(),
    block: text("block").notNull(),
    doneAt: timestamp("done_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [primaryKey({ columns: [t.userId, t.day, t.block] })],
);

/**
 * Every exchange with the assistant: the daily limit is a count over this
 * table, and the weekly summary is cached here (kind "summary") so a week is
 * written once, not on every visit.
 */
export const coachMessages = pgTable(
  "coach_messages",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    userId: text("user_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    kind: text("kind", { enum: ["question", "summary"] }).notNull(),
    /** The player's own day, "2026-10-29": the limit and the summary are per day. */
    day: text("day").notNull(),
    question: text("question"),
    answer: text("answer").notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [index("coach_messages_user_day_idx").on(t.userId, t.day)],
);
