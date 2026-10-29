import { customType, index, integer, pgTable, real, text, timestamp, uuid } from "drizzle-orm/pg-core";
import { user } from "./auth";

/** Raw bytes: Drizzle has no bytea of its own. */
const bytea = customType<{ data: Buffer; driverData: Buffer }>({
  dataType: () => "bytea",
});

/**
 * One recording per player per week, the audio in the row: a few hundred
 * kilobytes of Opus each, a few dozen rows per player at most, which is
 * simpler than a file store and backed up with the rest.
 */
export const recordings = pgTable(
  "recordings",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    userId: text("user_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    songId: text("song_id").notNull(),
    mode: text("mode", { enum: ["step", "timed"] }).notNull(),
    share: real("share"),
    /** The Monday of the week, as the player's local date. */
    week: text("week").notNull(),
    day: text("day").notNull(),
    durationMs: integer("duration_ms").notNull(),
    mime: text("mime").notNull(),
    audio: bytea("audio").notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [index("recordings_user_week_idx").on(t.userId, t.week)],
);
