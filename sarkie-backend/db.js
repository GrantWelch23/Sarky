require("dotenv").config();
const { Pool } = require("pg");

// PostgreSQL Connection - using your custom port 1234
const pool = new Pool({
  host: process.env.DB_HOST || "localhost",
  port: process.env.DB_PORT || 1234,     
  user: process.env.DB_USER || "postgres",
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME || "sarky_db",
  ssl: false
});

pool.connect()
  .then(() => console.log("✅ Connected to PostgreSQL - sarky_db"))
  .catch(err => console.error("Database connection error:", err));

module.exports = pool;