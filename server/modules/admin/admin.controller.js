// ── ADD this endpoint to your existing admin.controller.js ──

// ────────────────────────────────────────────────────────────
//  PATCH /api/admin/users/:id/approve-role
//  Approves a course_rep's role claim
// ────────────────────────────────────────────────────────────
exports.approveRole = catchAsync(async (req, res, next) => {
  if (requireAdmin(req, next)) return;

  const user = await User.findById(req.params.id);
  if (!user) return next(new AppError('User not found.', 404));

  user.roleVerified = true;
  await user.save({ validateBeforeSave: false });

  sendSuccess(res, {
    message: `${user.fullName}'s role as ${user.role.replace('_', ' ')} has been approved.`,
    data: { roleVerified: true },
  });
});

// ────────────────────────────────────────────────────────────
//  GET /api/admin/pending-roles
//  Course reps awaiting approval
// ────────────────────────────────────────────────────────────
exports.getPendingRoles = catchAsync(async (req, res, next) => {
  if (requireAdmin(req, next)) return;

  const pending = await User.find({
    role: 'course_rep',
    roleVerified: false,
    isActive: true,
  })
    .select('fullName username email matricNumber department faculty level avatarUrl createdAt')
    .sort({ createdAt: -1 })
    .lean();

  sendSuccess(res, { data: { pending } });
});

// ── ADD these routes to admin.routes.js ──────────────────────
// router.get('/pending-roles',            getPendingRoles);
// router.patch('/users/:id/approve-role', approveRole);
