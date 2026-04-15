import pg from "pg";
import fs from "fs";

const pool = new pg.Pool({
  host: "localhost",
  port: 5433,
  user: "postgres",
  password: "postgres",
  database: "sql_class_2_db",
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