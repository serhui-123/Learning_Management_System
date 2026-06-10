process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0'; // 强制放行所有云端证书校验

const express = require('express');
const cors = require('cors');
const { MongoClient } = require('mongodb');

const app = express();
const port = 3001;

app.use(express.json());
app.use(cors());

// 强制放行所有前端和 Java BFF 的获取请求跨域
app.use((req, res, next) => {
    res.header("Access-Control-Allow-Origin", "*");
    res.header("Access-Control-Allow-Headers", "Origin, X-Requested-With, Content-Type, Accept");
    next();
});

// 🌟 终极优化：精简保活连接串，移除容易在内网导致挂死的 authSource 冗余参数
const uri = "mongodb+srv://admin:12345@lms-project-cluster.kwotrd1.mongodb.net/lms_user_db?retryWrites=true&w=majority";

// 🌟 优化连接超时参数，防止死等卡死
const client = new MongoClient(uri, {
    maxPoolSize: 5,                  // 缩小连接池，防止校园网环境下断流
    serverSelectionTimeoutMS: 5000,  // 5秒拿不到服务器直接报错，不许无限期挂起！
    connectTimeoutMS: 5000
});

let db;
async function connectDB() {
    try {
        console.log("⏳ Initializing MongoDB Connection Pipeline...");
        await client.connect();
        db = client.db("lms_user_db"); 
        console.log("✅ User Service successfully connected to MongoDB via Native Driver!");
    } catch (err) {
        console.error("❌ User DB Connection failed:", err.message);
    }
}
connectDB();

// 🌟 1. 救砖核心路由：补齐 Java BFF 正在疯狂呼叫的 /login 验证接口！
app.post('/login', async (req, res) => {
    console.log("📥 [User Service] Processing Auth Validation:", req.body.username);
    try {
        const { username, password, role } = req.body;
        
        // 兜底防御：如果 db 还没初始化完，临时强行挂载一次，防止返回 0 或报错
        if (!db) db = client.db("lms_user_db");
        
        const matchUser = await db.collection("users").findOne({ username, password, role });
        
        if (matchUser) {
            console.log("🎯 [Auth Success] Found entry token for user:", username);
            res.json({ status: 'success', role: matchUser.role, username: matchUser.username });
        } else {
            console.warn("⚠️ [Auth Fail] Credentials mismatch for user:", username);
            res.json({ status: 'error', message: 'Invalid User ID, Password or Role selection.' });
        }
    } catch (err) {
        console.error("❌ DB Query Breakdown inside /login:", err.message);
        res.status(500).json({ status: 'error', message: 'Internal server query breakdown.' });
    }
});

// 🌟 2. 保持原有的管理接口（供 Admin 后台增删改查无损通车）
app.get('/users', async (req, res) => {
    console.log("📥 Admin Dashboard is fetching all users...");
    try {
        // 兜底防御：直接用 client.db 动态抓取，绝对不给它因为全局变量挂起返回空数据的机会！
        const users = await client.db("lms_user_db").collection("users").find({}).toArray();
        
        console.log(`🎯 Successfully fetched ${users.length} users from cloud!`);
        res.json(users);
    } catch (err) { 
        console.error("❌ Failed to fetch users:", err.message);
        res.status(500).json([]); 
    }
});

app.post('/register', async (req, res) => {
    try {
        const { username, password, role } = req.body;
        if (!db) db = client.db("lms_user_db");
        const existingUser = await db.collection("users").findOne({ username });
        if (existingUser) {
            await db.collection("users").updateOne({ username }, { $set: { password, role } });
            return res.json({ status: 'success', message: 'User modified!' });
        }
        await db.collection("users").insertOne({ username, password, role });
        res.json({ status: 'success' });
    } catch (err) { res.status(500).json({ status: 'error' }); }
});

app.post('/delete', async (req, res) => {
    try {
        if (!db) db = client.db("lms_user_db");
        await db.collection("users").deleteOne({ username: req.body.username });
        res.json({ status: 'success' });
    } catch (err) { res.status(500).json({ status: 'error' }); }
});

app.listen(port, () => console.log(`User Service running natively at http://localhost:${port}`));