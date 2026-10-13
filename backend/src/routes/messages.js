const express = require("express");
const pool = require("../config/db");
const { authenticateToken, requireAdmin } = require("../middleware/auth");

const router = express.Router();

// Only administrators can access the inbox.
router.use(authenticateToken, requireAdmin);

const validStatuses = ["new", "read", "resolved"];

// GET /api/messages - list all contact messages.
router.get("/", async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT id, name, email, subject, message, status,
              created_at, updated_at
       FROM contact_messages
       ORDER BY
         CASE status
           WHEN 'new' THEN 1
           WHEN 'read' THEN 2
           ELSE 3
         END,
         created_at DESC`,
    );

    res.json({
      success: true,
      count: result.rows.length,
      data: result.rows,
    });
  } catch (error) {
    console.error("List messages error:", error.message);
    res.status(500).json({
      success: false,
      message: "Could not load contact messages.",
    });
  }
});

// GET /api/messages/:id - retrieve one message.
router.get("/:id", async (req, res) => {
  const id = Number(req.params.id);

  if (!Number.isSafeInteger(id) || id <= 0) {
    return res.status(400).json({
      success: false,
      message: "Invalid message ID.",
    });
  }

  try {
    const result = await pool.query(
      `SELECT id, name, email, subject, message, status,
              created_at, updated_at
       FROM contact_messages
       WHERE id = $1`,
      [id],
    );

    if (!result.rows.length) {
      return res.status(404).json({
        success: false,
        message: "Message not found.",
      });
    }

    res.json({ success: true, data: result.rows[0] });
  } catch (error) {
    console.error("Get message error:", error.message);
    res.status(500).json({
      success: false,
      message: "Could not load the message.",
    });
  }
});

// PUT /api/messages/:id - update message status.
router.put("/:id", async (req, res) => {
  const id = Number(req.params.id);
  const { status } = req.body || {};

  if (!Number.isSafeInteger(id) || id <= 0) {
    return res.status(400).json({
      success: false,
      message: "Invalid message ID.",
    });
  }

  if (!validStatuses.includes(status)) {
    return res.status(400).json({
      success: false,
      message: "Status must be new, read, or resolved.",
    });
  }

  try {
    const result = await pool.query(
      `UPDATE contact_messages
       SET status = $1, updated_at = NOW()
       WHERE id = $2
       RETURNING id, name, email, subject, message, status,
                 created_at, updated_at`,
      [status, id],
    );

    if (!result.rows.length) {
      return res.status(404).json({
        success: false,
        message: "Message not found.",
      });
    }

    res.json({
      success: true,
      message: "Message status updated.",
      data: result.rows[0],
    });
  } catch (error) {
    console.error("Update message error:", error.message);
    res.status(500).json({
      success: false,
      message: "Could not update message.",
    });
  }
});

module.exports = router;
