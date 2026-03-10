CREATE TABLE "portfolio_stocks" (
	"id" serial PRIMARY KEY NOT NULL,
	"user_id" integer NOT NULL,
	"stock_id" integer NOT NULL,
	"added_at" timestamp with time zone DEFAULT now(),
	CONSTRAINT "portfolio_stocks_user_id_stock_id_unique" UNIQUE("user_id","stock_id")
);
--> statement-breakpoint
CREATE TABLE "stock_price_history" (
	"id" serial PRIMARY KEY NOT NULL,
	"stock_id" integer NOT NULL,
	"date" date NOT NULL,
	"open" numeric(12, 2) NOT NULL,
	"high" numeric(12, 2) NOT NULL,
	"low" numeric(12, 2) NOT NULL,
	"close" numeric(12, 2) NOT NULL,
	"volume" bigint NOT NULL,
	CONSTRAINT "stock_price_history_stock_id_date_unique" UNIQUE("stock_id","date")
);
--> statement-breakpoint
CREATE TABLE "stocks" (
	"id" serial PRIMARY KEY NOT NULL,
	"symbol" varchar(10) NOT NULL,
	"name" varchar(255) NOT NULL,
	"sector" varchar(100) NOT NULL,
	"current_price" numeric(12, 2) NOT NULL,
	"daily_change" numeric(12, 2) NOT NULL,
	"daily_change_percent" numeric(8, 4) NOT NULL,
	"market_cap" bigint NOT NULL,
	"volume" bigint NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now(),
	CONSTRAINT "stocks_symbol_unique" UNIQUE("symbol")
);
--> statement-breakpoint
CREATE TABLE "users" (
	"id" serial PRIMARY KEY NOT NULL,
	"email" varchar(255) NOT NULL,
	"password_hash" varchar(255) NOT NULL,
	"name" varchar(255) NOT NULL,
	"created_at" timestamp with time zone DEFAULT now(),
	CONSTRAINT "users_email_unique" UNIQUE("email")
);
--> statement-breakpoint
ALTER TABLE "portfolio_stocks" ADD CONSTRAINT "portfolio_stocks_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "portfolio_stocks" ADD CONSTRAINT "portfolio_stocks_stock_id_stocks_id_fk" FOREIGN KEY ("stock_id") REFERENCES "public"."stocks"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "stock_price_history" ADD CONSTRAINT "stock_price_history_stock_id_stocks_id_fk" FOREIGN KEY ("stock_id") REFERENCES "public"."stocks"("id") ON DELETE cascade ON UPDATE no action;