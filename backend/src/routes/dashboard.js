const express = require("express");
const pool = require("../config/db");
const { authenticateToken, requireAdmin } = require("../middleware/auth");

const router = express.Router();

// GET /api/dashboard/stats
// Only authenticated administrators can view these totals.
router.get("/stats", authenticateToken, requireAdmin, async (req, res) => {
  try {
    // Fetch dashboard totals from PostgreSQL.
    const result = await pool.query(`
      SELECT
        (SELECT COUNT(*)::int
         FROM users
         WHERE is_active = TRUE) AS active_users,

        (SELECT COUNT(*)::int
         FROM employees
         WHERE archived_at IS NULL
           AND status = 'active') AS active_employees,

        (SELECT COUNT(*)::int
         FROM customers
         WHERE archived_at IS NULL
           AND status = 'active') AS active_customers,

        (SELECT COUNT(*)::int
         FROM services
         WHERE archived_at IS NULL
           AND status = 'active') AS active_services,

        (SELECT COUNT(*)::int
         FROM service_requests
         WHERE archived_at IS NULL
           AND status = 'pending') AS pending_requests,

        (SELECT COUNT(*)::int
         FROM contact_messages
         WHERE status = 'new') AS new_messages
    `);

    return res.status(200).json({
      success: true,
      data: result.rows[0],
    });
  } catch (error) {
    console.error("Dashboard statistics error:", error.message);

    return res.status(500).json({
      success: false,
      message: "Unable to load dashboard statistics.",
    });
  }
});

module.exports = router;
