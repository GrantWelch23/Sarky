const express = require("express");
const router = express.Router();
const pool = require("../db");
const nodemailer = require("nodemailer");
const crypto = require("crypto");
const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");

console.log(" Auth routes loaded");

// CORS Middleware for Handling Frontend Requests
router.use((req, res, next) => {
  res.header("Access-Control-Allow-Origin", "*");
  res.header("Access-Control-Allow-Methods", "GET, POST, PUT, DELETE, OPTIONS");
  res.header("Access-Control-Allow-Headers", "Content-Type, Authorization");
  next();
});


// Login Route (Requires Verified Email)
router.post("/login", async (req, res) => {
  try {
    const { email, password } = req.body;

    // Check if user exists
    const userQuery = await pool.query("SELECT * FROM users WHERE email = $1", [email]);
    const user = userQuery.rows[0];

    if (!user) {
      return res.status(400).json({ error: "User not found" });
    }

    // Check if user is verified
    if (!user.verified) {
      return res.status(403).json({ error: "Please verify your email before logging in." });
    }

    // Check password
    const validPassword = await bcrypt.compare(password, user.password_hash);
    if (!validPassword) {
      return res.status(400).json({ error: "Invalid credentials" });
    }

    // Generate a token (optional)
    const token = jwt.sign(
      { id: user.id, email: user.email },
      process.env.JWT_SECRET,
      { expiresIn: "24h" }
    );

    // Respond in JSON format for frontend
    res.json({
      message: "Login successful",
      user: { id: user.id, name: user.name, email: user.email },
      token
    });

  } catch (error) {
    console.error(" Error logging in:", error);
    res.status(500).json({ error: "Server error" });
  }
});

// Verify Email Code (Updates User to verified = true)
router.post("/verify-code", async (req, res) => {
  const { email, code } = req.body;

  if (!email || !code) {
    console.log(" Missing email or code in request.");
    return res.status(400).json({ error: "Email and code are required." });
  }

  try {
    console.log(` [VERIFY CODE] Checking verification code for: ${email}`);

    // Retrieve stored code
    const result = await pool.query(
      "SELECT code, expires_at FROM verification_codes WHERE email = $1",
      [email]
    );

    console.log("🔍 Query Result:", result.rows);

    if (result.rowCount === 0) {
      console.log(" No verification code found for this email.");
      return res.status(400).json({ error: "No code found for this email." });
    }

    const { code: storedCode, expires_at } = result.rows[0];

    // Check expiration
    const now = new Date();
    if (now > expires_at) {
      console.log(" Verification code expired.");
      return res.status(400).json({ error: "Verification code expired." });
    }

    // Check code match
    if (code !== storedCode) {
      console.log(` Invalid code entered. Expected: ${storedCode}, Received: ${code}`);
      return res.status(400).json({ error: "Invalid verification code." });
    }

    console.log(" Verification code is correct! Updating user status...");

    // Delete from verification_codes
    await pool.query("DELETE FROM verification_codes WHERE email = $1", [email]);
    console.log(" Deleted verification code from database.");

    // Mark user as verified in the users table
    const updateResult = await pool.query("UPDATE users SET verified = true WHERE email = $1 RETURNING *", [email]);

    if (updateResult.rowCount === 0) {
      console.log(" Failed to update user verification status.");
      return res.status(500).json({ error: "Failed to update user verification status." });
    }

    console.log(" User successfully verified:", updateResult.rows[0]);

    res.json({ message: "Verification successful!" });

  } catch (error) {
    console.error(" Error verifying code:", error);
    res.status(500).json({ error: "Server error" });
  }
});



// Gmail SMTP Transport Setup
const transporter = nodemailer.createTransport({
  service: "gmail",
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS,
  },
});

// Register a New User (POST /auth/register)
router.post("/register", async (req, res) => {
  try {
    const { name, email, password } = req.body;

    if (!name || !email || !password) {
      return res.status(400).json({ error: "All fields are required." });
    }

    if (password.length < 8) {
      return res.status(400).json({ error: "Password must be at least 8 characters." });
    }

    // Check if user already exists
    const userExists = await pool.query("SELECT * FROM users WHERE email = $1", [email]);

    if (userExists.rowCount > 0) {
      const existingUser = userExists.rows[0];
      if (existingUser.verified) {
        return res.status(400).json({ error: "User already exists. Please log in." });
      }
      // Unverified user — delete stale record and allow re-registration
      await pool.query("DELETE FROM users WHERE email = $1", [email]);
      await pool.query("DELETE FROM verification_codes WHERE email = $1", [email]);
    }

    // Hash the password before storing
    const saltRounds = 10;
    const hashedPassword = await bcrypt.hash(password, saltRounds);

    // Insert new user with 'verified' set to FALSE initially
    const newUser = await pool.query(
      "INSERT INTO users (name, email, password_hash, verified) VALUES ($1, $2, $3, $4) RETURNING *",
      [name, email, hashedPassword, false] //  Email verification pending
    );

    console.log(" New User Registered:", newUser.rows[0]);

    res.status(201).json({ 
      message: "User registered successfully! Please verify your email.", 
      user: newUser.rows[0] 
    });

  } catch (error) {
    console.error(" Error registering user:", error);
    res.status(500).json({ error: "Server error. Please try again later." });
  }
});


// Send Email Verification Code (Stores in DB)
router.post("/send-verification-code", async (req, res) => {
  const { email } = req.body;
  if (!email) {
    return res.status(400).json({ error: "Email is required." });
  }

  try {

    // Check if the user exists
    const userQuery = await pool.query("SELECT verified FROM users WHERE email = $1", [email]);

    if (userQuery.rows.length === 0) {
      return res.status(404).json({ error: "User not found. Please register first." });
    }

    // Check if user is already verified
    if (userQuery.rows[0].verified) {
      return res.status(400).json({ error: "Email is already verified." });
    }

    // Generate a verification code
    const code = crypto.randomInt(100000, 999999).toString();
    const expiresAt = new Date(Date.now() + 10 * 60 * 1000); // Code expires in 10 minutes


    // Insert/update verification code in DB
    await pool.query(
      `INSERT INTO verification_codes (email, code, expires_at)
       VALUES ($1, $2, $3)
       ON CONFLICT (email)
       DO UPDATE SET code = EXCLUDED.code, expires_at = EXCLUDED.expires_at`,
      [email, code, expiresAt]
    );

    // Send email with Nodemailer
    const mailOptions = {
      from: process.env.EMAIL_USER,
      to: email,
      subject: "Your Verification Code",
      text: `Your verification code is: ${code}. It expires in 10 minutes.`,
    };

    await transporter.sendMail(mailOptions);
    console.log(` Verification code sent to ${email}`);

    res.json({ message: "Verification code sent successfully!" });

  } catch (error) {
    console.error(" Error sending email:", error);
    res.status(500).json({ error: "Failed to send verification code." });
  }
});

module.exports = router;
