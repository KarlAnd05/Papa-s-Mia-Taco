-- Generated from lib/db/src/schema/. Run against an empty PostgreSQL database.
-- Use pnpm db:setup to apply schema updates and seed the restaurant data.

CREATE TABLE "customers" (
	"id" serial PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"email" text,
	"phone" text,
	"address" text,
	"city" text,
	"country" text,
	"date_of_birth" date,
	"gender" text,
	"total_orders" integer DEFAULT 0 NOT NULL,
	"total_spent" numeric(10, 2) DEFAULT '0' NOT NULL,
	"average_order_value" numeric(10, 2) DEFAULT '0' NOT NULL,
	"last_visit_date" timestamp with time zone,
	"first_visit_date" timestamp with time zone,
	"loyalty_points" integer DEFAULT 0 NOT NULL,
	"loyalty_tier" text DEFAULT 'bronze' NOT NULL,
	"status" text DEFAULT 'active' NOT NULL,
	"preferred_contact_method" text,
	"marketing_opt_in" boolean DEFAULT false NOT NULL,
	"notes" text,
	"tags" text[] DEFAULT '{}' NOT NULL,
	"clerk_user_id" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);

CREATE TABLE "admins" (
	"id" serial PRIMARY KEY NOT NULL,
	"clerk_user_id" text NOT NULL,
	"email" text NOT NULL,
	"name" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "admins_clerk_user_id_unique" UNIQUE("clerk_user_id")
);

CREATE TABLE "feedback" (
	"id" serial PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"email" text,
	"phone" text,
	"visit_date" text,
	"items_ordered" text,
	"rating_food" integer NOT NULL,
	"rating_service" integer NOT NULL,
	"rating_atmosphere" integer NOT NULL,
	"rating_value" integer NOT NULL,
	"rating_overall" integer NOT NULL,
	"would_recommend" boolean,
	"comments" text,
	"improvements" text,
	"created_at" timestamp DEFAULT now() NOT NULL
);

CREATE TABLE "order_items" (
	"id" serial PRIMARY KEY NOT NULL,
	"order_id" integer NOT NULL,
	"menu_item_id" integer,
	"item_name" text NOT NULL,
	"item_category" text NOT NULL,
	"quantity" integer NOT NULL,
	"unit_price" numeric(10, 2) NOT NULL,
	"line_total" numeric(10, 2) NOT NULL,
	"options" jsonb DEFAULT '[]'::jsonb NOT NULL
);

CREATE TABLE "orders" (
	"id" serial PRIMARY KEY NOT NULL,
	"customer_id" integer,
	"status" text DEFAULT 'completed' NOT NULL,
	"source" text DEFAULT 'pos' NOT NULL,
	"order_type" text,
	"table_label" text,
	"customer_name" text,
	"customer_phone" text,
	"customer_email" text,
	"delivery_address" text,
	"subtotal" numeric(10, 2),
	"discount_type" text,
	"discount_value" numeric(10, 2),
	"discount_amount" numeric(10, 2) DEFAULT '0' NOT NULL,
	"discount_reason" text,
	"tax_amount" numeric(10, 2) DEFAULT '0' NOT NULL,
	"delivery_fee" numeric(10, 2) DEFAULT '0' NOT NULL,
	"total_amount" numeric(10, 2) NOT NULL,
	"payment_method" text,
	"amount_tendered" numeric(10, 2),
	"tracking_token" text,
	"notes" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"status_updated_at" timestamp with time zone,
	"completed_at" timestamp with time zone
);

CREATE TABLE "menu_items" (
	"id" serial PRIMARY KEY NOT NULL,
	"category" text NOT NULL,
	"sort_order" integer DEFAULT 0 NOT NULL,
	"name" text NOT NULL,
	"description" text,
	"price" numeric(10, 2) NOT NULL,
	"note" text,
	"callout" text,
	"boost" text,
	"is_new" boolean DEFAULT false NOT NULL,
	"is_available" boolean DEFAULT true NOT NULL,
	"options" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);

CREATE TABLE "staff_sessions" (
	"id" serial PRIMARY KEY NOT NULL,
	"token_hash" text NOT NULL,
	"staff_user_id" integer NOT NULL,
	"expires_at" timestamp with time zone NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "staff_sessions_token_hash_unique" UNIQUE("token_hash")
);

CREATE TABLE "staff_users" (
	"id" serial PRIMARY KEY NOT NULL,
	"username" text NOT NULL,
	"display_name" text NOT NULL,
	"password_hash" text NOT NULL,
	"is_active" boolean DEFAULT true NOT NULL,
	"last_login_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "staff_users_username_unique" UNIQUE("username")
);

CREATE TABLE "app_settings" (
	"key" text PRIMARY KEY NOT NULL,
	"value" jsonb NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);

CREATE TABLE "reservation_blocks" (
	"id" serial PRIMARY KEY NOT NULL,
	"date" date NOT NULL,
	"time" text,
	"reason" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);

CREATE TABLE "reservation_slots" (
	"id" serial PRIMARY KEY NOT NULL,
	"day_of_week" integer NOT NULL,
	"time" text NOT NULL,
	"capacity" integer NOT NULL,
	"is_active" boolean DEFAULT true NOT NULL
);

CREATE TABLE "reservations" (
	"id" serial PRIMARY KEY NOT NULL,
	"code" text NOT NULL,
	"access_token" text NOT NULL,
	"date" date NOT NULL,
	"time" text NOT NULL,
	"party_size" integer NOT NULL,
	"name" text NOT NULL,
	"phone" text NOT NULL,
	"email" text,
	"comments" text,
	"status" text DEFAULT 'pending' NOT NULL,
	"admin_note" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "reservations_code_unique" UNIQUE("code"),
	CONSTRAINT "reservations_access_token_unique" UNIQUE("access_token")
);

ALTER TABLE "order_items" ADD CONSTRAINT "order_items_order_id_orders_id_fk" FOREIGN KEY ("order_id") REFERENCES "public"."orders"("id") ON DELETE cascade ON UPDATE no action;
ALTER TABLE "order_items" ADD CONSTRAINT "order_items_menu_item_id_menu_items_id_fk" FOREIGN KEY ("menu_item_id") REFERENCES "public"."menu_items"("id") ON DELETE set null ON UPDATE no action;
ALTER TABLE "orders" ADD CONSTRAINT "orders_customer_id_customers_id_fk" FOREIGN KEY ("customer_id") REFERENCES "public"."customers"("id") ON DELETE set null ON UPDATE no action;
ALTER TABLE "staff_sessions" ADD CONSTRAINT "staff_sessions_staff_user_id_staff_users_id_fk" FOREIGN KEY ("staff_user_id") REFERENCES "public"."staff_users"("id") ON DELETE cascade ON UPDATE no action;
CREATE INDEX "orders_tracking_token_idx" ON "orders" USING btree ("tracking_token");
CREATE INDEX "orders_status_idx" ON "orders" USING btree ("status");
CREATE INDEX "orders_created_at_idx" ON "orders" USING btree ("created_at");
CREATE INDEX "staff_sessions_user_idx" ON "staff_sessions" USING btree ("staff_user_id");
CREATE INDEX "reservation_blocks_date_idx" ON "reservation_blocks" USING btree ("date");
CREATE UNIQUE INDEX "reservation_slots_day_time_uq" ON "reservation_slots" USING btree ("day_of_week","time");
CREATE INDEX "reservations_date_time_idx" ON "reservations" USING btree ("date","time");
CREATE INDEX "reservations_status_idx" ON "reservations" USING btree ("status");
