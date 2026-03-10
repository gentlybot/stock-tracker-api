import bcrypt from "bcryptjs";
import { eq } from "drizzle-orm";
import { db, pool } from "./pool";
import { users, stocks, portfolioStocks, stockPriceHistory } from "./schema";
import { sql } from "drizzle-orm";

const STOCKS = [
  { symbol: "AAPL", name: "Apple Inc.", sector: "Technology", basePrice: 178 },
  { symbol: "MSFT", name: "Microsoft Corp.", sector: "Technology", basePrice: 415 },
  { symbol: "GOOGL", name: "Alphabet Inc.", sector: "Technology", basePrice: 155 },
  { symbol: "AMZN", name: "Amazon.com Inc.", sector: "Consumer Cyclical", basePrice: 185 },
  { symbol: "TSLA", name: "Tesla Inc.", sector: "Automotive", basePrice: 245 },
  { symbol: "NVDA", name: "NVIDIA Corp.", sector: "Technology", basePrice: 875 },
  { symbol: "META", name: "Meta Platforms Inc.", sector: "Technology", basePrice: 505 },
  { symbol: "JPM", name: "JPMorgan Chase & Co.", sector: "Financial Services", basePrice: 198 },
  { symbol: "V", name: "Visa Inc.", sector: "Financial Services", basePrice: 280 },
  { symbol: "JNJ", name: "Johnson & Johnson", sector: "Healthcare", basePrice: 156 },
  { symbol: "WMT", name: "Walmart Inc.", sector: "Consumer Defensive", basePrice: 168 },
  { symbol: "PG", name: "Procter & Gamble Co.", sector: "Consumer Defensive", basePrice: 162 },
  { symbol: "XOM", name: "Exxon Mobil Corp.", sector: "Energy", basePrice: 104 },
  { symbol: "UNH", name: "UnitedHealth Group Inc.", sector: "Healthcare", basePrice: 525 },
  { symbol: "HD", name: "Home Depot Inc.", sector: "Consumer Cyclical", basePrice: 345 },
  { symbol: "DIS", name: "Walt Disney Co.", sector: "Communication Services", basePrice: 112 },
  { symbol: "NFLX", name: "Netflix Inc.", sector: "Communication Services", basePrice: 630 },
  { symbol: "PYPL", name: "PayPal Holdings Inc.", sector: "Financial Services", basePrice: 63 },
  { symbol: "INTC", name: "Intel Corp.", sector: "Technology", basePrice: 42 },
  { symbol: "AMD", name: "Advanced Micro Devices Inc.", sector: "Technology", basePrice: 165 },
];

function randomBetween(min: number, max: number): number {
  return min + Math.random() * (max - min);
}

function roundTo(n: number, decimals: number): number {
  const factor = Math.pow(10, decimals);
  return Math.round(n * factor) / factor;
}

function generatePriceHistory(basePrice: number, days: number) {
  const history: Array<{
    date: string;
    open: number;
    high: number;
    low: number;
    close: number;
    volume: number;
  }> = [];

  let price = basePrice * randomBetween(0.85, 1.0);

  for (let i = days; i >= 1; i--) {
    const date = new Date();
    date.setDate(date.getDate() - i);
    const dateStr = date.toISOString().split("T")[0];

    const dailyChange = randomBetween(-0.04, 0.045);
    const open = roundTo(price, 2);
    const close = roundTo(price * (1 + dailyChange), 2);
    const high = roundTo(Math.max(open, close) * randomBetween(1.001, 1.025), 2);
    const low = roundTo(Math.min(open, close) * randomBetween(0.975, 0.999), 2);
    const volume = Math.floor(randomBetween(5_000_000, 80_000_000));

    history.push({ date: dateStr, open, high, low, close, volume });
    price = close;
  }

  return history;
}

async function seed() {
  try {
    // Apply schema (create tables if they don't exist) using drizzle-kit push via SQL
    // We use raw SQL CREATE TABLE IF NOT EXISTS for idempotent table creation
    await db.execute(sql`
      CREATE TABLE IF NOT EXISTS users (
        id SERIAL PRIMARY KEY,
        email VARCHAR(255) UNIQUE NOT NULL,
        password_hash VARCHAR(255) NOT NULL,
        name VARCHAR(255) NOT NULL,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
      )
    `);
    await db.execute(sql`
      CREATE TABLE IF NOT EXISTS stocks (
        id SERIAL PRIMARY KEY,
        symbol VARCHAR(10) UNIQUE NOT NULL,
        name VARCHAR(255) NOT NULL,
        sector VARCHAR(100) NOT NULL,
        current_price NUMERIC(12, 2) NOT NULL,
        daily_change NUMERIC(12, 2) NOT NULL,
        daily_change_percent NUMERIC(8, 4) NOT NULL,
        market_cap BIGINT NOT NULL,
        volume BIGINT NOT NULL,
        updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
      )
    `);
    await db.execute(sql`
      CREATE TABLE IF NOT EXISTS portfolio_stocks (
        id SERIAL PRIMARY KEY,
        user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        stock_id INTEGER NOT NULL REFERENCES stocks(id) ON DELETE CASCADE,
        added_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
        UNIQUE(user_id, stock_id)
      )
    `);
    await db.execute(sql`
      CREATE TABLE IF NOT EXISTS stock_price_history (
        id SERIAL PRIMARY KEY,
        stock_id INTEGER NOT NULL REFERENCES stocks(id) ON DELETE CASCADE,
        date DATE NOT NULL,
        open NUMERIC(12, 2) NOT NULL,
        high NUMERIC(12, 2) NOT NULL,
        low NUMERIC(12, 2) NOT NULL,
        close NUMERIC(12, 2) NOT NULL,
        volume BIGINT NOT NULL,
        UNIQUE(stock_id, date)
      )
    `);

    console.log("Tables ensured.");

    // Seed demo user (idempotent)
    const existingUser = await db
      .select()
      .from(users)
      .where(eq(users.email, "demo@example.com"))
      .limit(1);

    let userId: number;
    if (existingUser.length > 0) {
      userId = existingUser[0].id;
      console.log(`User already exists: demo@example.com (id: ${userId})`);
    } else {
      const passwordHash = await bcrypt.hash("D3m0$tock!2025", 10);
      const [newUser] = await db
        .insert(users)
        .values({ email: "demo@example.com", passwordHash: passwordHash, name: "Demo User" })
        .returning({ id: users.id });
      userId = newUser.id;
      console.log(`Created user: demo@example.com (id: ${userId})`);
    }

    // Seed stocks (idempotent via onConflictDoNothing)
    for (const stock of STOCKS) {
      // Check if stock already exists
      const existingStock = await db
        .select()
        .from(stocks)
        .where(eq(stocks.symbol, stock.symbol))
        .limit(1);

      if (existingStock.length > 0) {
        console.log(`Stock already exists: ${stock.symbol} (id: ${existingStock[0].id})`);
        continue;
      }

      const history = generatePriceHistory(stock.basePrice, 30);
      const latestClose = history[history.length - 1].close;
      const prevClose = history[history.length - 2].close;
      const dailyChange = roundTo(latestClose - prevClose, 2);
      const dailyChangePercent = roundTo((dailyChange / prevClose) * 100, 4);
      const marketCap = Math.floor(latestClose * randomBetween(1_000_000_000, 15_000_000_000));
      const volume = history[history.length - 1].volume;

      const [inserted] = await db
        .insert(stocks)
        .values({
          symbol: stock.symbol,
          name: stock.name,
          sector: stock.sector,
          currentPrice: latestClose.toString(),
          dailyChange: dailyChange.toString(),
          dailyChangePercent: dailyChangePercent.toString(),
          marketCap: marketCap,
          volume: volume,
        })
        .returning({ id: stocks.id });

      // Insert price history (onConflictDoNothing for idempotency)
      for (const day of history) {
        await db
          .insert(stockPriceHistory)
          .values({
            stockId: inserted.id,
            date: day.date,
            open: day.open.toString(),
            high: day.high.toString(),
            low: day.low.toString(),
            close: day.close.toString(),
            volume: day.volume,
          })
          .onConflictDoNothing();
      }

      console.log(`Seeded stock: ${stock.symbol} (id: ${inserted.id}, price: $${latestClose})`);
    }

    // Add 3 stocks to user's portfolio (idempotent via onConflictDoNothing)
    const portfolioSymbols = ["AAPL", "NVDA", "GOOGL"];
    for (const symbol of portfolioSymbols) {
      const [stock] = await db
        .select({ id: stocks.id })
        .from(stocks)
        .where(eq(stocks.symbol, symbol))
        .limit(1);

      if (stock) {
        await db
          .insert(portfolioStocks)
          .values({ userId, stockId: stock.id })
          .onConflictDoNothing();
        console.log(`Ensured ${symbol} in portfolio`);
      }
    }

    console.log("\nSeed complete!");
    console.log("Login: demo@example.com / D3m0$tock!2025");
  } finally {
    await pool.end();
  }
}

seed().catch((err) => {
  console.error("Seed failed:", err);
  process.exit(1);
});
