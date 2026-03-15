const Notification = require('../../models/Notification');
const catchAsync = require('../../utils/catchAsync');
const AppError = require('../../utils/AppError');
const { sendSuccess } = require('../../utils/apiResponse');

const ACTOR_SELECT = 'fullName username avatarUrl';

exports.getNotifications = catchAsync(async (req, res, next) => {
  const { page = 1, limit = 20 } = req.query;
  const skip = (parseInt(page) - 1) * parseInt(limit);

  const [notifications, total, unreadCount] = await Promise.all([
    Notification.find({ recipient: req.user._id })
      .populate('actor', ACTOR_SELECT)
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(parseInt(limit))
      .lean(),
    Notification.countDocuments({ recipient: req.user._id }),
    Notification.countDocuments({ recipient: req.user._id, isRead: false }),
  ]);

  sendSuccess(res, {
    data: { notifications },
    meta: {
      total,
      unreadCount,
      page: parseInt(page),
      hasMore: skip + notifications.length < total,
    },
  });
});

exports.getUnreadCount = catchAsync(async (req, res, next) => {
  const count = await Notification.countDocuments({ recipient: req.user._id, isRead: false });
  sendSuccess(res, { data: { count } });
});

exports.markAsRead = catchAsync(async (req, res, next) => {
  await Notification.findOneAndUpdate(
    { _id: req.params.id, recipient: req.user._id },
    { isRead: true }
  );
  sendSuccess(res, { message: 'Marked as read.' });
});

exports.markAllAsRead = catchAsync(async (req, res, next) => {
  await Notification.updateMany(
    { recipient: req.user._id, isRead: false },
    { isRead: true }
  );
  sendSuccess(res, { message: 'All notifications marked as read.' });
});

exports.deleteNotification = catchAsync(async (req, res, next) => {
  await Notification.findOneAndDelete({ _id: req.params.id, recipient: req.user._id });
  sendSuccess(res, { message: 'Notification deleted.' });
});

exports.clearAll = catchAsync(async (req, res, next) => {
  await Notification.deleteMany({ recipient: req.user._id });
  sendSuccess(res, { message: 'All notifications cleared.' });
});
