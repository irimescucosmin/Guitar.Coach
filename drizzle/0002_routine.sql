CREATE TABLE "change_tests" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" text NOT NULL,
	"pair" text NOT NULL,
	"count" integer NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "routine_log" (
	"user_id" text NOT NULL,
	"day" text NOT NULL,
	"block" text NOT NULL,
	"done_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "routine_log_user_id_day_block_pk" PRIMARY KEY("user_id","day","block")
);
--> statement-breakpoint
ALTER TABLE "change_tests" ADD CONSTRAINT "change_tests_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "routine_log" ADD CONSTRAINT "routine_log_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "change_tests_user_pair_idx" ON "change_tests" USING btree ("user_id","pair");