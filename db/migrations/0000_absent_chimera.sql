CREATE TABLE "ai_attributes" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"key" text NOT NULL,
	"value" text NOT NULL
);
--> statement-breakpoint
CREATE TABLE "ai_chat_session" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"messages" jsonb NOT NULL,
	"history" jsonb NOT NULL,
	"quick_replies" jsonb NOT NULL,
	"is_final" boolean DEFAULT false NOT NULL,
	"todo_actions" jsonb NOT NULL,
	"category_suggestions" jsonb NOT NULL
);
--> statement-breakpoint
CREATE TABLE "ai_log" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"timestamp" timestamp with time zone DEFAULT now() NOT NULL,
	"context" text NOT NULL,
	"advice" text NOT NULL
);
--> statement-breakpoint
CREATE TABLE "ai_memory" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"type" text NOT NULL,
	"content" text NOT NULL,
	"category" text DEFAULT '' NOT NULL,
	"subcategory" text DEFAULT '' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "budgets" (
	"category" text PRIMARY KEY NOT NULL,
	"monthly_budget" integer NOT NULL
);
--> statement-breakpoint
CREATE TABLE "categories" (
	"category" text NOT NULL,
	"subcategory" text NOT NULL,
	"cost_type" text DEFAULT 'variable' NOT NULL,
	CONSTRAINT "categories_category_subcategory_pk" PRIMARY KEY("category","subcategory")
);
--> statement-breakpoint
CREATE TABLE "decisions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"changed_at" timestamp with time zone DEFAULT now() NOT NULL,
	"source" text NOT NULL,
	"type" text NOT NULL,
	"target" text DEFAULT '' NOT NULL,
	"before_amount" integer,
	"after_amount" integer NOT NULL,
	"reason" text DEFAULT '' NOT NULL
);
--> statement-breakpoint
CREATE TABLE "goals" (
	"key" text PRIMARY KEY NOT NULL,
	"value" text DEFAULT '' NOT NULL
);
--> statement-breakpoint
CREATE TABLE "raw_data" (
	"id" text PRIMARY KEY NOT NULL,
	"date" date NOT NULL,
	"content" text NOT NULL,
	"amount" integer NOT NULL,
	"institution" text NOT NULL,
	"category" text DEFAULT '' NOT NULL,
	"subcategory" text DEFAULT '' NOT NULL,
	"memo" text DEFAULT '' NOT NULL,
	"is_transfer" boolean DEFAULT false NOT NULL,
	"is_target" boolean DEFAULT true NOT NULL,
	"imported_at" timestamp with time zone NOT NULL,
	"updated_at" timestamp with time zone NOT NULL,
	"category_locked" boolean DEFAULT false NOT NULL
);
--> statement-breakpoint
CREATE TABLE "settings" (
	"key" text PRIMARY KEY NOT NULL,
	"value" text DEFAULT '' NOT NULL
);
