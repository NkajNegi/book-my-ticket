import pg from "pg";
import fs from "fs";
import dotenv from "dotenv";


dotenv.config();

const connectionString = process.env.DATABASE_URL;

const pool = new pg.Pool({
 
  connectionString: connectionString,
  
 
  host: connectionString ? undefined : (process.env.DB_HOST || "localhost"),
  port: connectionString ? undefined : (process.env.DB_PORT || 5432),
  user: connectionString ? undefined : (process.env.DB_USER || "postgres"),
  password: connectionString ? undefined : (process.env.DB_PASSWORD || "postgres"),
  database: connectionString ? undefined : (process.env.DB_NAME || "sql_class_2_db"),
  

  ssl: connectionString ? { rejectUnauthorized: false } : false
});

async function runFile(filename) {
  let client;
  try {
    client = await pool.connect();
    const sql = fs.readFileSync(filename, "utf8");
    console.log(`Executing ${filename}...`);
    
    await client.query(sql);
    console.log(`Successfully ran ${filename}`);
  } catch (err) {
    console.error(`Error running ${filename}:`, err);

    process.exit(1); 
  } finally {
    if (client) client.release();
  }
}

async function start() {
  console.log("Starting database initialization...");
  

  if (fs.existsSync("init.sql")) {
    await runFile("init.sql");
  } else {
    console.error("init.sql file not found!");
    process.exit(1);
  }
  
  await pool.end();
  console.log("Database setup complete. Handing over to application...");
}

start();