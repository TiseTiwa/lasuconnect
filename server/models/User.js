const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const userSchema = new mongoose.Schema(
  {
    fullName: {
      type: String,
      required: [true, 'Full name is required'],
      trim: true,
      maxlength: 100,
    },
    username: {
      type: String,
      trim: true,
      lowercase: true,
      maxlength: 30,
    },
    email: {
      type: String,
      required: [true, 'Email is required'],
      lowercase: true,
      trim: true,
    },
    passwordHash: {
      type: String,
      required: [true, 'Password is required'],
      minlength: 6,
      select: false,
    },
    role: {
      type: String,
      enum: ['student', 'course_rep', 'lecturer', 'admin', 'super_admin'],
      default: 'student',
    },
    // Whether the role claim has been confirmed
    // lecturer: auto-true via email domain
    // course_rep: true after admin approves
    // student: always true
    roleVerified: {
      type: Boolean,
      default: false,
    },

    // ── Academic identity ─────────────────────────────
    matricNumber: { type: String, trim: true, default: null },
    staffId:      { type: String, trim: true, default: null }, // for lecturers

    faculty:     { type: String, trim: true, default: '' },
    department:  { type: String, trim: true, default: '' },
    level: {
      type: String,
      enum: ['100', '200', '300', '400', '500', null],
      default: null,
    },
    semester: { type: String, enum: ['first', 'second', null], default: null },

    // ── Profile ───────────────────────────────────────
    bio:       { type: String, maxlength: 160, default: '' },
    avatarUrl: { type: String, default: '' },
    coverUrl:  { type: String, default: '' },
    interests: [{ type: String, trim: true }],
    skills:    [{ type: String, trim: true }],

    // ── Social ────────────────────────────────────────
    followers: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],
    following: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],

    // ── Verification ──────────────────────────────────
    isVerified:        { type: Boolean, default: false },
    verificationToken: { type: String, select: false },
    resetToken:        { type: String, select: false },
    resetTokenExpiry:  { type: Date,   select: false },
    refreshToken:      { type: String, select: false },

    // ── Status ────────────────────────────────────────
    isActive:  { type: Boolean, default: true },
    lastSeen:  { type: Date, default: Date.now },

    // ── Badges ────────────────────────────────────────
    badges: [{ type: String }],
  },
  {
    timestamps: true,
    toJSON:   { virtuals: true },
    toObject: { virtuals: true },
  }
);

// ── Indexes ───────────────────────────────────────────────
userSchema.index({ email: 1 },        { unique: true });
userSchema.index({ username: 1 },     { unique: true, sparse: true });
userSchema.index({ matricNumber: 1 }, { unique: true, sparse: true });
userSchema.index({ staffId: 1 },      { sparse: true });
userSchema.index({ department: 1, faculty: 1, level: 1 });

// ── Hash password before save ─────────────────────────────
userSchema.pre('save', async function (next) {
  if (!this.isModified('passwordHash')) return next();
  this.passwordHash = await bcrypt.hash(this.passwordHash, 12);
  next();
});

userSchema.methods.comparePassword = async function (password) {
  return bcrypt.compare(password, this.passwordHash);
};

const User = mongoose.model('User', userSchema);
module.exports = User;
