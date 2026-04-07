require("dotenv").config();
const { Pool } = require("pg");

const host = process.env.DB_HOST || "localhost";
const useSSL = host !== "localhost" && host !== "127.0.0.1";

const pool = new Pool({
  host,
  port: process.env.DB_PORT || 5432,
  user: process.env.DB_USER || "postgres",
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME || "sarkie_db",
  ssl: useSSL ? { rejectUnauthorized: false } : false,
});

pool.connect()
  .then(() => console.log("✅ Connected to PostgreSQL"))
  .catch(err => console.error("Database connection error:", err));

module.exports = pool;