CREATE TABLE "cities" (
	"id" "smallserial" PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"country_id" integer,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp NOT NULL,
	"deleted_at" timestamp
);
--> statement-breakpoint
CREATE TABLE "contacts" (
	"id" serial PRIMARY KEY NOT NULL,
	"organization_id" integer,
	"full_name" text NOT NULL,
	"title" text NOT NULL,
	"email" text NOT NULL,
	"phone" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp NOT NULL,
	"deleted_at" timestamp,
	CONSTRAINT "contacts_title_unique" UNIQUE("title")
);
--> statement-breakpoint
CREATE TABLE "countries" (
	"id" "smallserial" PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"iso" text NOT NULL,
	"flag" text NOT NULL,
	"currency_id" integer,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp NOT NULL,
	"deleted_at" timestamp,
	CONSTRAINT "countries_iso_unique" UNIQUE("iso")
);
--> statement-breakpoint
CREATE TABLE "currencies" (
	"id" "smallserial" PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"code" text NOT NULL,
	"symbol" text NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp NOT NULL,
	"deleted_at" timestamp,
	CONSTRAINT "currencies_code_unique" UNIQUE("code")
);
--> statement-breakpoint
CREATE TABLE "languages" (
	"id" "smallserial" PRIMARY KEY NOT NULL,
	"country_id" integer,
	"name" text NOT NULL,
	"code" text NOT NULL,
	"native" text NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp NOT NULL,
	"deleted_at" timestamp,
	CONSTRAINT "languages_code_unique" UNIQUE("code")
);
--> statement-breakpoint
CREATE TABLE "locations" (
	"id" "smallserial" PRIMARY KEY NOT NULL,
	"address" text NOT NULL,
	"title" text NOT NULL,
	"city_id" integer NOT NULL,
	"postal_code" text NOT NULL,
	"is_primary" boolean DEFAULT false NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp NOT NULL,
	"deleted_at" timestamp
);
--> statement-breakpoint
CREATE TABLE "organization_locations" (
	"organization_id" integer NOT NULL,
	"location_id" integer NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp NOT NULL,
	"deleted_at" timestamp,
	CONSTRAINT "organization_locations_organization_id_location_id_pk" PRIMARY KEY("organization_id","location_id")
);
--> statement-breakpoint
CREATE TABLE "organization_users" (
	"organization_id" integer NOT NULL,
	"user_id" uuid NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp NOT NULL,
	"deleted_at" timestamp,
	CONSTRAINT "organization_users_organization_id_user_id_pk" PRIMARY KEY("organization_id","user_id")
);
--> statement-breakpoint
CREATE TABLE "organizations" (
	"id" serial PRIMARY KEY NOT NULL,
	"country_id" integer NOT NULL,
	"name" text NOT NULL,
	"phone" text NOT NULL,
	"email" text NOT NULL,
	"url" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp NOT NULL,
	"deleted_at" timestamp,
	CONSTRAINT "organizations_phone_unique" UNIQUE("phone")
);
--> statement-breakpoint
CREATE TABLE "users" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_name" text NOT NULL,
	"email" text NOT NULL,
	"password" text NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp NOT NULL,
	"deleted_at" timestamp,
	CONSTRAINT "users_userName_unique" UNIQUE("user_name"),
	CONSTRAINT "users_email_unique" UNIQUE("email")
);
--> statement-breakpoint
ALTER TABLE "cities" ADD CONSTRAINT "cities_country_id_countries_id_fk" FOREIGN KEY ("country_id") REFERENCES "public"."countries"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "contacts" ADD CONSTRAINT "contacts_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "countries" ADD CONSTRAINT "countries_currency_id_currencies_id_fk" FOREIGN KEY ("currency_id") REFERENCES "public"."currencies"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "languages" ADD CONSTRAINT "languages_country_id_countries_id_fk" FOREIGN KEY ("country_id") REFERENCES "public"."countries"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "locations" ADD CONSTRAINT "locations_city_id_cities_id_fk" FOREIGN KEY ("city_id") REFERENCES "public"."cities"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "organization_locations" ADD CONSTRAINT "organization_locations_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "organization_locations" ADD CONSTRAINT "organization_locations_location_id_locations_id_fk" FOREIGN KEY ("location_id") REFERENCES "public"."locations"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "organization_users" ADD CONSTRAINT "organization_users_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "organization_users" ADD CONSTRAINT "organization_users_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "organizations" ADD CONSTRAINT "organizations_country_id_countries_id_fk" FOREIGN KEY ("country_id") REFERENCES "public"."countries"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "city_created_at_idx" ON "cities" USING btree ("created_at");--> statement-breakpoint
CREATE INDEX "city_name_idx" ON "cities" USING btree ("name");--> statement-breakpoint
CREATE INDEX "organization_created_at_idx" ON "contacts" USING btree ("created_at");--> statement-breakpoint
CREATE INDEX "organization_name_idx" ON "contacts" USING btree ("full_name");--> statement-breakpoint
CREATE INDEX "organization_phone_idx" ON "contacts" USING btree ("phone");--> statement-breakpoint
CREATE INDEX "organization_email_idx" ON "contacts" USING btree ("email");--> statement-breakpoint
CREATE INDEX "country_created_at_idx" ON "countries" USING btree ("created_at");--> statement-breakpoint
CREATE INDEX "country_name_idx" ON "countries" USING btree ("name");--> statement-breakpoint
CREATE INDEX "country_iso_idx" ON "countries" USING btree ("iso");--> statement-breakpoint
CREATE INDEX "currency_created_at_idx" ON "currencies" USING btree ("created_at");--> statement-breakpoint
CREATE INDEX "currency_name_idx" ON "currencies" USING btree ("name");--> statement-breakpoint
CREATE INDEX "currency_code_idx" ON "currencies" USING btree ("code");--> statement-breakpoint
CREATE INDEX "language_created_at_idx" ON "languages" USING btree ("created_at");--> statement-breakpoint
CREATE INDEX "language_name_idx" ON "languages" USING btree ("name");--> statement-breakpoint
CREATE INDEX "language_code_idx" ON "languages" USING btree ("code");--> statement-breakpoint
CREATE INDEX "language_native_idx" ON "languages" USING btree ("native");--> statement-breakpoint
CREATE INDEX "locations_is_primary_idx" ON "locations" USING btree ("is_primary");--> statement-breakpoint
CREATE INDEX "locations_postal_code_idx" ON "locations" USING btree ("postal_code");--> statement-breakpoint
CREATE INDEX "entity_created_at_idx" ON "organizations" USING btree ("created_at");--> statement-breakpoint
CREATE INDEX "entity_name_idx" ON "organizations" USING btree ("name");--> statement-breakpoint
CREATE INDEX "entity_phone_idx" ON "organizations" USING btree ("phone");--> statement-breakpoint
CREATE INDEX "entity_email_idx" ON "organizations" USING btree ("email");--> statement-breakpoint
CREATE INDEX "users_created_at_idx" ON "users" USING btree ("created_at");