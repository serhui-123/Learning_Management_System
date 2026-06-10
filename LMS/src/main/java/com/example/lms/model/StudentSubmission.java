package com.example.lms.model;

import java.io.Serializable;

// 🌟 规范的 Java Bean (Model)：用于封装课程内每位学生的作业提交状态、文件路径与批改成绩
public class StudentSubmission implements Serializable {
    private String id;
    private String name;
    private String status;
    private String file;
    private String grade;

    // 1. 必须保留的无参构造函数（供序列化框架使用）
    public StudentSubmission() {}

    // 2. 🌟 必须补上的快捷构造函数：专供 Admin 新建科目、批量勾选并绑定学生时使用！
    public StudentSubmission(String id, String name) {
        this.id = id;
        this.name = name;
        this.status = "Not Submitted"; // 默认初始化为未提交
        this.file = "";                // 默认无任何解答文件
        this.grade = "Ungraded";       // 默认未批改评分
    }

    // 3. 全量参数构造函数
    public StudentSubmission(String id, String name, String status, String file, String grade) {
        this.id = id;
        this.name = name;
        this.status = status;
        this.file = file;
        this.grade = grade;
    }

    // ================= 标准的 Getters 和 Setters =================
    public String getId() { return id; }
    public void setId(String id) { this.id = id; }

    public String getName() { return name; }
    public void setName(String name) { this.name = name; }

    public String getStatus() { return status; }
    public void setStatus(String status) { this.status = status; }

    public String getFile() { return file; }
    public void setFile(String file) { this.file = file; }

    public String getGrade() { return grade; }
    public void setGrade(String grade) { this.grade = grade; }
}