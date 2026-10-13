const express = require("express");
const pool = require("../config/db");
const { authenticateToken, requireAdmin } = require("../middleware/auth");

const router = express.Router();

// Every employee endpoint requires an authenticated administrator.
router.use(authenticateToken, requireAdmin);

// Validate employee input shared by create and update operations.
function validateEmployee(body) {
  const { full_name, email, phone, position, salary, hire_date, status } = body;

  if (
    typeof full_name !== "string" ||
    !full_name.trim() ||
    full_name.trim().length > 150
  ) {
    return "Full name is required and must be at most 150 characters.";
  }

  if (
    typeof email !== "string" ||
    !email.trim() ||
    email.trim().length > 255 ||
    !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())
  ) {
    return "A valid email address is required.";
  }

  if (
    typeof position !== "string" ||
    !position.trim() ||
    position.trim().length > 150
  ) {
    return "Position is required and must be at most 150 characters.";
  }

  if (
    phone !== undefined &&
    phone !== null &&
    (typeof phone !== "string" || phone.trim().length > 50)
  ) {
    return "Phone must be a string of at most 50 characters.";
  }

  if (
    salary !== undefined &&
    salary !== null &&
    (salary === "" ||
      !Number.isFinite(Number(salary)) ||
      Number(salary) < 0 ||
      Number(salary) > 9999999999999.99)
  ) {
    return "Salary must be a valid non-negative number.";
  }

  if (
    hire_date !== undefined &&
    hire_date !== null &&
    hire_date !== "" &&
    (typeof hire_date !== "string" ||
      !/^\d{4}-\d{2}-\d{2}$/.test(hire_date) ||
      !isValidDate(hire_date))
  ) {
    return "Hire date must be a valid date in YYYY-MM-DD format.";
  }

  if (status !== undefined && !["active", "inactive"].includes(status)) {
    return "Status must be active or inactive.";
  }

  return null;
}

function isValidDate(value) {
  const date = new Date(`${value}T00:00:00.000Z`);

  return (
    !Number.isNaN(date.getTime()) && date.toISOString().slice(0, 10) === value
  );
}

function employeeValues(body) {
  return [
    body.full_name.trim(),
    body.email.trim().toLowerCase(),
    body.phone?.trim() || null,
    body.position.trim(),
    body.salary === "" || body.salary === undefined
      ? null
      : (body.salary ?? null),
    body.hire_date || null,
    body.status || "active",
  ];
}

// GET /api/employees
// Return all non-archived employees.
router.get("/", async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT id, full_name, email, phone, position,
             salary, hire_date, status, created_at, updated_at
      FROM employees
      WHERE archived_at IS NULL
      ORDER BY id DESC
    `);

    return res.json({
      success: true,
      count: result.rows.length,
      data: result.rows,
    });
  } catch (error) {
    console.error("List employees error:", error.message);

    return res.status(500).json({
      success: false,
      message: "Unable to retrieve employees.",
    });
  }
});

// GET /api/employees/:id
router.get("/:id", async (req, res) => {
  const id = Number(req.params.id);

  if (!Number.isInteger(id) || id <= 0) {
    return res.status(400).json({
      success: false,
      message: "Invalid employee ID.",
    });
  }

  try {
    const result = await pool.query(
      `SELECT id, full_name, email, phone, position,
              salary, hire_date, status, created_at, updated_at
       FROM employees
       WHERE id = $1 AND archived_at IS NULL`,
      [id],
    );

    if (result.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: "Employee not found.",
      });
    }

    return res.json({
      success: true,
      data: result.rows[0],
    });
  } catch (error) {
    console.error("Get employee error:", error.message);

    return res.status(500).json({
      success: false,
      message: "Unable to retrieve employee.",
    });
  }
});

// POST /api/employees
router.post("/", async (req, res) => {
  const validationError = validateEmployee(req.body);

  if (validationError) {
    return res.status(400).json({
      success: false,
      message: validationError,
    });
  }

  try {
    const values = employeeValues(req.body);

    const result = await pool.query(
      `INSERT INTO employees
        (full_name, email, phone, position, salary, hire_date, status)
       VALUES ($1, $2, $3, $4, $5, $6, $7)
       RETURNING id, full_name, email, phone, position,
                 salary, hire_date, status, created_at, updated_at`,
      values,
    );

    return res.status(201).json({
      success: true,
      message: "Employee created successfully.",
      data: result.rows[0],
    });
  } catch (error) {
    if (error.code === "23505") {
      return res.status(409).json({
        success: false,
        message: "An active employee with this email already exists.",
      });
    }

    console.error("Create employee error:", error.message);

    return res.status(500).json({
      success: false,
      message: "Unable to create employee.",
    });
  }
});

// PUT /api/employees/:id
// Replace the editable employee details.
router.put("/:id", async (req, res) => {
  const id = Number(req.params.id);

  if (!Number.isInteger(id) || id <= 0) {
    return res.status(400).json({
      success: false,
      message: "Invalid employee ID.",
    });
  }

  const validationError = validateEmployee(req.body);

  if (validationError) {
    return res.status(400).json({
      success: false,
      message: validationError,
    });
  }

  try {
    const values = employeeValues(req.body);

    const result = await pool.query(
      `UPDATE employees
       SET full_name = $1,
           email = $2,
           phone = $3,
           position = $4,
           salary = $5,
           hire_date = $6,
           status = $7,
           updated_at = NOW()
       WHERE id = $8 AND archived_at IS NULL
       RETURNING id, full_name, email, phone, position,
                 salary, hire_date, status, created_at, updated_at`,
      [...values, id],
    );

    if (result.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: "Employee not found.",
      });
    }

    return res.json({
      success: true,
      message: "Employee updated successfully.",
      data: result.rows[0],
    });
  } catch (error) {
    if (error.code === "23505") {
      return res.status(409).json({
        success: false,
        message: "An active employee with this email already exists.",
      });
    }

    console.error("Update employee error:", error.message);

    return res.status(500).json({
      success: false,
      message: "Unable to update employee.",
    });
  }
});

// DELETE /api/employees/:id
// Soft archive: preserve the record instead of physically deleting it.
router.delete("/:id", async (req, res) => {
  const id = Number(req.params.id);

  if (!Number.isInteger(id) || id <= 0) {
    return res.status(400).json({
      success: false,
      message: "Invalid employee ID.",
    });
  }

  try {
    const result = await pool.query(
      `UPDATE employees
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
        message: "Employee not found.",
      });
    }

    return res.json({
      success: true,
      message: "Employee archived successfully.",
    });
  } catch (error) {
    console.error("Archive employee error:", error.message);

    return res.status(500).json({
      success: false,
      message: "Unable to archive employee.",
    });
  }
});

module.exports = router;
