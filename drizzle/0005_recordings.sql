CREATE TABLE "recordings" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" text NOT NULL,
	"song_id" text NOT NULL,
	"mode" text NOT NULL,
	"share" real,
	"week" text NOT NULL,
	"day" text NOT NULL,
	"duration_ms" integer NOT NULL,
	"mime" text NOT NULL,
	"audio" "bytea" NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "recordings" ADD CONSTRAINT "recordings_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "recordings_user_week_idx" ON "recordings" USING btree ("user_id","week");