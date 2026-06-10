const express = require('express');
const cors = require('cors'); 
const { createProxyMiddleware } = require('http-proxy-middleware');
const app = express();
const port = 8000; 

app.use(cors());

// 🌟 终极修复：为 /users 添加标准的 pathRewrite 自动剥离前缀，确保 100% 命中 3001 端口的 /register
app.use('/users', createProxyMiddleware({ 
    target: 'http://localhost:3001', 
    changeOrigin: true,
    pathRewrite: { '^/users': '' } // ➔ 自动把前端传过来的 /users 抹掉，变成 3001 认识的 /register 和 /delete
}));

app.use('/courses', createProxyMiddleware({ 
    target: 'http://localhost:3002', 
    changeOrigin: true,
    pathRewrite: { '^/courses/courses': '/courses' } 
}));

app.use('/contents', createProxyMiddleware({ 
    target: 'http://localhost:3003', 
    changeOrigin: true,
    pathRewrite: { '^/contents/contents': '/contents' } 
}));

app.use('/assignments', createProxyMiddleware({ 
    target: 'http://localhost:3004', 
    changeOrigin: true,
    pathRewrite: { '^/assignments/assignments': '/assignments' } 
}));

app.get('/', (req, res) => {
    res.send('<h1>LMS API Gateway running successfully！</h1>');
});

app.listen(port, () => console.log(`API Gateway running at http://localhost:${port}`));