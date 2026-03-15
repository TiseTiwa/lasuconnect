const express = require("express");
const router = express.Router();

// admin routes — to be implemented in upcoming steps
router.get("/health", (req, res) => {
  res.json({ success: true, message: "admin module is live" });
  router.get("/pending-roles", getPendingRoles);
  router.patch("/users/:id/approve-role", approveRole);
});

module.exports = router;
