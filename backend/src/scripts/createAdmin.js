require("dotenv").config();

const readline = require("node:readline/promises");
const { stdin, stdout } = require("node:process");
const bcrypt = require("bcryptjs");
const pool = require("../config/db");

async function main() {
  const terminal = readline.createInterface({ input: stdin, output: stdout });

  try {
    // Collect the administrator's details from the trusted terminal.
    const name = (await terminal.question("Administrator name: ")).trim();
    const email = (await terminal.question("Administrator email: "))
      .trim()
      .toLowerCase();

    // Password input is hidden from terminal history, but this
    // simple prompt does echo characters. Avoid using a shared screen.
    const password = await terminal.question("Administrator password: ");

    if (!name || name.length > 150) {
      throw new Error("Name is required and must be at most 150 characters.");
    }

    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) || email.length > 255) {
      throw new Error("Enter a valid email address.");
    }

    if (password.length < 8 || Buffer.byteLength(password, "utf8") > 72) {
      throw new Error(
        "Password must be at least 8 characters and at most 72 UTF-8 bytes.",
      );
    }

    // Refuse to promote an existing account by accident.
    const existing = await pool.query(
      "SELECT id FROM users WHERE LOWER(email) = $1",
      [email],
    );

    if (existing.rows.length > 0) {
      throw new Error(
        "An account with this email already exists. No account was changed.",
      );
    }

    const passwordHash = await bcrypt.hash(password, 12);

    const result = await pool.query(
      `INSERT INTO users (name, email, password_hash, role, is_active)
       VALUES ($1, $2, $3, 'admin', TRUE)
       RETURNING id, name, email, role`,
      [name, email, passwordHash],
    );

    console.log("\nAdministrator account created successfully:");
    console.table([result.rows[0]]);
    console.log("You can now log in through the website.");
  } catch (error) {
    console.error("\nCould not create administrator:", error.message);
    process.exitCode = 1;
  } finally {
    terminal.close();
    await pool.end();
  }
}

main();
