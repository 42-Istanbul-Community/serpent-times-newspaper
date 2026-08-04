CREATE TYPE "public"."element_fill_mode" AS ENUM('auto', 'manual');--> statement-breakpoint
CREATE TYPE "public"."page_template_availability" AS ENUM('draft', 'used', 'unused');--> statement-breakpoint
CREATE TYPE "public"."page_template_category" AS ENUM('cover', 'page', 'index', 'citation');--> statement-breakpoint
CREATE TYPE "public"."publication_status" AS ENUM('draft', 'published');--> statement-breakpoint
CREATE TABLE "article" (
	"id" serial PRIMARY KEY NOT NULL,
	"user_id" text NOT NULL,
	"title" text NOT NULL,
	"category" "page_template_category" DEFAULT 'page' NOT NULL,
	"status" "publication_status" DEFAULT 'draft' NOT NULL,
	"cdn_url" text,
	"pages" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "newspaper_edition" (
	"id" serial PRIMARY KEY NOT NULL,
	"user_id" text NOT NULL,
	"title" text NOT NULL,
	"cover_article_id" integer,
	"index_article_ids" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"citation_article_ids" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"article_ids" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"status" "publication_status" DEFAULT 'draft' NOT NULL,
	"cdn_url" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "page_template" (
	"id" serial PRIMARY KEY NOT NULL,
	"user_id" text NOT NULL,
	"title" text NOT NULL,
	"description" text,
	"category" "page_template_category" NOT NULL,
	"availability" "page_template_availability" DEFAULT 'draft' NOT NULL,
	"cdn_url" text,
	"elements" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "newspaper_edition" ADD CONSTRAINT "newspaper_edition_cover_article_id_article_id_fk" FOREIGN KEY ("cover_article_id") REFERENCES "public"."article"("id") ON DELETE no action ON UPDATE no action;