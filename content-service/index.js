process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0';

const express = require('express');
const cors = require('cors');
const { MongoClient } = require('mongodb');

const app = express();
const port = 3003;

app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ limit: '50mb', extended: true }));
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
        // 🌟 绑定到课件专用库 lms_content_db
        db = client.db("lms_content_db");
        console.log("✅ Content Service successfully connected to MongoDB via Native Driver!");
    } catch (err) {
        console.error("❌ Content DB Connection failed:", err.message);
    }
}
connectDB();

// 📡 老师端上传真实课件，直灌分布式集合
app.post('/contents/add', async (req, res) => {
    try {
        const { courseId, title, fileName, binaryStream } = req.body;
        // 🌟 原生方法：使用 insertOne 替代 Mongoose 的 save
        await db.collection("contents").insertOne({ 
            courseId, 
            title, 
            contentType: "PDF", 
            fileName, 
            binaryStream 
        });
        res.json({ status: 'success' });
    } catch (err) { 
        res.status(500).json({ status: 'error', message: err.message }); 
    }
});

// 查询指定科目的所有课件（学生端拉取）
app.get('/contents/:courseId', async (req, res) => {
    try {
        // 🌟 原生方法：使用 find().toArray() 替代 Mongoose 的 find()
        const items = await db.collection("contents").find({ courseId: req.params.courseId }).toArray();
        res.json(items);
    } catch (err) { 
        res.status(500).json([]); 
    }
});

// 从库中物理擦除课件实体文件记录
app.post('/contents/delete', async (req, res) => {
    try {
        const { courseId, title } = req.body;
        // 🌟 原生方法：使用 deleteOne 替代 Mongoose 的 findOneAndDelete
        await db.collection("contents").deleteOne({ courseId, title });
        res.json({ status: 'success' });
    } catch (err) { 
        res.status(500).json({ status: 'error' }); 
    }
});

app.listen(port);