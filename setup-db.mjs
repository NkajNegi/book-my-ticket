import pg from "pg";
import fs from "fs";

const pool = new pg.Pool({
  host: process.env.DB_HOST,
  port: process.env.DB_PORT,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME,
  ssl: process.env.DB_SSL === "true" ? { rejectUnauthorized: false } : false
});

async function runFile(filename) {
  const client = await pool.connect();
  try {
    const sql = fs.readFileSync(filename, "utf8");
    console.log(`Executing ${filename}...`);
    
    await client.query(sql);
    console.log(`✅ Successfully ran ${filename}`);
  } catch (err) {
    console.error(`❌ Error running ${filename}:`, err);
  } finally {
    client.release();
  }
}

async function start() {
  console.log("Starting database initialization...");
  // Run the new, compliant schema and mock data
  await runFile("init.sql");
  await pool.end(); 
}

start();