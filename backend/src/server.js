require("dotenv").config();

const express = require("express");
// NEW: Import the services API router.

const cors = require("cors");
// Import the PostgreSQL connection pool.
const pool = require("./config/db");
const app = express();
const servicesRouter = require("./routes/services");
// NEW: Import the contact form API.
const contactRouter = require("./routes/contact");
const authRouter = require("./routes/auth");
const dashboardRouter = require("./routes/dashboard");
const employeesRouter = require("./routes/employees");
const customersRouter = require("./routes/customers");
const serviceRequestsRouter = require("./routes/serviceRequests");
const messagesRouter = require("./routes/messages");
// Allow the local React frontend to communicate with this backend.
app.use(
  cors({
    origin: process.env.CLIENT_URL,
  }),
);

// Allow Express to read JSON request bodies.
app.use(express.json());
// NEW: Mount the services router at /api/services.
app.use("/api/services", servicesRouter);
// NEW: Mount the contact router at /api/contact.
app.use("/api/contact", contactRouter);
app.use("/api/auth", authRouter);
app.use("/api/dashboard", dashboardRouter);
app.use("/api/employees", employeesRouter);
app.use("/api/customers", customersRouter);
app.use("/api/service-requests", serviceRequestsRouter);
app.use("/api/messages", messagesRouter);

// A simple test route to check whether the server is running.
app.get("/", (req, res) => {
  res.json({
    message: "Company Management API is running",
  });
});

// Test the connection between Express and Neon PostgreSQL.
app.get("/api/health/db", async (req, res) => {
  try {
    // Ask PostgreSQL to return its current time.
    const result = await pool.query("SELECT NOW() AS database_time");

    res.json({
      message: "Database connection successful",
      databaseTime: result.rows[0].database_time,
    });
  } catch (error) {
    // Log the detailed error in the backend terminal for debugging.
    console.error("Database connection error:", error.message);

    // Do not expose database credentials or internal errors to users.
    res.status(500).json({
      message: "Database connection failed",
    });
  }
});

// Read the port from .env, or use port 3000 by default.
const PORT = process.env.PORT || 3000;

// Start listening for incoming HTTP requests.
// app.listen(PORT, () => {
//   console.log(`Server running at http://localhost:${PORT}`);
// });
// const PORT = process.env.PORT || 3000;

app.listen(PORT, "0.0.0.0", () => {
  console.log(`Server running on port ${PORT}`);
});
