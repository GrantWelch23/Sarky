const express = require("express");
const router = express.Router();
const pool = require("../db");

// Create mood table if it doesn't exist
async function ensureMoodTable() {
  try {
    await pool.query(`
      CREATE TABLE IF NOT EXISTS mood_scores (
        id SERIAL PRIMARY KEY,
        user_id INTEGER NOT NULL,
        score INTEGER NOT NULL CHECK (score >= 1 AND score <= 10),
        date DATE NOT NULL DEFAULT CURRENT_DATE,
        created_at TIMESTAMP DEFAULT NOW(),
        UNIQUE(user_id, date)
      );
    `);
  } catch (error) {
    console.error("Error creating mood_scores table:", error);
  }
}

ensureMoodTable();

// POST /mood - Add or update daily mood score
router.post("/", async (req, res) => {
  const { user_id, score, date } = req.body;

  if (!user_id || score === undefined || !date) {
    return res.status(400).json({ error: "user_id, score, and date are required" });
  }

  if (score < 1 || score > 10) {
    return res.status(400).json({ error: "Score must be between 1 and 10" });
  }

  try {
    const result = await pool.query(
      `INSERT INTO mood_scores (user_id, score, date) 
       VALUES ($1, $2, $3)
       ON CONFLICT (user_id, date) DO UPDATE SET score = $2
       RETURNING *;`,
      [user_id, score, date]
    );

    res.json(result.rows[0]);
  } catch (error) {
    console.error("Error adding mood score:", error);
    res.status(500).json({ error: "Internal Server Error" });
  }
});

// GET /mood/:user_id - Get mood scores for a user
router.get("/:user_id", async (req, res) => {
  const { user_id } = req.params;

  try {
    const result = await pool.query(
      `SELECT id, user_id, score, date, created_at 
       FROM mood_scores 
       WHERE user_id = $1 
       ORDER BY date DESC;`,
      [user_id]
    );

    res.json(result.rows);
  } catch (error) {
    console.error("Error fetching mood scores:", error);
    res.status(500).json({ error: "Internal Server Error" });
  }
});

module.exports = router;
