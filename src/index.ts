import express from "express";
import cors from "cors";
import dotenv from "dotenv";

dotenv.config();

import authRoutes from "./routes/auth";
import stocksRoutes from "./routes/stocks";
import portfolioRoutes from "./routes/portfolio";

const app = express();
const PORT = parseInt(process.env.PORT || "3001", 10);

app.use(cors());
app.use(express.json());

// Routes
app.use("/api/auth", authRoutes);
app.use("/api/stocks", stocksRoutes);
app.use("/api/portfolio", portfolioRoutes);

// Health check
app.get("/api/health", (_req, res) => {
  res.json({ status: "ok" });
});

app.listen(PORT, () => {
  console.log(`Stock Tracker API running on http://localhost:${PORT}`);
});

export default app;
