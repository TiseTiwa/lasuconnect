const express = require("express");
const { body, query } = require("express-validator");
const router = express.Router();

const {
  register,
  verifyEmail,
  resendVerification,
  login,
  refreshToken,
  getMe,
  logout,
  forgotPassword,
  resetPassword,
} = require("./auth.controller");

const { protect } = require("../../middleware/auth");
const validate = require("../../middleware/validate");

// ── Input validation rules ────────────────────────────────

const registerRules = [
  body("fullName")
    .trim()
    .notEmpty()
    .withMessage("Full name is required")
    .isLength({ max: 100 }),
  body("username")
    .trim()
    .notEmpty()
    .withMessage("Username is required")
    .isLength({ min: 3, max: 30 })
    .withMessage("Username must be 3–30 characters")
    .matches(/^[a-zA-Z0-9_]+$/)
    .withMessage("Username can only contain letters, numbers, and underscores"),
  body("email")
    .trim()
    .isEmail()
    .withMessage("Please provide a valid email")
    .normalizeEmail({ gmail_dots: false }),
  body("matricNumber")
    .trim()
    .notEmpty()
    .withMessage("Matric number is required"),
  body("password")
    .isLength({ min: 8 })
    .withMessage("Password must be at least 8 characters"),
  body("faculty").trim().notEmpty().withMessage("Faculty is required"),
  body("department").trim().notEmpty().withMessage("Department is required"),
  body("level")
    .isIn(["100", "200", "300", "400", "500", "alumni"])
    .withMessage("Invalid level"),
];

const loginRules = [
  body("email")
    .trim()
    .isEmail()
    .withMessage("Please provide a valid email")
    .normalizeEmail({ gmail_dots: false }),
  body("password").notEmpty().withMessage("Password is required"),
];

// ── Routes ─────────────────────────────────────────────────

// Public routes
router.post(
  "/register",
  [
    body("fullName").trim().notEmpty().withMessage("Full name is required"),
    body("email").isEmail().withMessage("Valid email is required"),
    body("username").trim().notEmpty().withMessage("Username is required"),
    body("password")
      .isLength({ min: 6 })
      .withMessage("Password must be at least 6 characters"),
    body("faculty").trim().notEmpty().withMessage("Faculty is required"),
    body("department").trim().notEmpty().withMessage("Department is required"),
    body("requestedRole").notEmpty().withMessage("Role is required"),
    // matricNumber and level are validated conditionally in the controller
    // so do NOT add .notEmpty() here
  ],
  validate,
  register,
);
router.post("/login", loginRules, validate, login);
router.get("/verify-email", verifyEmail);
router.post("/resend-verification", resendVerification);
router.post("/refresh-token", refreshToken);
router.post(
  "/forgot-password",
  body("email").isEmail(),
  validate,
  forgotPassword,
);
router.patch("/reset-password", resetPassword);

// Protected routes (require valid JWT)
router.get("/me", protect, getMe);
router.post("/logout", protect, logout);

module.exports = router;
