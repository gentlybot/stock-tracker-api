import { Router, Response } from "express";
import { z } from "zod";
import { eq, and, sql } from "drizzle-orm";
import { db } from "../db/pool";
import { stocks, portfolioStocks } from "../db/schema";
import { authenticate, AuthRequest } from "../middleware/auth";

const router = Router();

const addStockSchema = z.object({
  symbol: z.string().min(1).max(10),
});

// Get user's portfolio
router.get("/", authenticate, async (req: AuthRequest, res: Response) => {
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
        added_at: portfolioStocks.addedAt,
      })
      .from(portfolioStocks)
      .innerJoin(stocks, eq(stocks.id, portfolioStocks.stockId))
      .where(eq(portfolioStocks.userId, req.userId!))
      .orderBy(sql`${portfolioStocks.addedAt} DESC`);

    // Compute simple portfolio summary
    const totalValue = result.reduce(
      (sum, r) => sum + parseFloat(r.current_price),
      0
    );
    const totalDailyChange = result.reduce(
      (sum, r) => sum + parseFloat(r.daily_change),
      0
    );

    res.json({
      stocks: result,
      summary: {
        total_stocks: result.length,
        total_value: Math.round(totalValue * 100) / 100,
        total_daily_change: Math.round(totalDailyChange * 100) / 100,
      },
    });
  } catch (err) {
    console.error("Portfolio fetch error:", err);
    res.status(500).json({ error: "Internal server error" });
  }
});

// Add stock to portfolio
router.post("/stocks", authenticate, async (req: AuthRequest, res: Response) => {
  const parsed = addStockSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: "Invalid request", details: parsed.error.flatten() });
    return;
  }

  const { symbol } = parsed.data;

  try {
    // Find the stock
    const [stock] = await db
      .select({ id: stocks.id, symbol: stocks.symbol, name: stocks.name })
      .from(stocks)
      .where(eq(sql`UPPER(${stocks.symbol})`, symbol.toUpperCase()))
      .limit(1);

    if (!stock) {
      res.status(404).json({ error: "Stock not found" });
      return;
    }

    // Check if already in portfolio
    const [existing] = await db
      .select({ id: portfolioStocks.id })
      .from(portfolioStocks)
      .where(
        and(
          eq(portfolioStocks.userId, req.userId!),
          eq(portfolioStocks.stockId, stock.id)
        )
      )
      .limit(1);

    if (existing) {
      res.status(409).json({ error: "Stock already in portfolio" });
      return;
    }

    await db
      .insert(portfolioStocks)
      .values({ userId: req.userId!, stockId: stock.id });

    res.status(201).json({ message: "Stock added to portfolio", stock: { symbol: stock.symbol, name: stock.name } });
  } catch (err) {
    console.error("Add to portfolio error:", err);
    res.status(500).json({ error: "Internal server error" });
  }
});

// Remove stock from portfolio
router.delete("/stocks/:symbol", authenticate, async (req: AuthRequest, res: Response) => {
  const { symbol } = req.params;

  try {
    // Find the stock first
    const [stock] = await db
      .select({ id: stocks.id })
      .from(stocks)
      .where(eq(sql`UPPER(${stocks.symbol})`, symbol.toUpperCase()))
      .limit(1);

    if (!stock) {
      res.status(404).json({ error: "Stock not found in portfolio" });
      return;
    }

    const deleted = await db
      .delete(portfolioStocks)
      .where(
        and(
          eq(portfolioStocks.userId, req.userId!),
          eq(portfolioStocks.stockId, stock.id)
        )
      )
      .returning({ id: portfolioStocks.id });

    if (deleted.length === 0) {
      res.status(404).json({ error: "Stock not found in portfolio" });
      return;
    }

    res.json({ message: "Stock removed from portfolio" });
  } catch (err) {
    console.error("Remove from portfolio error:", err);
    res.status(500).json({ error: "Internal server error" });
  }
});

export default router;
