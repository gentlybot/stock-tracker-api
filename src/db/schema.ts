import {
  pgTable,
  serial,
  varchar,
  numeric,
  bigint,
  integer,
  timestamp,
  date,
  unique,
} from "drizzle-orm/pg-core";

export const users = pgTable("users", {
  id: serial("id").primaryKey(),
  email: varchar("email", { length: 255 }).unique().notNull(),
  passwordHash: varchar("password_hash", { length: 255 }).notNull(),
  name: varchar("name", { length: 255 }).notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow(),
});

export const stocks = pgTable("stocks", {
  id: serial("id").primaryKey(),
  symbol: varchar("symbol", { length: 10 }).unique().notNull(),
  name: varchar("name", { length: 255 }).notNull(),
  sector: varchar("sector", { length: 100 }).notNull(),
  currentPrice: numeric("current_price", { precision: 12, scale: 2 }).notNull(),
  dailyChange: numeric("daily_change", { precision: 12, scale: 2 }).notNull(),
  dailyChangePercent: numeric("daily_change_percent", { precision: 8, scale: 4 }).notNull(),
  marketCap: bigint("market_cap", { mode: "number" }).notNull(),
  volume: bigint("volume", { mode: "number" }).notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow(),
});

export const portfolioStocks = pgTable(
  "portfolio_stocks",
  {
    id: serial("id").primaryKey(),
    userId: integer("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    stockId: integer("stock_id")
      .notNull()
      .references(() => stocks.id, { onDelete: "cascade" }),
    addedAt: timestamp("added_at", { withTimezone: true }).defaultNow(),
  },
  (table) => [unique().on(table.userId, table.stockId)]
);

export const stockPriceHistory = pgTable(
  "stock_price_history",
  {
    id: serial("id").primaryKey(),
    stockId: integer("stock_id")
      .notNull()
      .references(() => stocks.id, { onDelete: "cascade" }),
    date: date("date").notNull(),
    open: numeric("open", { precision: 12, scale: 2 }).notNull(),
    high: numeric("high", { precision: 12, scale: 2 }).notNull(),
    low: numeric("low", { precision: 12, scale: 2 }).notNull(),
    close: numeric("close", { precision: 12, scale: 2 }).notNull(),
    volume: bigint("volume", { mode: "number" }).notNull(),
  },
  (table) => [unique().on(table.stockId, table.date)]
);
