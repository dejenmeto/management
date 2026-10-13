const express = require("express");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const pool = require("../config/db");
const { authenticateToken } = require("../middleware/auth");

const router = express.Router();

// POST /api/auth/register
// Register a new ordinary user.
router.post("/register", async (req, res) => {
  try {
    const { name, email, password } = req.body;

    // Check required fields.
    if (
      typeof name !== "string" ||
      typeof email !== "string" ||
      typeof password !== "string" ||
      !name.trim() ||
      !email.trim() ||
      !password
    ) {
      return res.status(400).json({
        success: false,
        message: "Name, email, and password are required.",
      });
    }

    const cleanName = name.trim();
    const cleanEmail = email.trim().toLowerCase();

    // Validate field lengths and basic email format.
    if (cleanName.length > 150 || cleanEmail.length > 255) {
      return res.status(400).json({
        success: false,
        message: "Name or email is too long.",
      });
    }

    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(cleanEmail)) {
      return res.status(400).json({
        success: false,
        message: "Please enter a valid email address.",
      });
    }

    // Require a reasonable password length.
    // bcrypt supports at most 72 bytes of password input.
    if (password.length < 8 || Buffer.byteLength(password, "utf8") > 72) {
      return res.status(400).json({
        success: false,
        message:
          "Password must be at least 8 characters and no more than 72 UTF-8 bytes.",
      });
    }

    // Check whether this email is already registered.
    const existingUser = await pool.query(
      "SELECT id FROM users WHERE LOWER(email) = $1",
      [cleanEmail],
    );

    if (existingUser.rows.length > 0) {
      return res.status(409).json({
        success: false,
        message: "An account with this email already exists.",
      });
    }

    // Never store the original password.
    const passwordHash = await bcrypt.hash(password, 12);

    // Public registration always creates a regular user.
    // The client cannot choose the role.
    const result = await pool.query(
      `INSERT INTO users (name, email, password_hash, role)
       VALUES ($1, $2, $3, $4)
       RETURNING id, name, email, role, created_at`,
      [cleanName, cleanEmail, passwordHash, "user"],
    );

    return res.status(201).json({
      success: true,
      message: "Account registered successfully. You can now log in.",
      data: result.rows[0],
    });
  } catch (error) {
    // PostgreSQL error 23505 means a unique constraint was violated.
    if (error.code === "23505") {
      return res.status(409).json({
        success: false,
        message: "An account with this email already exists.",
      });
    }

    console.error("Registration error:", error.message);

    return res.status(500).json({
      success: false,
      message: "Unable to register your account right now.",
    });
  }
});

// POST /api/auth/login
// Verify credentials and issue a JWT.
router.post("/login", async (req, res) => {
  try {
    const { email, password } = req.body;

    if (
      typeof email !== "string" ||
      typeof password !== "string" ||
      !email.trim() ||
      !password
    ) {
      return res.status(400).json({
        success: false,
        message: "Email and password are required.",
      });
    }

    if (Buffer.byteLength(password, "utf8") > 72) {
      return res.status(401).json({
        success: false,
        message: "Invalid email or password.",
      });
    }

    const cleanEmail = email.trim().toLowerCase();

    // Find the account by email.
    const result = await pool.query(
      `SELECT id, name, email, password_hash, role, is_active
       FROM users
       WHERE LOWER(email) = $1`,
      [cleanEmail],
    );

    const user = result.rows[0];

    // Use a generic error message to avoid revealing whether
    // an email address is registered.
    if (!user || !user.is_active) {
      return res.status(401).json({
        success: false,
        message: "Invalid email or password.",
      });
    }

    // Compare the submitted password with the saved hash.
    const passwordMatches = await bcrypt.compare(password, user.password_hash);

    if (!passwordMatches) {
      return res.status(401).json({
        success: false,
        message: "Invalid email or password.",
      });
    }

    // Create a signed token containing only the information
    // required to identify and authorize the user.
    const token = jwt.sign(
      {
        id: user.id,
        role: user.role,
      },
      process.env.JWT_SECRET,
      {
        expiresIn: process.env.JWT_EXPIRES_IN || "1h",
      },
    );

    // Do not return password_hash to the frontend.
    return res.status(200).json({
      success: true,
      message: "Login successful.",
      token,
      data: {
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role,
      },
    });
  } catch (error) {
    console.error("Login error:", error.message);

    return res.status(500).json({
      success: false,
      message: "Unable to log in right now.",
    });
  }
});

// GET /api/auth/me
// Return the current user identified by a valid JWT.
router.get("/me", authenticateToken, async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT id, name, email, role, is_active, created_at
       FROM users
       WHERE id = $1`,
      [req.user.id],
    );

    const user = result.rows[0];

    if (!user || !user.is_active) {
      return res.status(401).json({
        success: false,
        message: "Account not found or inactive.",
      });
    }

    return res.status(200).json({
      success: true,
      data: user,
    });
  } catch (error) {
    console.error("Current user error:", error.message);

    return res.status(500).json({
      success: false,
      message: "Unable to retrieve your account.",
    });
  }
});

module.exports = router;
