const express = require("express");
const pool = require("../config/db");
const { authenticateToken, requireAdmin } = require("../middleware/auth");

const router = express.Router();

// Only authenticated administrators can manage customer records.
router.use(authenticateToken, requireAdmin);

const allowedStatuses = ["active", "inactive"];

function validateCustomer(body) {
  const { full_name, email, phone, address, status } = body;

  if (!full_name || !String(full_name).trim()) {
    return "Customer full name is required.";
  }

  if (String(full_name).trim().length > 150) {
    return "Customer name must not exceed 150 characters.";
  }

  if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return "Please provide a valid email address.";
  }

  if (email && email.length > 255) {
    return "Email must not exceed 255 characters.";
  }

  if (phone && String(phone).length > 40) {
    return "Phone must not exceed 40 characters.";
  }

  if (address && String(address).length > 500) {
    return "Address must not exceed 500 characters.";
  }

  if (status && !allowedStatuses.includes(status)) {
    return "Status must be active or inactive.";
  }

  return null;
}

function customerValues(body) {
  return [
    String(body.full_name).trim(),
    body.email ? body.email.trim().toLowerCase() : null,
    body.phone ? String(body.phone).trim() : null,
    body.address ? String(body.address).trim() : null,
    body.status || "active",
  ];
}

// GET /api/customers - list non-archived customers.
router.get("/", async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT id, full_name, email, phone, address, status,
              created_at, updated_at
       FROM customers
       WHERE archived_at IS NULL
       ORDER BY created_at DESC`,
    );

    res.json({
      success: true,
      count: result.rows.length,
      data: result.rows,
    });
  } catch (error) {
    console.error("List customers error:", error.message);
    res.status(500).json({
      success: false,
      message: "Could not load customers.",
    });
  }
});

// GET /api/customers/:id - retrieve one customer.
router.get("/:id", async (req, res) => {
  const id = Number(req.params.id);

  if (!Number.isSafeInteger(id) || id <= 0) {
    return res.status(400).json({
      success: false,
      message: "Invalid customer ID.",
    });
  }

  try {
    const result = await pool.query(
      `SELECT id, full_name, email, phone, address, status,
              created_at, updated_at
       FROM customers
       WHERE id = $1 AND archived_at IS NULL`,
      [id],
    );

    if (result.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: "Customer not found.",
      });
    }

    res.json({ success: true, data: result.rows[0] });
  } catch (error) {
    console.error("Get customer error:", error.message);
    res.status(500).json({
      success: false,
      message: "Could not load the customer.",
    });
  }
});

// POST /api/customers - create a customer.
router.post("/", async (req, res) => {
  const validationError = validateCustomer(req.body || {});

  if (validationError) {
    return res.status(400).json({
      success: false,
      message: validationError,
    });
  }

  try {
    const values = customerValues(req.body);

    const result = await pool.query(
      `INSERT INTO customers
         (full_name, email, phone, address, status)
       VALUES ($1, $2, $3, $4, $5)
       RETURNING id, full_name, email, phone, address, status,
                 created_at, updated_at`,
      values,
    );

    res.status(201).json({
      success: true,
      message: "Customer created successfully.",
      data: result.rows[0],
    });
  } catch (error) {
    console.error("Create customer error:", error.message);
    res.status(500).json({
      success: false,
      message: "Could not create customer.",
    });
  }
});

// PUT /api/customers/:id - update an existing customer.
router.put("/:id", async (req, res) => {
  const id = Number(req.params.id);

  if (!Number.isSafeInteger(id) || id <= 0) {
    return res.status(400).json({
      success: false,
      message: "Invalid customer ID.",
    });
  }

  const validationError = validateCustomer(req.body || {});

  if (validationError) {
    return res.status(400).json({
      success: false,
      message: validationError,
    });
  }

  try {
    const values = [...customerValues(req.body), id];

    const result = await pool.query(
      `UPDATE customers
       SET full_name = $1,
           email = $2,
           phone = $3,
           address = $4,
           status = $5,
           updated_at = NOW()
       WHERE id = $6 AND archived_at IS NULL
       RETURNING id, full_name, email, phone, address, status,
                 created_at, updated_at`,
      values,
    );

    if (result.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: "Customer not found.",
      });
    }

    res.json({
      success: true,
      message: "Customer updated successfully.",
      data: result.rows[0],
    });
  } catch (error) {
    console.error("Update customer error:", error.message);
    res.status(500).json({
      success: false,
      message: "Could not update customer.",
    });
  }
});

// DELETE /api/customers/:id - archive instead of physically deleting.
router.delete("/:id", async (req, res) => {
  const id = Number(req.params.id);

  if (!Number.isSafeInteger(id) || id <= 0) {
    return res.status(400).json({
      success: false,
      message: "Invalid customer ID.",
    });
  }

  try {
    // Existing service requests can continue referencing this customer.
    const result = await pool.query(
      `UPDATE customers
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
        message: "Customer not found.",
      });
    }

    res.json({
      success: true,
      message: "Customer archived successfully.",
    });
  } catch (error) {
    console.error("Archive customer error:", error.message);
    res.status(500).json({
      success: false,
      message: "Could not archive customer.",
    });
  }
});

module.exports = router;
