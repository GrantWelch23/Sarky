const express = require("express");
const router = express.Router();
const pool = require("../db");


// Conversation Routes

// Save a conversation message (User or AI)
router.post("/", async (req, res) => {
  console.log("📥 [CONVERSATION POST] Incoming Request:", req.body);

  try {
    const { user_id, message, sender } = req.body;

    if (!user_id || !message || !sender) {
      console.log(" Missing required fields:", req.body);
      return res.status(400).json({ error: "Missing required fields" });
    }

    // Check if the exact message already exists (Prevents duplicates)
    const checkDuplicate = await pool.query(
      "SELECT * FROM conversations WHERE user_id = $1 AND message = $2 AND sender = $3",
      [user_id, message, sender]
    );

    if (checkDuplicate.rowCount > 0) {
      console.log(" [DUPLICATE DETECTED] Skipping insert:", req.body);
      return res.status(409).json({ error: "Duplicate message detected" });
    }

    // Insert only if it's not a duplicate
    const newMessage = await pool.query(
      "INSERT INTO conversations (user_id, message, sender) VALUES ($1, $2, $3) RETURNING *",
      [user_id, message, sender]
    );

    console.log(" [DB INSERT SUCCESS] Message saved:", newMessage.rows[0]);

    res.json(newMessage.rows[0]);
  } catch (err) {
    console.error(" Error saving message:", err);
    res.status(500).send("Server error");
  }
});

// Search conversation history for a user
router.get("/search", async (req, res) => {
  try {
    const { user_id, query } = req.query;

    if (!user_id || !query) {
      return res.status(400).json({ error: "Missing user_id or query" });
    }

    const results = await pool.query(
      `SELECT id, message, sender, timestamp
       FROM conversations
       WHERE user_id = $1 AND message ILIKE $2
       ORDER BY timestamp ASC`,
      [user_id, `%${query}%`]
    );

    res.json(results.rows);
  } catch (err) {
    console.error("Error searching conversations:", err);
    res.status(500).send("Server error");
  }
});

// Retrieve conversation history for a user
router.get("/:user_id", async (req, res) => {
  try {
    const { user_id } = req.params;

    const conversation = await pool.query(
      "SELECT message, sender, timestamp FROM conversations WHERE user_id = $1 ORDER BY timestamp ASC",
      [user_id]
    );

    res.json(conversation.rows); // Return conversation history
  } catch (err) {
    console.error(" Error retrieving conversation:", err);
    res.status(500).send("Server error");
  }
});

module.exports = router;
