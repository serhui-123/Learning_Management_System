process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0';

const express = require('express');
const cors = require('cors');
const { MongoClient } = require('mongodb');

const app = express();
const port = 3004;

app.use(express.json({ limit: '50mb' }));
app.use(cors());

// 🌟 统一对齐标准的官方原生 SRV 安全穿透长连接
const uri = "mongodb+srv://admin:12345@lms-project-cluster.kwotrd1.mongodb.net/?retryWrites=true&w=majority&appName=LMS-Project-Cluster";

const client = new MongoClient(uri, {
    serverSelectionTimeoutMS: 15000,
    connectTimeoutMS: 15000
});

let db;
async function connectDB() {
    try {
        await client.connect();
        // 🌟 绑定到作业及学生解答专属库 lms_assignment_db
        db = client.db("lms_assignment_db");
        console.log("✅ Assignment Service successfully connected to MongoDB via Native Driver!");
    } catch (err) {
        console.error("❌ Assignment DB Connection failed:", err.message);
    }
}
connectDB();

// 老师发布作业任务入库记录
app.post('/assignments/add', async (req, res) => {
    try {
        const { courseId, taskName, deadline, maxMarks } = req.body;
        await db.collection("assignments").insertOne({ 
            courseId, 
            taskName, 
            deadline, 
            maxMarks: maxMarks || 100, 
            studentSubmissions: [] 
        });
        res.json({ status: 'success' });
    } catch (err) { 
        res.status(500).json({ status: 'error' }); 
    }
});

// 🌟 原生方法升级：接收并记录学生递交答案文件到作业库
app.post('/assignments/submit', async (req, res) => {
    try {
        const { courseId, taskName, studentId, fileName, fileBlobStream } = req.body;
        // 🌟 原生方法：使用 updateOne 与 $push 原子化压入数组
        await db.collection("assignments").updateOne(
            { courseId, taskName },
            { $push: { studentSubmissions: { studentId, fileName, fileBlobStream, timestamp: new Date() } } }
        );
        res.json({ status: 'success' });
    } catch (err) { 
        res.status(500).json({ status: 'error', message: err.message }); 
    }
});

// 清除功课任务及名下全部学生的答案包
app.post('/assignments/delete', async (req, res) => {
    try {
        const { courseId, taskName } = req.body;
        await db.collection("assignments").deleteOne({ courseId, taskName });
        res.json({ status: 'success' });
    } catch (err) { 
        res.status(500).json({ status: 'error' }); 
    }
});

app.listen(port);