package com.example.lms.model;

import java.io.Serializable;
import java.util.ArrayList;
import java.util.List;

public class CourseAssignmentModel implements Serializable {
    private String courseCode;
    private String courseName;
    private String lecturerId;   // 🌟 映射：绑定负责这门课的讲师 ID
    private String lecturerName; // 🌟 映射：讲师姓名
    private String taskTitle = "";
    private String dueDate = "";
    private String questionFile = "";

    // 🌟 映射：这门课程里注册的所有学生名单列表（Sub-Model）
    private List<StudentSubmission> submissions = new ArrayList<>();

    public CourseAssignmentModel() {}

    // Admin 专属创建课程的构造函数
    public CourseAssignmentModel(String courseCode, String courseName, String lecturerId, String lecturerName) {
        this.courseCode = courseCode;
        this.courseName = courseName;
        this.lecturerId = lecturerId;
        this.lecturerName = lecturerName;
    }

    // 快捷添加学生到该课程的业务方法
    public void enrollStudent(String studentId, String studentName) {
        // 新加入的学生，初始状态全部自动设为 "Not Submitted"
        this.submissions.add(new StudentSubmission(studentId, studentName, "Not Submitted", "", "Ungraded"));
    }

    public void resetAllSubmissions() {
        for (StudentSubmission sub : submissions) {
            sub.setStatus("Not Submitted");
            sub.setFile("");
            sub.setGrade("Ungraded");
        }
    }

    public void updateStudentSubmission(String studentId, String fileName) {
        for (StudentSubmission sub : submissions) {
            if (sub.getId().equals(studentId)) {
                sub.setStatus("Submitted");
                sub.setFile(fileName);
            }
        }
    }

    public void updateGrade(String studentId, String grade) {
        for (StudentSubmission sub : submissions) {
            if (sub.getId().equals(studentId)) {
                sub.setGrade(grade);
            }
        }
    }

    // --- 标准的 Getters & Setters ---
    public String getCourseCode() { return courseCode; }
    public void setCourseCode(String courseCode) { this.courseCode = courseCode; }

    public String getCourseName() { return courseName; }
    public void setCourseName(String courseName) { this.courseName = courseName; }

    public String getLecturerId() { return lecturerId; }
    public void setLecturerId(String lecturerId) { this.lecturerId = lecturerId; }

    public String getLecturerName() { return lecturerName; }
    public void setLecturerName(String lecturerName) { this.lecturerName = lecturerName; }

    public String getTaskTitle() { return taskTitle; }
    public void setTaskTitle(String taskTitle) { this.taskTitle = taskTitle; }

    public String getDueDate() { return dueDate; }
    public void setDueDate(String dueDate) { this.dueDate = dueDate; }

    public String getQuestionFile() { return questionFile; }
    public void setQuestionFile(String questionFile) { this.questionFile = questionFile; }

    public List<StudentSubmission> getSubmissions() { return submissions; }
    public void setSubmissions(List<StudentSubmission> submissions) { this.submissions = submissions; }
}