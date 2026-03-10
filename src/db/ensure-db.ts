import { Pool } from "pg";
import dotenv from "dotenv";

dotenv.config();

const databaseUrl = process.env.DATABASE_URL!;
const url = new URL(databaseUrl);
const dbName = url.pathname.slice(1); // remove leading /

// Connect to the default 'postgres' database to check/create the target DB
url.pathname = "/postgres";

async function ensureDatabase() {
  const adminPool = new Pool({ connectionString: url.toString() });

  try {
    const result = await adminPool.query(
      "SELECT 1 FROM pg_database WHERE datname = $1",
      [dbName]
    );

    if (result.rows.length === 0) {
      // Database names can't be parameterized, but this comes from our own .env
      await adminPool.query(`CREATE DATABASE "${dbName}"`);
      console.log(`Created database: ${dbName}`);
    } else {
      console.log(`Database already exists: ${dbName}`);
    }
  } finally {
    await adminPool.end();
  }
}

ensureDatabase().catch((err) => {
  console.error("Failed to ensure database:", err);
  process.exit(1);
});
