process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0';

const express = require('express');
const cors = require('cors');
const { MongoClient } = require('mongodb');

const app = express();
const port = 3002;

app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ limit: '50mb', extended: true }));
app.use(cors());

const uri = "mongodb+srv://admin:12345@lms-project-cluster.kwotrd1.mongodb.net/lms_course_db?authSource=admin&retryWrites=true&w=majority";
const client = new MongoClient(uri, { serverSelectionTimeoutMS: 15000, socketTimeoutMS: 45000 });
let db;

async function connectDB() {
    try { await client.connect(); db = client.db("lms_course_db"); console.log("✅ Course Service Active Natively!"); } catch (err) { console.error(err); }
}
connectDB();

app.get('/courses', async (req, res) => {
    try {
        const { lecturer, student } = req.query;
        let condition = {};
        if (lecturer) condition.lecturerUsername = lecturer;
        if (student) condition.selectedStudentIds = { $regex: student, $options: 'i' };
        const list = await db.collection("courses").find(condition).toArray();
        res.json(list);
    } catch (err) { res.status(500).json([]); }
});

// 学生交某一门具体作业变绿（支持多作业追踪）
app.post('/courses/submit-status', async (req, res) => {
    try {
        const { courseCode, studentId, fileName, studentStream, taskTitle } = req.body;
        // 精准将该同学的提交包塞进对应的专属提交槽中
        await db.collection("courses").updateOne(
            { courseCode: courseCode, "submissions.id": studentId },
            { $set: { "submissions.$.status": "Submitted", "submissions.$.file": fileName, "submissions.$.studentStream": studentStream || "", "submissions.$.activeTask": taskTitle } }
        );
        res.json({ status: 'success' });
    } catch (err) { res.status(500).json({ status: 'error' }); }
});

// 🌟 核心重构：允许作业像课件一样以数组无限追加发布，绝不顶替覆盖！
app.post('/update', async (req, res) => {
    try {
        const { courseCode, courseName, lecturerUsername, selectedStudentIds, taskTitle, dueDate, questionFile, fileDataStream, newMaterial, newAnnouncement, removeMaterialTitle, removeAnnouncementTitle, clearTask } = req.body;
        
        let setUpdate = {}; let pushUpdate = {}; let pullUpdate = {};

        if (courseName) setUpdate.courseName = courseName;
        if (lecturerUsername) setUpdate.lecturerUsername = lecturerUsername;
        
        if (selectedStudentIds) {
            setUpdate.selectedStudentIds = selectedStudentIds;
            setUpdate.submissions = selectedStudentIds.split(',').map(id => ({ id, name: id, status: "Not Submitted", file: "", grade: "Ungraded", studentStream: "" }));
        }
        
        // 🌟 破局点：如果老师发布了新作业，直接单数转复数，作为独立的 Assignment 对象推入主库，不覆盖主干！
        if (taskTitle && taskTitle !== "null") {
            // 同时兼容你前端渲染需要的单字段，供当前最新作业展示
            setUpdate.taskTitle = taskTitle;
            setUpdate.dueDate = dueDate;
            setUpdate.questionFile = questionFile;
            if (fileDataStream) setUpdate.fileDataStream = fileDataStream;

            // 压入课程专属的历史任务总表（以防被未来新发布的作业冲掉）
            pushUpdate.assignmentsHistory = { taskTitle, dueDate, questionFile, fileDataStream };
            
            // 重置全班同学针对这个“新作业”的考核矩阵
            const doc = await db.collection("courses").findOne({ courseCode });
            if (doc && doc.selectedStudentIds) {
                setUpdate.submissions = doc.selectedStudentIds.split(',').map(id => ({ id, name: id, status: "Not Submitted", file: "", grade: "Ungraded", studentStream: "", activeTask: taskTitle }));
            }
        }

        if (newMaterial) pushUpdate.materials = typeof newMaterial === 'string' ? JSON.parse(newMaterial) : newMaterial;
        if (newAnnouncement) pushUpdate.announcements = typeof newAnnouncement === 'string' ? JSON.parse(newAnnouncement) : newAnnouncement;
        if (removeMaterialTitle) pullUpdate.materials = { title: removeMaterialTitle };
        if (removeAnnouncementTitle) pullUpdate.announcements = { title: removeAnnouncementTitle };

        if (clearTask === "true") {
            setUpdate.taskTitle = ""; setUpdate.dueDate = ""; setUpdate.questionFile = ""; setUpdate.fileDataStream = "";
            setUpdate.assignmentsHistory = [];
            const doc = await db.collection("courses").findOne({ courseCode });
            if (doc && doc.selectedStudentIds) {
                setUpdate.submissions = doc.selectedStudentIds.split(',').map(id => ({ id, name: id, status: "Not Submitted", file: "", grade: "Ungraded", studentStream: "" }));
            }
        }

        let updateCmd = {};
        if (Object.keys(setUpdate).length > 0) updateCmd.$set = setUpdate;
        if (Object.keys(pushUpdate).length > 0) updateCmd.$push = pushUpdate;
        if (Object.keys(pullUpdate).length > 0) updateCmd.$pull = pullUpdate;

        await db.collection("courses").updateOne({ courseCode }, updateCmd);
        res.json({ status: 'success' });
    } catch (err) { res.status(500).json({ status: 'error' }); }
});

app.post('/create', async (req, res) => {
    const subs = req.body.selectedStudentIds ? req.body.selectedStudentIds.split(',').map(id => ({ id, name: id, status: "Not Submitted", file: "", grade: "Ungraded", studentStream: "", activeTask: "" })) : [];
    await db.collection("courses").deleteOne({ courseCode: req.body.courseCode });
    await db.collection("courses").insertOne({ ...req.body, submissions: subs, assignmentsHistory: [] });
    res.json({ status: 'success' });
});

app.post('/delete', async (req, res) => { await db.collection("courses").deleteOne({ courseCode: req.body.courseCode }); res.json({ status: 'success' }); });

app.listen(port);