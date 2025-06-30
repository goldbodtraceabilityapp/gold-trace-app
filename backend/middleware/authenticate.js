const jwt = require("jsonwebtoken");
const { Pool } = require("pg");

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});

module.exports = async function authenticate(req, res, next) {
  const authHeader = req.headers.authorization || "";
  const token = authHeader.split(" ")[1];
  if (!token) return res.status(401).json({ error: "Missing token" });

  try {
    const payload = jwt.verify(token, process.env.JWT_SECRET);
    // Fetch user id, username, and role from DB using SQL
    const result = await pool.query(
      "SELECT id, username, role FROM users WHERE id = $1",
      [payload.id]
    );
    const user = result.rows[0];
    if (!user) return res.status(401).json({ error: "Invalid user" });
    req.user = { id: user.id, username: user.username, role: user.role };
    next();
  } catch {
    res.status(401).json({ error: "Invalid token" });
  }
};