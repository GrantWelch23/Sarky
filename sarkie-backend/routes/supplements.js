const express = require("express");
const router = express.Router();
const pool = require("../db");


// Supplements API Routes

// GET /supplements/report - MUST be before /:user_id to avoid conflicts
const { SupplementHistoryReport } = require("../models/report");

router.get("/report", async (req, res) => {
  try {
    const userId = req.query.userId;
    const result = await pool.query("SELECT * FROM supplements WHERE user_id = $1", [userId]);
    
    const report = new SupplementHistoryReport(result.rows);
    res.json(report.generate());
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to generate report" });
  }
});

// create a supplement 
router.post("/", async (req, res) => {
  console.log(" [SUPPLEMENT POST] Incoming Request:", req.body);

  try {
    const { user_id, name, dosage, frequency } = req.body;

    if (!user_id || !name || !dosage || !frequency) {
      console.log(" Missing required fields:", req.body);
      return res.status(400).json({ error: "Missing required fields" });
    }

    const newSupplement = await pool.query(
      "INSERT INTO supplements (user_id, name, dosage, frequency) VALUES ($1, $2, $3, $4) RETURNING *",
      [user_id, name, dosage, frequency]
    );

    console.log(" [DB INSERT SUCCESS] Supplement added:", newSupplement.rows[0]);

    res.json(newSupplement.rows[0]);
  } catch (err) {
    console.error(" Error adding supplement:", err);
    res.status(500).send("Server error");
  }
});

// Get supplements for a user 
router.get("/:user_id", async (req, res) => {
  try {
    const { user_id } = req.params;

    const supplements = await pool.query(
      "SELECT * FROM supplements WHERE user_id = $1",
      [user_id]
    );

    console.log(" [SUPPLEMENTS FETCH SUCCESS] Retrieved supplements:", supplements.rows);

    res.json(supplements.rows);
  } catch (err) {
    console.error(" Error retrieving supplements:", err);
    res.status(500).send("Server error");
  }
});

// Delete a supplement
router.delete("/:id", async (req, res) => {
  try {
    const { id } = req.params;

    console.log(`🗑️ [SUPPLEMENT DELETE] Attempting to delete supplement ID: ${id}`);

    const deleteResult = await pool.query("DELETE FROM supplements WHERE id = $1 RETURNING *", [id]);

    if (deleteResult.rowCount === 0) {
      console.log(" [DELETE FAILED] Supplement not found.");
      return res.status(404).json({ error: "Supplement not found" });
    }

    console.log(" [DELETE SUCCESS] Supplement deleted:", deleteResult.rows[0]);
    res.json({ message: "Supplement deleted successfully" });
  } catch (err) {
    console.error(" Error deleting supplement:", err);
    res.status(500).send("Server error");
  }
});

//  Add a new effect 
router.post("/user-effects", async (req, res) => {
  console.log("📥 [EFFECT POST] Incoming Request:", req.body);

  try {
    const { user_id, effect_type, effect_description } = req.body;

    if (!user_id || !effect_type || !effect_description) {
      console.log(" Missing required fields:", req.body);
      return res.status(400).json({ error: "Missing required fields" });
    }

    const newEffect = await pool.query(
      "INSERT INTO supplement_effects (user_id, effect_type, effect_description, timestamp) VALUES ($1, $2, $3, NOW()) RETURNING *",
      [user_id, effect_type, effect_description]
    );

    console.log(" [DB INSERT SUCCESS] Effect added:", newEffect.rows[0]);

    res.json(newEffect.rows[0]);
  } catch (err) {
    console.error(" Error adding effect:", err);
    res.status(500).send("Server error");
  }
});

// Delete a single effect by ID
router.delete("/user-effects/:effect_id", async (req, res) => {
  try {
    const { effect_id } = req.params;

    console.log(` [DELETE] Removing effect ID: ${effect_id}`);

    const deleteResult = await pool.query(
      "DELETE FROM supplement_effects WHERE id = $1 RETURNING *",
      [effect_id]
    );

    if (deleteResult.rowCount === 0) {
      console.log(" Effect not found.");
      return res.status(404).json({ error: "Effect not found" });
    }

    console.log(` [DELETE SUCCESS] Removed effect:`, deleteResult.rows[0]);
    res.json({ message: "Effect deleted successfully" });
  } catch (err) {
    console.error(" Error deleting effect:", err);
    res.status(500).json({ error: "Internal Server Error" });
  }
});



// Get all supplements with their effects
router.get('/user-supplements/:user_id', async (req, res) => {
  const { user_id } = req.params;

  try {
      const query = `
          SELECT s.id AS supplement_id, s.name, se.effect_type, se.effect_description
          FROM supplements s
          LEFT JOIN supplement_effects se ON s.id = se.supplement_id AND se.user_id = $1
          WHERE s.id IN (SELECT supplement_id FROM user_supplements WHERE user_id = $1)
          ORDER BY s.name, se.effect_type;
      `;
      const result = await pool.query(query, [user_id]);
      res.json(result.rows);
  } catch (error) {
      console.error("Error fetching user supplements:", error);
      res.status(500).json({ error: "Internal Server Error" });
  }
});

// Get all positive and negative effects for a user
router.get('/user-effects/:user_id', async (req, res) => {
  const { user_id } = req.params;

  try {
      const query = `
          SELECT id, effect_type, effect_description, timestamp
          FROM supplement_effects
          WHERE user_id = $1
          ORDER BY effect_type, timestamp DESC;
      `;
      const result = await pool.query(query, [user_id]);
      res.json(result.rows);
  } catch (error) {
      console.error("Error fetching user effects:", error);
      res.status(500).json({ error: "Internal Server Error" });
  }
});

// Chart data endpoint - aggregates supplement, positive effects, and negative effects
router.get('/chart/usage-data', async (req, res) => {
  const { userId, period } = req.query;
  
  if (!userId || !period) {
    return res.status(400).json({ error: "userId and period are required" });
  }

  try {
    // Ensure created_at column exists
    await pool.query(
      `ALTER TABLE supplements ADD COLUMN IF NOT EXISTS created_at TIMESTAMP DEFAULT NOW();`
    );

    let supplementQuery, positiveEffectsQuery, negativeEffectsQuery;
    
    if (period === 'weekly') {
      supplementQuery = `
        SELECT 
          DATE_TRUNC('week', created_at)::DATE as period,
          name,
          COUNT(*) as count
        FROM supplements
        WHERE user_id = $1 AND created_at >= CURRENT_DATE - INTERVAL '4 weeks'
        GROUP BY DATE_TRUNC('week', created_at)::DATE, name
        ORDER BY DATE_TRUNC('week', created_at)::DATE, name;
      `;

      positiveEffectsQuery = `
        SELECT 
          DATE_TRUNC('week', COALESCE(timestamp, NOW()))::DATE as period,
          effect_description,
          COUNT(*) as count
        FROM supplement_effects
        WHERE user_id = $1 AND effect_type = 'positive' AND COALESCE(timestamp, NOW()) >= CURRENT_DATE - INTERVAL '4 weeks'
        GROUP BY DATE_TRUNC('week', COALESCE(timestamp, NOW()))::DATE, effect_description
        ORDER BY DATE_TRUNC('week', COALESCE(timestamp, NOW()))::DATE, effect_description;
      `;

      negativeEffectsQuery = `
        SELECT 
          DATE_TRUNC('week', COALESCE(timestamp, NOW()))::DATE as period,
          effect_description,
          COUNT(*) as count
        FROM supplement_effects
        WHERE user_id = $1 AND effect_type = 'negative' AND COALESCE(timestamp, NOW()) >= CURRENT_DATE - INTERVAL '4 weeks'
        GROUP BY DATE_TRUNC('week', COALESCE(timestamp, NOW()))::DATE, effect_description
        ORDER BY DATE_TRUNC('week', COALESCE(timestamp, NOW()))::DATE, effect_description;
      `;
    } else {
      supplementQuery = `
        SELECT 
          DATE_TRUNC('month', created_at)::DATE as period,
          name,
          COUNT(*) as count
        FROM supplements
        WHERE user_id = $1 AND created_at >= CURRENT_DATE - INTERVAL '4 months'
        GROUP BY DATE_TRUNC('month', created_at)::DATE, name
        ORDER BY DATE_TRUNC('month', created_at)::DATE, name;
      `;

      positiveEffectsQuery = `
        SELECT 
          DATE_TRUNC('month', COALESCE(timestamp, NOW()))::DATE as period,
          effect_description,
          COUNT(*) as count
        FROM supplement_effects
        WHERE user_id = $1 AND effect_type = 'positive' AND COALESCE(timestamp, NOW()) >= CURRENT_DATE - INTERVAL '4 months'
        GROUP BY DATE_TRUNC('month', COALESCE(timestamp, NOW()))::DATE, effect_description
        ORDER BY DATE_TRUNC('month', COALESCE(timestamp, NOW()))::DATE, effect_description;
      `;

      negativeEffectsQuery = `
        SELECT 
          DATE_TRUNC('month', COALESCE(timestamp, NOW()))::DATE as period,
          effect_description,
          COUNT(*) as count
        FROM supplement_effects
        WHERE user_id = $1 AND effect_type = 'negative' AND COALESCE(timestamp, NOW()) >= CURRENT_DATE - INTERVAL '4 months'
        GROUP BY DATE_TRUNC('month', COALESCE(timestamp, NOW()))::DATE, effect_description
        ORDER BY DATE_TRUNC('month', COALESCE(timestamp, NOW()))::DATE, effect_description;
      `;
    }

    const [supplementRes, positiveRes, negativeRes] = await Promise.all([
      pool.query(supplementQuery, [userId]),
      pool.query(positiveEffectsQuery, [userId]),
      pool.query(negativeEffectsQuery, [userId])
    ]);

    console.log('Chart data - supplements:', supplementRes.rows.length, 'positive:', positiveRes.rows.length, 'negative:', negativeRes.rows.length);

    res.json({
      supplements: supplementRes.rows,
      positive_effects: positiveRes.rows,
      negative_effects: negativeRes.rows
    });
  } catch (error) {
    console.error("Error fetching chart data:", error);
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;
