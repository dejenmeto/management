const jwt = require("jsonwebtoken");

// Verify that a request contains a valid JWT.
function authenticateToken(req, res, next) {
  // Expected header format: Authorization: Bearer <token>
  const authorization = req.headers.authorization;

  if (!authorization || !authorization.startsWith("Bearer ")) {
    return res.status(401).json({
      success: false,
      message: "Authentication required. Please log in.",
    });
  }

  // Remove the "Bearer " prefix to get the actual token.
  const token = authorization.split(" ")[1];

  try {
    // Verify the token using our private backend secret.
    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    // Make the authenticated user's information available
    // to the route through req.user.
    req.user = {
      id: decoded.id,
      role: decoded.role,
    };

    // Continue to the requested route.
    next();
  } catch (error) {
    return res.status(401).json({
      success: false,
      message: "Invalid or expired token. Please log in again.",
    });
  }
}

// Allow only users whose role is admin.
function requireAdmin(req, res, next) {
  if (!req.user || req.user.role !== "admin") {
    return res.status(403).json({
      success: false,
      message: "Administrator permission required.",
    });
  }

  next();
}

module.exports = {
  authenticateToken,
  requireAdmin,
};
