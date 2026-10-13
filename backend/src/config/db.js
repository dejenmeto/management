const { Pool } = require("pg");

// Create a connection pool for our Neon PostgreSQL database.
// A pool lets the backend reuse database connections efficiently.
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,

  // Neon requires an encrypted connection.
  // Enable SSL when connecting to the hosted database.
  ssl: {
    rejectUnauthorized: false,
  },
});

// Export the pool so API routes can run database queries.
module.exports = pool;
