const express = require('express');
const router = express.Router();
const { protect, restrictTo } = require('../../middleware/auth');
const {
  getStats,
  getUsers,
  updateUserRole,
  verifyUser,
  toggleSuspend,
  getPosts,
  adminDeletePost,
} = require('./admin.controller');

const adminOnly = [protect, restrictTo('admin', 'super_admin')];

router.get('/stats',                adminOnly, getStats);
router.get('/users',                adminOnly, getUsers);
router.patch('/users/:id/role',     adminOnly, updateUserRole);
router.patch('/users/:id/verify',   adminOnly, verifyUser);
router.patch('/users/:id/suspend',  adminOnly, toggleSuspend);
router.get('/posts',                adminOnly, getPosts);
router.delete('/posts/:id',         adminOnly, adminDeletePost);

module.exports = router;
