const mongoose = require('mongoose');

const contentSchema = new mongoose.Schema({
  courseId: { type: String, required: true }, // 对应 Course Service 的 _id
  title: { type: String, required: true },
  contentType: { type: String, enum: ['PDF', 'Video', 'Link'], default: 'PDF' },
  url: { type: String, required: true }
});

module.exports = mongoose.model('Content', contentSchema);