const express = require("express");
const router = express.Router();

// Reuse the PostgreSQL connection pool.
const pool = require("../config/db");

// POST /api/contact
// Accept a public contact form and save its message.
router.post("/", async (req, res) => {
  try {
    // Read the submitted values from the JSON request body.
    const { name, email, subject, message } = req.body;

    // Basic validation: every field is required.
    if (
      typeof name !== "string" ||
      typeof email !== "string" ||
      typeof subject !== "string" ||
      typeof message !== "string" ||
      !name.trim() ||
      !email.trim() ||
      !subject.trim() ||
      !message.trim()
    ) {
      return res.status(400).json({
        success: false,
        message: "Name, email, subject, and message are required.",
      });
    }

    // Validate email format and reasonable field lengths.
    const cleanName = name.trim();
    const cleanEmail = email.trim().toLowerCase();
    const cleanSubject = subject.trim();
    const cleanMessage = message.trim();

    const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

    if (
      cleanName.length > 150 ||
      cleanEmail.length > 255 ||
      cleanSubject.length > 200 ||
      cleanMessage.length > 5000 ||
      !emailPattern.test(cleanEmail)
    ) {
      return res.status(400).json({
        success: false,
        message: "Please check the email and field lengths.",
      });
    }

    // Insert the message safely using PostgreSQL parameters.
    const result = await pool.query(
      `INSERT INTO contact_messages
        (name, email, subject, message)
       VALUES ($1, $2, $3, $4)
       RETURNING id, name, email, subject, status, created_at`,
      [cleanName, cleanEmail, cleanSubject, cleanMessage],
    );

    // Return the newly created message's non-sensitive details.
    res.status(201).json({
      success: true,
      message: "Your message has been submitted successfully.",
      data: result.rows[0],
    });
  } catch (error) {
    console.error("Error saving contact message:", error.message);

    res.status(500).json({
      success: false,
      message: "Unable to submit your message right now.",
    });
  }
});

module.exports = router;
