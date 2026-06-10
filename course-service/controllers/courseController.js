const Course = require('../models/Course');

// 创建新课程
exports.addCourse = async (req, res) => {
  try {
    const newCourse = new Course({
      courseName: "Software Engineering Project",
      credits: 4,
      lecturer: "Dr. Zihuan" // 借用你同学的名字做测试
    });
    const savedCourse = await newCourse.save();
    res.status(201).json(savedCourse);
  } catch (err) {
    res.status(500).send("保存失败: " + err.message);
  }
};


// 获取所有课程
exports.getAllCourses = async (req, res) => {
  try {
    const courses = await Course.find();
    res.status(200).json(courses);
  } catch (err) {
    res.status(500).send("读取失败: " + err.message);
  }
};