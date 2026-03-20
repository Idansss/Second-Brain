CREATE TYPE "public"."note_status" AS ENUM('active', 'archived', 'deleted');--> statement-breakpoint
CREATE TYPE "public"."note_type" AS ENUM('text', 'link', 'voice', 'task', 'meeting', 'file', 'highlight');--> statement-breakpoint
CREATE TYPE "public"."entity_type" AS ENUM('person', 'company', 'project', 'topic', 'place');--> statement-breakpoint
CREATE TYPE "public"."task_priority" AS ENUM('low', 'medium', 'high', 'urgent');--> statement-breakpoint
CREATE TYPE "public"."task_status" AS ENUM('todo', 'in_progress', 'done', 'cancelled');--> statement-breakpoint
CREATE TABLE "notes" (
	"id" text PRIMARY KEY NOT NULL,
	"user_id" text NOT NULL,
	"type" "note_type" DEFAULT 'text' NOT NULL,
	"status" "note_status" DEFAULT 'active' NOT NULL,
	"content" text DEFAULT '' NOT NULL,
	"content_markdown" text,
	"source_url" text,
	"source_title" text,
	"metadata" jsonb DEFAULT '{}'::jsonb,
	"embedding" vector(1024),
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "entities" (
	"id" text PRIMARY KEY NOT NULL,
	"user_id" text NOT NULL,
	"type" "entity_type" NOT NULL,
	"name" text NOT NULL,
	"description" text,
	"aliases" jsonb DEFAULT '[]'::jsonb,
	"metadata" jsonb DEFAULT '{}'::jsonb,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "note_entities" (
	"note_id" text NOT NULL,
	"entity_id" text NOT NULL,
	"mentioned_as" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "tasks" (
	"id" text PRIMARY KEY NOT NULL,
	"user_id" text NOT NULL,
	"source_note_id" text,
	"title" text NOT NULL,
	"context" text,
	"status" "task_status" DEFAULT 'todo' NOT NULL,
	"priority" "task_priority" DEFAULT 'medium' NOT NULL,
	"due_date" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "note_tags" (
	"note_id" text NOT NULL,
	"tag_id" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "tags" (
	"id" text PRIMARY KEY NOT NULL,
	"user_id" text NOT NULL,
	"name" text NOT NULL,
	"color" text,
	"auto_generated" boolean DEFAULT false NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "collection_notes" (
	"collection_id" text NOT NULL,
	"note_id" text NOT NULL,
	"added_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "collections" (
	"id" text PRIMARY KEY NOT NULL,
	"user_id" text NOT NULL,
	"name" text NOT NULL,
	"description" text,
	"emoji" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "user_profiles" (
	"id" text PRIMARY KEY NOT NULL,
	"email" text NOT NULL,
	"display_name" text,
	"avatar_url" text,
	"settings" jsonb DEFAULT '{"proactivityLevel":"normal","digestEnabled":true,"digestTime":"08:00","timezone":"UTC","theme":"system"}'::jsonb NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "note_entities" ADD CONSTRAINT "note_entities_note_id_notes_id_fk" FOREIGN KEY ("note_id") REFERENCES "public"."notes"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "note_entities" ADD CONSTRAINT "note_entities_entity_id_entities_id_fk" FOREIGN KEY ("entity_id") REFERENCES "public"."entities"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "tasks" ADD CONSTRAINT "tasks_source_note_id_notes_id_fk" FOREIGN KEY ("source_note_id") REFERENCES "public"."notes"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "note_tags" ADD CONSTRAINT "note_tags_note_id_notes_id_fk" FOREIGN KEY ("note_id") REFERENCES "public"."notes"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "note_tags" ADD CONSTRAINT "note_tags_tag_id_tags_id_fk" FOREIGN KEY ("tag_id") REFERENCES "public"."tags"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "collection_notes" ADD CONSTRAINT "collection_notes_collection_id_collections_id_fk" FOREIGN KEY ("collection_id") REFERENCES "public"."collections"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "collection_notes" ADD CONSTRAINT "collection_notes_note_id_notes_id_fk" FOREIGN KEY ("note_id") REFERENCES "public"."notes"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "notes_embedding_idx" ON "notes" USING hnsw ("embedding" vector_cosine_ops);--> statement-breakpoint
CREATE INDEX "notes_user_status_idx" ON "notes" USING btree ("user_id","status");--> statement-breakpoint
CREATE INDEX "notes_user_created_idx" ON "notes" USING btree ("user_id","created_at");--> statement-breakpoint
CREATE INDEX "entities_user_idx" ON "entities" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "entities_user_type_idx" ON "entities" USING btree ("user_id","type");--> statement-breakpoint
CREATE INDEX "note_entities_note_idx" ON "note_entities" USING btree ("note_id");--> statement-breakpoint
CREATE INDEX "note_entities_entity_idx" ON "note_entities" USING btree ("entity_id");--> statement-breakpoint
CREATE INDEX "tasks_user_status_idx" ON "tasks" USING btree ("user_id","status");--> statement-breakpoint
CREATE INDEX "tasks_user_due_idx" ON "tasks" USING btree ("user_id","due_date");--> statement-breakpoint
CREATE INDEX "note_tags_note_idx" ON "note_tags" USING btree ("note_id");--> statement-breakpoint
CREATE INDEX "note_tags_tag_idx" ON "note_tags" USING btree ("tag_id");--> statement-breakpoint
CREATE INDEX "tags_user_idx" ON "tags" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "collection_notes_collection_idx" ON "collection_notes" USING btree ("collection_id");--> statement-breakpoint
CREATE INDEX "collection_notes_note_idx" ON "collection_notes" USING btree ("note_id");--> statement-breakpoint
CREATE INDEX "collections_user_idx" ON "collections" USING btree ("user_id");