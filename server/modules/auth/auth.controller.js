const User = require("../../models/User");
const catchAsync = require("../../utils/catchAsync");
const AppError = require("../../utils/AppError");
const { sendSuccess } = require("../../utils/apiResponse");
const {
  generateAccessToken,
  generateRefreshToken,
  setRefreshTokenCookie,
  clearRefreshTokenCookie,
} = require("../../utils/jwt");
const {
  sendVerificationEmail,
  sendPasswordResetEmail,
} = require("../../utils/email");
const crypto = require("crypto");

// ── Email domain → role mapping ───────────────────────────
const LASU_DOMAINS = {
  STUDENT: ["@student.lasu.edu.ng", "@st.lasu.edu.ng"],
  LECTURER: ["@lasu.edu.ng"],
};

// In dev mode any email is accepted
const isDev = process.env.NODE_ENV === "development";

const detectRoleFromEmail = (email) => {
  const lower = email.toLowerCase();
  if (LASU_DOMAINS.LECTURER.some((d) => lower.endsWith(d))) return "lecturer";
  if (LASU_DOMAINS.STUDENT.some((d) => lower.endsWith(d))) return "student";
  return null; // not a LASU email
};

const isLASUEmail = (email) => {
  return isDev || detectRoleFromEmail(email) !== null;
};

// ────────────────────────────────────────────────────────────
//  POST /api/auth/register
// ────────────────────────────────────────────────────────────
exports.register = catchAsync(async (req, res, next) => {
  const {
    fullName,
    email,
    password,
    username,
    matricNumber,
    staffId,
    faculty,
    department,
    level,
    semester,
    requestedRole, // what the user selected: student | lecturer | course_rep
  } = req.body;

  // ── Validation ────────────────────────────────────────
  if (!fullName?.trim())
    return next(new AppError("Full name is required.", 400));
  if (!email?.trim()) return next(new AppError("Email is required.", 400));
  if (!password) return next(new AppError("Password is required.", 400));
  if (!username?.trim())
    return next(new AppError("Username is required.", 400));
  if (!faculty?.trim()) return next(new AppError("Faculty is required.", 400));
  if (!department?.trim())
    return next(new AppError("Department is required.", 400));

  // ── Email domain check ────────────────────────────────
  if (!isLASUEmail(email)) {
    return next(
      new AppError(
        "Please use your official LASU email address (@lasu.edu.ng or @student.lasu.edu.ng).",
        400,
      ),
    );
  }

  // ── Determine actual role ─────────────────────────────
  const emailRole = detectRoleFromEmail(email); // always detect

  let finalRole = "student";
  let isVerifiedRole = false;

  if (emailRole === "lecturer") {
    finalRole = "lecturer";
    isVerifiedRole = true;
  } else if (!isDev && emailRole === null) {
    return next(
      new AppError(
        "Please use your official LASU email address (@lasu.edu.ng or @student.lasu.edu.ng).",
        400,
      ),
    );
  } else if (requestedRole === "course_rep") {
    finalRole = "course_rep";
    isVerifiedRole = false;
  } else {
    finalRole = "student";
    isVerifiedRole = false;
  }

  // ── Role-specific field validation ────────────────────
  if (finalRole === "lecturer") {
    if (!staffId?.trim())
      return next(new AppError("Staff ID is required for lecturers.", 400));
  }
  if (finalRole === "student" || finalRole === "course_rep") {
    if (!matricNumber?.trim())
      return next(new AppError("Matric number is required.", 400));
    if (!level) return next(new AppError("Level is required.", 400));
  }

  // ── Duplicate check ───────────────────────────────────
  const [emailExists, usernameExists, matricExists] = await Promise.all([
    User.findOne({ email: email.toLowerCase() }),
    User.findOne({ username: username.toLowerCase().trim() }),
    matricNumber
      ? User.findOne({ matricNumber: matricNumber.trim() })
      : Promise.resolve(null),
  ]);

  if (emailExists)
    return next(
      new AppError("An account with this email already exists.", 409),
    );
  if (usernameExists)
    return next(new AppError("That username is already taken.", 409));
  if (matricExists)
    return next(
      new AppError("An account with this matric number already exists.", 409),
    );

  // ── Create user ───────────────────────────────────────
  const verificationToken = crypto.randomBytes(32).toString("hex");

  const user = await User.create({
    fullName: fullName.trim(),
    email: email.toLowerCase().trim(),
    passwordHash: password,
    username: username.toLowerCase().trim(),
    matricNumber: matricNumber?.trim() || null,
    staffId: staffId?.trim() || null,
    faculty: faculty.trim(),
    department: department.trim(),
    level: level || null,
    role: finalRole,
    roleVerified: isVerifiedRole, // lecturer = true, others = false until admin approves
    verificationToken,
    isVerified: isDev, // email verification — auto in dev
  });

  // ── Send verification email ────────────────────────────
  try {
    await sendVerificationEmail(user.email, verificationToken);
  } catch (_) {
    // Non-fatal — user can resend
  }

  sendSuccess(res, {
    statusCode: 201,
    message: isDev
      ? "Account created successfully!"
      : `Account created! Please check ${user.email} to verify your account.`,
    data: {
      user: {
        _id: user._id,
        fullName: user.fullName,
        username: user.username,
        email: user.email,
        role: user.role,
        roleVerified: user.roleVerified,
        faculty: user.faculty,
        department: user.department,
        level: user.level,
        isVerified: user.isVerified,
      },
    },
  });
});

// ────────────────────────────────────────────────────────────
//  POST /api/auth/login
// ────────────────────────────────────────────────────────────
exports.login = catchAsync(async (req, res, next) => {
  const { email, password } = req.body;
  if (!email || !password)
    return next(new AppError("Email and password are required.", 400));

  const user = await User.findOne({ email: email.toLowerCase() }).select(
    "+passwordHash +refreshToken",
  );
  if (!user) return next(new AppError("Invalid credentials.", 401));

  const isMatch = await user.comparePassword(password);
  if (!isMatch) return next(new AppError("Invalid credentials.", 401));

  if (!user.isVerified && !isDev) {
    return next(
      new AppError("Please verify your email before logging in.", 401),
    );
  }

  if (!user.isActive) {
    return next(
      new AppError(
        "Your account has been suspended. Please contact support.",
        403,
      ),
    );
  }

  user.lastSeen = new Date();
  const refreshToken = generateRefreshToken(user._id);
  user.refreshToken = refreshToken;
  await user.save({ validateBeforeSave: false });

  const accessToken = generateAccessToken(user._id);
  setRefreshTokenCookie(res, refreshToken);

  sendSuccess(res, {
    message: "Login successful!",
    data: {
      accessToken,
      user: {
        _id: user._id,
        fullName: user.fullName,
        username: user.username,
        email: user.email,
        role: user.role,
        roleVerified: user.roleVerified,
        faculty: user.faculty,
        department: user.department,
        level: user.level,
        avatarUrl: user.avatarUrl,
        coverUrl: user.coverUrl,
        isVerified: user.isVerified,
        badges: user.badges,
      },
    },
  });
});

// ────────────────────────────────────────────────────────────
//  GET /api/auth/me
// ────────────────────────────────────────────────────────────
exports.getMe = catchAsync(async (req, res, next) => {
  const user = await User.findById(req.user._id).select(
    "-passwordHash -refreshToken -verificationToken -resetToken",
  );
  if (!user) return next(new AppError("User not found.", 404));
  sendSuccess(res, { data: { user } });
});

// ────────────────────────────────────────────────────────────
//  POST /api/auth/logout
// ────────────────────────────────────────────────────────────
exports.logout = catchAsync(async (req, res, next) => {
  await User.findByIdAndUpdate(req.user._id, { refreshToken: null });
  clearRefreshTokenCookie(res);
  sendSuccess(res, { message: "Logged out successfully." });
});

// ────────────────────────────────────────────────────────────
//  POST /api/auth/refresh-token
// ────────────────────────────────────────────────────────────
exports.refreshToken = catchAsync(async (req, res, next) => {
  const token = req.cookies?.refreshToken;
  if (!token) return next(new AppError("No refresh token.", 401));

  const jwt = require("jsonwebtoken");
  let decoded;
  try {
    decoded = jwt.verify(token, process.env.JWT_REFRESH_SECRET);
  } catch {
    return next(new AppError("Invalid or expired refresh token.", 401));
  }

  const user = await User.findOne({
    _id: decoded.id,
    refreshToken: token,
  }).select("+refreshToken");
  if (!user) return next(new AppError("Invalid refresh token.", 401));

  const newRefreshToken = generateRefreshToken(user._id);
  user.refreshToken = newRefreshToken;
  await user.save({ validateBeforeSave: false });

  const accessToken = generateAccessToken(user._id);
  setRefreshTokenCookie(res, newRefreshToken);

  sendSuccess(res, { data: { accessToken } });
});

// ────────────────────────────────────────────────────────────
//  GET /api/auth/verify-email?token=
// ────────────────────────────────────────────────────────────
exports.verifyEmail = catchAsync(async (req, res, next) => {
  const { token } = req.query;
  if (!token) return next(new AppError("Verification token is required.", 400));

  const user = await User.findOne({ verificationToken: token });
  if (!user)
    return next(new AppError("Invalid or expired verification token.", 400));

  user.isVerified = true;
  user.verificationToken = undefined;
  await user.save({ validateBeforeSave: false });

  sendSuccess(res, {
    message: "Email verified successfully! You can now log in.",
  });
});

// ────────────────────────────────────────────────────────────
//  POST /api/auth/resend-verification
// ────────────────────────────────────────────────────────────
exports.resendVerification = catchAsync(async (req, res, next) => {
  const { email } = req.body;
  const user = await User.findOne({ email: email?.toLowerCase() });
  if (!user) return next(new AppError("No account with that email.", 404));
  if (user.isVerified)
    return next(new AppError("Email already verified.", 400));

  const token = crypto.randomBytes(32).toString("hex");
  user.verificationToken = token;
  await user.save({ validateBeforeSave: false });

  await sendVerificationEmail(user.email, token);
  sendSuccess(res, { message: "Verification email resent." });
});

// ────────────────────────────────────────────────────────────
//  POST /api/auth/forgot-password
// ────────────────────────────────────────────────────────────
exports.forgotPassword = catchAsync(async (req, res, next) => {
  const user = await User.findOne({ email: req.body.email?.toLowerCase() });
  if (!user) return next(new AppError("No account with that email.", 404));

  const token = crypto.randomBytes(32).toString("hex");
  user.resetToken = token;
  user.resetTokenExpiry = Date.now() + 60 * 60 * 1000; // 1 hour
  await user.save({ validateBeforeSave: false });

  await sendPasswordResetEmail(user.email, token);
  sendSuccess(res, { message: "Password reset email sent." });
});

// ────────────────────────────────────────────────────────────
//  PATCH /api/auth/reset-password
// ────────────────────────────────────────────────────────────
exports.resetPassword = catchAsync(async (req, res, next) => {
  const { token, password } = req.body;
  const user = await User.findOne({
    resetToken: token,
    resetTokenExpiry: { $gt: Date.now() },
  });
  if (!user) return next(new AppError("Invalid or expired reset token.", 400));

  user.passwordHash = password;
  user.resetToken = undefined;
  user.resetTokenExpiry = undefined;
  await user.save();

  sendSuccess(res, { message: "Password reset successfully. Please log in." });
});
