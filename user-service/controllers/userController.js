const User = require('../models/User');

exports.registerUser = async (req, res) => {
  try {
    const newUser = new User({
      username: "Grace_UMT",
      email: "grace@example.com",
      role: "Student"
    });
    const savedUser = await newUser.save();
    res.status(201).json(savedUser);
  } catch (err) {
    res.status(500).send("保存失败: " + err.message);
  }
};

// 获取所有用户
exports.getAllUsers = async (req, res) => {
  try {
    const users = await User.find(); // 从云端抓取所有卡片
    res.status(200).json(users);
  } catch (err) {
    res.status(500).send("读取失败: " + err.message);
  }
};