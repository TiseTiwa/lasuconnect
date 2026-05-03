const mongoose = require('mongoose');

const handbookCourseSchema = new mongoose.Schema(
  {
    student: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    // Source handbook
    handbookUrl:  { type: String, default: '' },
    handbookName: { type: String, default: '' },

    // Extracted + confirmed courses
    courses: [
      {
        code:        { type: String, trim: true, uppercase: true }, // e.g. CSC401
        title:       { type: String, trim: true },                  // e.g. Operating Systems
        units:       { type: Number, default: 2 },
        semester:    { type: String, enum: ['first', 'second', 'both'], default: 'first' },
        level:       { type: String, enum: ['100','200','300','400','500'] },
        isElective:  { type: Boolean, default: false },
        isConfirmed: { type: Boolean, default: false }, // student confirmed this course
      },
    ],

    // Extraction metadata
    extractedAt:  { type: Date, default: null },
    confirmedAt:  { type: Date, default: null },
    isConfirmed:  { type: Boolean, default: false }, // whole handbook confirmed
    academicSession: { type: String, default: '' },  // e.g. "2024/2025"
  },
  { timestamps: true }
);

handbookCourseSchema.index({ student: 1 }, { unique: true });

const HandbookCourse = mongoose.model('HandbookCourse', handbookCourseSchema);
module.exports = HandbookCourse;
