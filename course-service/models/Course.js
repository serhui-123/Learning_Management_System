const mongoose = require('mongoose');

const courseSchema = new mongoose.Schema({
  courseName: { type: String, required: true },
  credits: { type: Number, required: true },
  lecturer: { type: String, default: "TBA" }
});

module.exports = mongoose.model('Course', courseSchema);