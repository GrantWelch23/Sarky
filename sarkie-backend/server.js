require("dotenv").config();
const express = require("express");
const cors = require("cors");
const { Pool } = require("pg");

// Initialize Express App
const app = express();

// Middleware
app.use(cors());
app.use(express.json());

// PostgreSQL Connection
const pool = new Pool({
  host: process.env.DB_HOST || "localhost",
  port: process.env.DB_PORT || 5432,
  user: process.env.DB_USER || "postgres",
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME || "sarky_db",
  ssl: false
});

pool.connect()
  .then(() => console.log("✅ Connected to PostgreSQL - sarky_db"))
  .catch(err => console.error("Database connection error:", err));

// Root route
app.get("/", (req, res) => {
  res.send("Backend is running!");
});

// Import Route Files
const authRoutes = require("./routes/auth");
const chatRoutes = require("./routes/chat");
const supplementRoutes = require("./routes/supplements");
const conversationRoutes = require("./routes/conversation");
const moodRoutes = require("./routes/mood");

// Use Route Files
app.use("/auth", authRoutes);
app.use("/chat", chatRoutes);
app.use("/supplements", supplementRoutes);
app.use("/conversations", conversationRoutes);
app.use("/mood", moodRoutes);

// Start the Server
const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});