import { Router, Request, Response } from "express";
import { z } from "zod";
import { eq, or, ilike, asc, sql } from "drizzle-orm";
import { db } from "../db/pool";
import { stocks, stockPriceHistory } from "../db/schema";
import { authenticate } from "../middleware/auth";

const router = Router();

const searchSchema = z.object({
  q: z.string().min(1),
});

// Search stocks - requires auth
router.get("/search", authenticate, async (req: Request, res: Response) => {
  const parsed = searchSchema.safeParse(req.query);
  if (!parsed.success) {
    res.status(400).json({ error: "Query parameter 'q' is required" });
    return;
  }

  const { q } = parsed.data;
  const term = `%${q}%`;

  try {
    const result = await db
      .select({
        id: stocks.id,
        symbol: stocks.symbol,
        name: stocks.name,
        sector: stocks.sector,
        current_price: stocks.currentPrice,
        daily_change: stocks.dailyChange,
        daily_change_percent: stocks.dailyChangePercent,
        market_cap: stocks.marketCap,
        volume: stocks.volume,
      })
      .from(stocks)
      .where(
        or(
          ilike(stocks.symbol, term),
          ilike(stocks.name, term)
        )
      )
      .orderBy(stocks.symbol)
      .limit(20);

    res.json({ stocks: result });
  } catch (err) {
    console.error("Search error:", err);
    res.status(500).json({ error: "Internal server error" });
  }
});

// Get stock detail with price history
router.get("/:symbol", authenticate, async (req: Request, res: Response) => {
  const { symbol } = req.params;

  try {
    const [stock] = await db
      .select({
        id: stocks.id,
        symbol: stocks.symbol,
        name: stocks.name,
        sector: stocks.sector,
        current_price: stocks.currentPrice,
        daily_change: stocks.dailyChange,
        daily_change_percent: stocks.dailyChangePercent,
        market_cap: stocks.marketCap,
        volume: stocks.volume,
        updated_at: stocks.updatedAt,
      })
      .from(stocks)
      .where(eq(sql`UPPER(${stocks.symbol})`, symbol.toUpperCase()))
      .limit(1);

    if (!stock) {
      res.status(404).json({ error: "Stock not found" });
      return;
    }

    const history = await db
      .select({
        date: stockPriceHistory.date,
        open: stockPriceHistory.open,
        high: stockPriceHistory.high,
        low: stockPriceHistory.low,
        close: stockPriceHistory.close,
        volume: stockPriceHistory.volume,
      })
      .from(stockPriceHistory)
      .where(eq(stockPriceHistory.stockId, stock.id))
      .orderBy(asc(stockPriceHistory.date));

    // Compute some basic stats from history
    const prices = history.map((r) => parseFloat(r.close));
    const high52w = Math.max(...prices);
    const low52w = Math.min(...prices);
    const avgVolume = Math.round(
      history.reduce((sum, r) => sum + r.volume, 0) / history.length
    );

    res.json({
      stock: {
        ...stock,
        high_52w: high52w,
        low_52w: low52w,
        avg_volume: avgVolume,
      },
      price_history: history,
    });
  } catch (err) {
    console.error("Stock detail error:", err);
    res.status(500).json({ error: "Internal server error" });
  }
});

export default router;
