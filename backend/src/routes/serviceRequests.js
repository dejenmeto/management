const express = require("express");
const pool = require("../config/db");
const { authenticateToken, requireAdmin } = require("../middleware/auth");

const router = express.Router();

router.use(authenticateToken, requireAdmin);

const validStatuses = [
  "pending",
  "approved",
  "in_progress",
  "completed",
  "cancelled",
];

// GET /api/service-requests
router.get("/", async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT
         sr.id,
         sr.customer_id,
         c.full_name AS customer_name,
         sr.service_id,
         s.name AS service_name,
         sr.created_by,
         sr.status,
         sr.price_at_request,
         sr.request_date,
         sr.notes,
         sr.created_at,
         sr.updated_at
       FROM service_requests sr
       JOIN customers c ON c.id = sr.customer_id
       JOIN services s ON s.id = sr.service_id
       WHERE sr.archived_at IS NULL
       ORDER BY sr.created_at DESC`,
    );

    res.json({
      success: true,
      count: result.rows.length,
      data: result.rows,
    });
  } catch (error) {
    console.error("List service requests error:", error.message);
    res.status(500).json({
      success: false,
      message: "Could not load service requests.",
    });
  }
});

// GET /api/service-requests/:id
router.get("/:id", async (req, res) => {
  const id = Number(req.params.id);

  if (!Number.isSafeInteger(id) || id <= 0) {
    return res.status(400).json({
      success: false,
      message: "Invalid request ID.",
    });
  }

  try {
    const result = await pool.query(
      `SELECT sr.*, c.full_name AS customer_name,
              s.name AS service_name
       FROM service_requests sr
       JOIN customers c ON c.id = sr.customer_id
       JOIN services s ON s.id = sr.service_id
       WHERE sr.id = $1 AND sr.archived_at IS NULL`,
      [id],
    );

    if (!result.rows.length) {
      return res.status(404).json({
        success: false,
        message: "Service request not found.",
      });
    }

    res.json({ success: true, data: result.rows[0] });
  } catch (error) {
    console.error("Get service request error:", error.message);
    res.status(500).json({
      success: false,
      message: "Could not load service request.",
    });
  }
});

// POST /api/service-requests
router.post("/", async (req, res) => {
  const customerId = Number(req.body?.customer_id);
  const serviceId = Number(req.body?.service_id);
  const requestDate = req.body?.request_date || null;
  const notes = req.body?.notes?.trim() || null;

  if (
    !Number.isSafeInteger(customerId) ||
    customerId <= 0 ||
    !Number.isSafeInteger(serviceId) ||
    serviceId <= 0
  ) {
    return res.status(400).json({
      success: false,
      message: "Select a valid customer and service.",
    });
  }

  if (notes && notes.length > 2000) {
    return res.status(400).json({
      success: false,
      message: "Notes must not exceed 2000 characters.",
    });
  }

  if (requestDate && !/^\d{4}-\d{2}-\d{2}$/.test(requestDate)) {
    return res.status(400).json({
      success: false,
      message: "Request date must use YYYY-MM-DD format.",
    });
  }

  const client = await pool.connect();

  try {
    await client.query("BEGIN");

    const customerResult = await client.query(
      `SELECT id FROM customers
       WHERE id = $1 AND archived_at IS NULL AND status = 'active'
       FOR UPDATE`,
      [customerId],
    );

    if (!customerResult.rows.length) {
      await client.query("ROLLBACK");
      return res.status(400).json({
        success: false,
        message: "The selected customer is unavailable or inactive.",
      });
    }

    const serviceResult = await client.query(
      `SELECT id, price FROM services
       WHERE id = $1 AND archived_at IS NULL AND status = 'active'
       FOR UPDATE`,
      [serviceId],
    );

    if (!serviceResult.rows.length) {
      await client.query("ROLLBACK");
      return res.status(400).json({
        success: false,
        message: "The selected service is unavailable or inactive.",
      });
    }

    const currentPrice = serviceResult.rows[0].price;

    const result = await client.query(
      `INSERT INTO service_requests
         (customer_id, service_id, created_by, status,
          price_at_request, request_date, notes)
       VALUES ($1, $2, $3, 'pending', $4, $5, $6)
       RETURNING *`,
      [customerId, serviceId, req.user.id, currentPrice, requestDate, notes],
    );

    await client.query("COMMIT");

    res.status(201).json({
      success: true,
      message: "Service request created successfully.",
      data: result.rows[0],
    });
  } catch (error) {
    await client.query("ROLLBACK");
    console.error("Create service request error:", error.message);

    res.status(500).json({
      success: false,
      message: "Could not create service request.",
    });
  } finally {
    client.release();
  }
});

// PUT /api/service-requests/:id - update request status and notes.
router.put("/:id", async (req, res) => {
  const id = Number(req.params.id);
  const { status, notes } = req.body || {};

  if (!Number.isSafeInteger(id) || id <= 0) {
    return res.status(400).json({
      success: false,
      message: "Invalid request ID.",
    });
  }

  if (!validStatuses.includes(status)) {
    return res.status(400).json({
      success: false,
      message: "Invalid service request status.",
    });
  }

  if (notes != null && typeof notes !== "string") {
    return res.status(400).json({
      success: false,
      message: "Notes must be text.",
    });
  }

  if (notes && notes.length > 2000) {
    return res.status(400).json({
      success: false,
      message: "Notes must not exceed 2000 characters.",
    });
  }

  try {
    const result = await pool.query(
      `UPDATE service_requests
       SET status = $1,
           notes = $2,
           updated_at = NOW()
       WHERE id = $3 AND archived_at IS NULL
       RETURNING *`,
      [status, notes?.trim() || null, id],
    );

    if (!result.rows.length) {
      return res.status(404).json({
        success: false,
        message: "Service request not found.",
      });
    }

    res.json({
      success: true,
      message: "Service request updated successfully.",
      data: result.rows[0],
    });
  } catch (error) {
    console.error("Update service request error:", error.message);
    res.status(500).json({
      success: false,
      message: "Could not update service request.",
    });
  }
});

module.exports = router;
