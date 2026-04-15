# Book My Ticket 🎟️

Welcome to my seat booking application! I built this project to demonstrate a full-stack booking system handling user authentication, database transactions, and a clean user interface.

## 🧠 How I Built This (The Workings)

I designed this project using **Node.js** and **Express** for the backend, **PostgreSQL** for the database, and raw **HTML/JS with Tailwind CSS** for the frontend. Here is a breakdown of what I did and why:

### 1. User Authentication & Security

I wanted to ensure user data was secure and adhered to industry standards.

- I used `bcryptjs` (10 salt rounds) to hash user passwords before storage.
- I used `jsonwebtoken` (JWT) for stateless session management.
- **Advanced Feature:** I used PostgreSQL `UUID` generation for user IDs instead of sequential integers to prevent user enumeration attacks.

### 2. Concurrency & Race Conditions

One of the biggest challenges in a booking system is when two users try to book the exact same seat at the exact same millisecond.

- I solved this utilizing **Database Transactions** (`BEGIN`, `COMMIT`, `ROLLBACK`) combined with a `SELECT ... FOR UPDATE` row-level lock.
- If a seat is locked by User A, User B's request is safely rejected, completely preventing duplicate bookings.

### 3. Database Setup & Auditing

The application uses Docker to containerize the database environment effortlessly. Additionally, the schema includes professional auditing features like `last_login`, `booked_at`, and `payment_status` to associate tickets with specific users.

### 4. Frontend UI

I built a single-page application (SPA) using standard HTML/JS, styled with Tailwind CSS via CDN. The UI dynamically decodes the JWT to manage state and utilizes a sleek modal for the final booking confirmation.

---

## 🚀 How to Run the Project Locally

If you want to run this project on your own machine, follow the steps below.

### Prerequisites

- **Node.js** (v16 or higher recommended)
- **Docker & Docker Compose** (for running the PostgreSQL database)

### Step 1: Clone & Install Dependencies

Navigate into the project folder and install the required Node.js packages:

```bash
npm install
```

### Step 2: Start the Database

I've included a `docker-compose.yml` file to make database setup effortless. Open your terminal in the project root and run:

```bash
docker-compose up -d
```

_Note: This binds the database to port `5433` on your host machine to avoid conflicts with any existing local Postgres instances._

### Step 3: Initialize the Schema & Mock Data

**Do not manually run SQL commands.** I have included an automated setup script that will connect to the Docker database, build the tables with the correct UUID constraints, and seed the mock seats.

Run this command in your terminal:

```bash
node setup-db.mjs
```

_(You should see a success message confirming `init.sql` was executed)._

### Step 4: Configure Environment Variables

Create a `.env` file in the root directory. The application will work fine with defaults, but you can override them:

```env
PORT=8080
JWT_SECRET=your_super_secret_key_here
```

### Step 5: Start the Application

Start the Express server:

```bash
node index.mjs
```

### Step 6: Test the Flow

Open your browser and navigate to: **http://localhost:8080**

1. Try to click a seat (It will block you).
2. Register a new account.
3. Log in with your new account.
4. Click on any gray (Available) seat.
5. Enter a name in the modal, click "Pay & Book", and watch the seat securely lock and turn red (Booked)!
