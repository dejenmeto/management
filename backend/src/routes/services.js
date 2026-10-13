const express = require("express");

// Create a separate router for service-related API endpoints.
const router = express.Router();
const { authenticateToken, requireAdmin } = require("../middleware/auth");

// Import our existing Neon PostgreSQL connection pool.
// The path goes up one level from routes/ to src/.
const pool = require("../config/db");

// GET /api/services
// Return all active, non-archived services.
router.get("/", async (req, res) => {
  try {
    // Execute SQL against the Neon PostgreSQL database.
    const result = await pool.query(
      `
      SELECT
        id,
        name,
        description,
        price,
        status,
        created_at
      FROM services
      WHERE status = $1
        AND archived_at IS NULL
      ORDER BY id ASC
    `,
      ["active"],
    );

    // Send the database rows to the client as JSON.
    res.status(200).json({
      success: true,
      count: result.rows.length,
      data: result.rows,
    });
  } catch (error) {
    // Keep detailed errors in the backend terminal for debugging.
    console.error("Error fetching services:", error.message);

    // Return a generic message rather than exposing database details.
    res.status(500).json({
      success: false,
      message: "Failed to retrieve services.",
    });
  }
});

// GET /api/services/:id
// Return one active, non-archived service using its database ID.
router.get("/:id", async (req, res) => {
  try {
    // req.params.id reads the ID from the URL.
    // Example: /api/services/5 gives req.params.id === "5".
    const serviceId = Number(req.params.id);

    // Validate the ID before sending it to PostgreSQL.
    if (!Number.isInteger(serviceId) || serviceId <= 0) {
      return res.status(400).json({
        success: false,
        message: "Service ID must be a positive integer.",
      });
    }

    // Use a parameterized query to find the requested service.
    const result = await pool.query(
      `SELECT id, name, description, price, status, created_at
       FROM services
       WHERE id = $1
         AND status = $2
         AND archived_at IS NULL`,
      [serviceId, "active"],
    );

    // Return 404 if the service does not exist or is not public.
    if (result.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: "Service not found.",
      });
    }

    // Send the single service record as JSON.
    res.status(200).json({
      success: true,
      data: result.rows[0],
    });
  } catch (error) {
    // Log details for debugging without exposing them to API clients.
    console.error("Error fetching service:", error.message);

    res.status(500).json({
      success: false,
      message: "Failed to retrieve service.",
    });
  }
});

// other functions after the react

function validateService(body) {
  if (!body.name || !String(body.name).trim()) {
    return "Service name is required.";
  }

  if (String(body.name).trim().length > 150) {
    return "Service name must not exceed 150 characters.";
  }

  if (body.description != null && typeof body.description !== "string") {
    return "Description must be text.";
  }

  const price = Number(body.price);

  if (
    body.price === "" ||
    body.price == null ||
    !Number.isFinite(price) ||
    price < 0
  ) {
    return "A valid non-negative price is required.";
  }

  if (body.status != null && !["active", "inactive"].includes(body.status)) {
    return "Status must be active or inactive.";
  }

  return null;
}

// POST /api/services - create a service (administrator only).
router.post("/", authenticateToken, requireAdmin, async (req, res) => {
  const validationError = validateService(req.body || {});

  if (validationError) {
    return res.status(400).json({
      success: false,
      message: validationError,
    });
  }

  try {
    const { name, description, price, status } = req.body;

    const result = await pool.query(
      `INSERT INTO services (name, description, price, status)
       VALUES ($1, $2, $3, $4)
       RETURNING id, name, description, price, status,
                 created_at, updated_at`,
      [
        name.trim(),
        description?.trim() || null,
        Number(price),
        status || "active",
      ],
    );

    res.status(201).json({
      success: true,
      message: "Service created successfully.",
      data: result.rows[0],
    });
  } catch (error) {
    console.error("Create service error:", error.message);
    res.status(500).json({
      success: false,
      message: "Could not create service.",
    });
  }
});

// PUT /api/services/:id - update a service.
router.put("/:id", authenticateToken, requireAdmin, async (req, res) => {
  const id = Number(req.params.id);

  if (!Number.isSafeInteger(id) || id <= 0) {
    return res.status(400).json({
      success: false,
      message: "Invalid service ID.",
    });
  }

  const validationError = validateService(req.body || {});

  if (validationError) {
    return res.status(400).json({
      success: false,
      message: validationError,
    });
  }

  try {
    const { name, description, price, status } = req.body;

    const result = await pool.query(
      `UPDATE services
       SET name = $1,
           description = $2,
           price = $3,
           status = $4,
           updated_at = NOW()
       WHERE id = $5 AND archived_at IS NULL
       RETURNING id, name, description, price, status,
                 created_at, updated_at`,
      [
        name.trim(),
        description?.trim() || null,
        Number(price),
        status || "active",
        id,
      ],
    );

    if (result.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: "Service not found.",
      });
    }

    res.json({
      success: true,
      message: "Service updated successfully.",
      data: result.rows[0],
    });
  } catch (error) {
    console.error("Update service error:", error.message);
    res.status(500).json({
      success: false,
      message: "Could not update service.",
    });
  }
});

// DELETE /api/services/:id - archive instead of physically deleting.
router.delete("/:id", authenticateToken, requireAdmin, async (req, res) => {
  const id = Number(req.params.id);

  if (!Number.isSafeInteger(id) || id <= 0) {
    return res.status(400).json({
      success: false,
      message: "Invalid service ID.",
    });
  }

  try {
    const result = await pool.query(
      `UPDATE services
       SET archived_at = NOW(),
           status = 'inactive',
           updated_at = NOW()
       WHERE id = $1 AND archived_at IS NULL
       RETURNING id`,
      [id],
    );

    if (result.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: "Service not found.",
      });
    }

    res.json({
      success: true,
      message: "Service archived successfully.",
    });
  } catch (error) {
    console.error("Archive service error:", error.message);
    res.status(500).json({
      success: false,
      message: "Could not archive service.",
    });
  }
});

// other too

router.get("/admin/all", authenticateToken, requireAdmin, async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT id, name, description, price, status,
                created_at, updated_at
         FROM services
         WHERE archived_at IS NULL
         ORDER BY created_at DESC`,
    );

    res.json({
      success: true,
      count: result.rows.length,
      data: result.rows,
    });
  } catch (error) {
    console.error("Admin list services error:", error.message);
    res.status(500).json({
      success: false,
      message: "Could not load services.",
    });
  }
});

// Export the router so server.js can register it.
module.exports = router;
