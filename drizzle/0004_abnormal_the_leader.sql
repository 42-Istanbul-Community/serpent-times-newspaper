CREATE TYPE "public"."edition_kind" AS ENUM('assembled', 'pdf');--> statement-breakpoint
ALTER TABLE "newspaper_edition" ADD COLUMN "kind" "edition_kind" DEFAULT 'assembled' NOT NULL;