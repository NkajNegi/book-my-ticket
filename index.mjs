//  CREATE TABLE seats (
//      id SERIAL PRIMARY KEY,
//      name VARCHAR(255),
//      isbooked INT DEFAULT 0
//  );
// INSERT INTO seats (isbooked)
// SELECT 0 FROM generate_series(1, 20);

//mine
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import dotenv from "dotenv";

dotenv.config();
const JWT_SECRET = process.env.JWT_SECRET || "development_secret_key_123";
//mine

import express from "express";
import pg from "pg";
import { dirname } from "path";
import { fileURLToPath } from "url";
import cors from "cors";

const __dirname = dirname(fileURLToPath(import.meta.url));

// Set the server port, defaulting to 8080
const port = process.env.PORT || 8080;

// Equivalent to mongoose connection
// Pool is nothing but group of connections
// If you pick one connection out of the pool and release it
// the pooler will keep that connection open for sometime to other clients to reuse
// index.mjs

// index.mjs

const connectionString = process.env.DATABASE_URL;

const pool = new pg.Pool({
  // Use connectionString if it exists (Production),
  // otherwise fallback to individual fields (Local)
  connectionString: connectionString,

  // Local fallback settings
  host: process.env.DB_HOST || "localhost",
  port: process.env.DB_PORT || 5432,
  user: process.env.DB_USER || "postgres",
  password: process.env.DB_PASSWORD || "postgres",
  database: process.env.DB_NAME || "sql_class_2_db",

  max: 20,
  connectionTimeoutMillis: 5000,
  idleTimeoutMillis: 30000,

  // Render PostgreSQL requires SSL for external connections.
  ssl: connectionString ? { rejectUnauthorized: false } : false,
});

// Initialize Express application
const app = new express();
// Enable Cross-Origin Resource Sharing (CORS)
app.use(cors());

//mine
// Required to parse JSON bodies from the frontend login/register forms
app.use(express.json());

// JWT Authentication Middleware
const authenticateToken = (req, res, next) => {
  const authHeader = req.headers["authorization"];
  const token = authHeader && authHeader.split(" ")[1];

  if (token == null) return res.sendStatus(401); // No token present

  jwt.verify(token, JWT_SECRET, (err, user) => {
    if (err) return res.sendStatus(403); // Token invalid or expired
    req.user = user; // Attach payload to request
    next();
  });
};

// --- AUTHENTICATION ENDPOINTS ---

// Register a new user
app.post("/api/auth/register", async (req, res) => {
  try {
    const { email, password } = req.body;
    if (!email || !password)
      return res.status(400).json({ error: "Missing required fields" });

    // Hash the password before storing it for security
    const hashedPassword = await bcrypt.hash(password, 10);
    // Insert the new user into the database and return the user_id and email
    const result = await pool.query(
      "INSERT INTO users (email, password_hash) VALUES ($1, $2) RETURNING user_id, email",
      [email, hashedPassword],
    );
    res.status(201).json(result.rows[0]);
  } catch (error) {
    // Handle unique constraint violation (email already exists)
    if (error.code === "23505")
      return res.status(409).json({ error: "Email already registered" });
    res.status(500).json({ error: "Internal Server Error" });
  }
});

// Authenticate a user and return a JWT
app.post("/api/auth/login", async (req, res) => {
  try {
    const { email, password } = req.body;
    // Find the user by email
    const result = await pool.query("SELECT * FROM users WHERE email = $1", [
      email,
    ]);

    if (result.rowCount === 0)
      return res.status(401).json({ error: "Invalid credentials" });

    const user = result.rows[0];
    // Compare the provided password with the stored hashed password
    const validPassword = await bcrypt.compare(password, user.password_hash);

    if (!validPassword)
      return res.status(401).json({ error: "Invalid credentials" });

    // 1. Generate JWT containing the user_id and role
    const token = jwt.sign(
      { user_id: user.user_id, email: user.email, role: user.role },
      JWT_SECRET,
      { expiresIn: "2h" },
    );

    // 2. Update last_login timestamp in the database
    await pool.query(
      "UPDATE users SET last_login = CURRENT_TIMESTAMP WHERE user_id = $1",
      [user.user_id],
    );

    // 3. Send the single, final response
    res.json({ token, email: user.email });
  } catch (error) {
    console.error("Login Error:", error);
    res.status(500).json({ error: "Internal Server Error" });
  }
});
//mine

// Serve the main index.html file for the root route
app.get("/", (req, res) => {
  res.sendFile(__dirname + "/index.html");
});
//get all seats
app.get("/seats", async (req, res) => {
  const result = await pool.query("select * from seats"); // equivalent to Seats.find() in mongoose
  res.send(result.rows);
});

//book a seat give the seatId and your name

app.put("/:id/:name", authenticateToken, async (req, res) => {
  let conn; // Scoped outside to ensure access in catch block
  try {
    const id = req.params.id;
    const name = req.params.name;
    const userId = req.user.user_id;

    // Hardcoded for this assignment scope.
    // In production, this data comes from a Stripe/Razorpay webhook.
    const paymentAmount = 250.0;
    const paymentStatus = "COMPLETED";

    // Connect to the database and start a transaction
    conn = await pool.connect();
    await conn.query("BEGIN");

    // Check if the seat is available and lock it for update to prevent race conditions
    const sql = "SELECT * FROM seats where id = $1 and isbooked = 0 FOR UPDATE";
    const result = await conn.query(sql, [id]);

    if (result.rowCount === 0) {
      await conn.query("ROLLBACK"); // Crucial: Release the lock
      conn.release();
      return res.status(400).json({ error: "Seat already booked" });
    }

    // Update the seat with booking and payment details
    const sqlU = `
      UPDATE seats 
      SET isbooked = 1, 
          name = $2, 
          user_id = $3, 
          payment_status = $4, 
          payment_amount = $5, 
          booked_at = CURRENT_TIMESTAMP,
          updated_at = CURRENT_TIMESTAMP
      WHERE id = $1
    `;
    await conn.query(sqlU, [id, name, userId, paymentStatus, paymentAmount]);

    // Commit the transaction to save changes
    await conn.query("COMMIT");
    conn.release();

    res.json({
      success: true,
      message: "Seat booked and payment completed successfully.",
    });
  } catch (ex) {
    if (conn) {
      await conn.query("ROLLBACK"); // Crucial: Prevent connection pool exhaustion
      conn.release();
    }
    console.error("Booking Error:", ex);
    res.status(500).json({ error: "Internal server error during booking." });
  }
});

// Fetch all booked tickets for the authenticated user
app.get("/api/my-tickets", authenticateToken, async (req, res) => {
  try {
    const userId = req.user.user_id;
    const sql =
      "SELECT id, name FROM seats WHERE user_id = $1 AND isbooked = 1";
    const result = await pool.query(sql, [userId]);
    res.json(result.rows);
  } catch (ex) {
    console.error("Fetch Tickets Error:", ex);
    res.status(500).json({ error: "Could not fetch tickets" });
  }
});

// Start the server
app.listen(port, () => console.log("Server starting on port: " + port));
