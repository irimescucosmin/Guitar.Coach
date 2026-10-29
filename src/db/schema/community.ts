import { index, integer, jsonb, pgTable, primaryKey, text, timestamp } from "drizzle-orm/pg-core";
import { user } from "./auth";

/**
 * Songs published by players: chords and structure only, like the catalogue.
 * A song is "draft" until its author passes it in time, "published" after,
 * "hidden" when a report is upheld. Rows are never deleted: a hidden song
 * keeps its results and reports.
 */
export const communitySongs = pgTable(
  "community_songs",
  {
    /** "c-" plus a random id, so results can tell it from the catalogue. */
    id: text("id").primaryKey(),
    authorId: text("author_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    title: text("title").notNull(),
    kind: text("kind", { enum: ["traditional", "chordsOnly"] }).notNull(),
    origin: text("origin").notNull(),
    beatsPerBar: integer("beats_per_bar").notNull(),
    pattern: text("pattern").notNull(),
    sections: jsonb("sections").notNull(),
    status: text("status", { enum: ["draft", "published", "hidden"] }).notNull().default("draft"),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    publishedAt: timestamp("published_at", { withTimezone: true }),
  },
  (t) => [index("community_songs_status_idx").on(t.status, t.publishedAt), index("community_songs_author_idx").on(t.authorId)],
);

/** One report per player per song; the reason is a fixed choice, with an optional line. */
export const songReports = pgTable(
  "song_reports",
  {
    songId: text("song_id")
      .notNull()
      .references(() => communitySongs.id, { onDelete: "cascade" }),
    userId: text("user_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    reason: text("reason", { enum: ["lyrics", "wrong", "offensive", "other"] }).notNull(),
    note: text("note"),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [primaryKey({ columns: [t.songId, t.userId] })],
);
