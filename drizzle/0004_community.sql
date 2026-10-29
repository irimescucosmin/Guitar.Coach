CREATE TABLE "community_songs" (
	"id" text PRIMARY KEY NOT NULL,
	"author_id" text NOT NULL,
	"title" text NOT NULL,
	"kind" text NOT NULL,
	"origin" text NOT NULL,
	"beats_per_bar" integer NOT NULL,
	"pattern" text NOT NULL,
	"sections" jsonb NOT NULL,
	"status" text DEFAULT 'draft' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"published_at" timestamp with time zone
);
--> statement-breakpoint
CREATE TABLE "song_reports" (
	"song_id" text NOT NULL,
	"user_id" text NOT NULL,
	"reason" text NOT NULL,
	"note" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "song_reports_song_id_user_id_pk" PRIMARY KEY("song_id","user_id")
);
--> statement-breakpoint
ALTER TABLE "community_songs" ADD CONSTRAINT "community_songs_author_id_user_id_fk" FOREIGN KEY ("author_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "song_reports" ADD CONSTRAINT "song_reports_song_id_community_songs_id_fk" FOREIGN KEY ("song_id") REFERENCES "public"."community_songs"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "song_reports" ADD CONSTRAINT "song_reports_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "community_songs_status_idx" ON "community_songs" USING btree ("status","published_at");--> statement-breakpoint
CREATE INDEX "community_songs_author_idx" ON "community_songs" USING btree ("author_id");