package com.example.lms.controller;

import javax.servlet.*;
import javax.servlet.http.*;
import javax.servlet.annotation.*;
import java.io.*;
import java.net.URI;
import java.net.http.HttpClient;
import java.net.http.HttpRequest;
import java.net.http.HttpResponse;
import java.util.Base64;

@WebServlet(name = "CourseBridgeServlet", value = "/api/course-bridge")
@MultipartConfig(maxFileSize = 1024 * 1024 * 30, maxRequestSize = 1024 * 1024 * 60)
public class CourseBridgeServlet extends HttpServlet {

    private static final String GATEWAY_URL = "http://localhost:8000";
    private final HttpClient httpClient = HttpClient.newHttpClient();

    @Override
    protected void doGet(HttpServletRequest request, HttpServletResponse response) throws ServletException, IOException {
        response.setContentType("application/json");
        response.setCharacterEncoding("UTF-8");
        response.setHeader("Access-Control-Allow-Origin", "*");

        String mode = request.getParameter("mode");
        PrintWriter out = response.getWriter();

        try {
            if ("fetchUsers".equals(mode)) {
                HttpRequest nodeReq = HttpRequest.newBuilder().uri(URI.create(GATEWAY_URL + "/users/users")).GET().build();
                HttpResponse<String> nodeRes = httpClient.send(nodeReq, HttpResponse.BodyHandlers.ofString());
                out.print(nodeRes.body());
            } else if ("fetchAll".equals(mode)) {
                String lecturer = request.getParameter("lecturer");
                String student = request.getParameter("student");
                String url = GATEWAY_URL + "/courses/courses";
                StringBuilder urlBuilder = new StringBuilder(url);
                boolean hasParam = false;
                if (lecturer != null && !lecturer.isEmpty()) { urlBuilder.append("?lecturer=").append(lecturer); hasParam = true; }
                if (student != null && !student.isEmpty()) { urlBuilder.append(hasParam ? "&" : "?").append("student=").append(student); }

                HttpRequest nodeReq = HttpRequest.newBuilder().uri(URI.create(urlBuilder.toString())).GET().build();
                HttpResponse<String> nodeRes = httpClient.send(nodeReq, HttpResponse.BodyHandlers.ofString());
                out.print(nodeRes.body());
            }
        } catch (Exception e) { e.printStackTrace(); out.print("[]"); }
        out.flush();
    }

    @Override
    protected void doPost(HttpServletRequest request, HttpServletResponse response) throws ServletException, IOException {
        response.setHeader("Access-Control-Allow-Origin", "*");
        response.setContentType("application/json");
        response.setCharacterEncoding("UTF-8");
        request.setCharacterEncoding("UTF-8");

        String action = request.getParameter("action");
        PrintWriter out = response.getWriter();

        try {
            if ("addUser".equals(action)) {
                String jsonPayload = String.format("{\"username\":\"%s\",\"password\":\"%s\",\"role\":\"%s\"}", request.getParameter("username"), request.getParameter("password"), request.getParameter("role"));
                HttpRequest nodeReq = HttpRequest.newBuilder().uri(URI.create(GATEWAY_URL + "/users/register")).header("Content-Type", "application/json").POST(HttpRequest.BodyPublishers.ofString(jsonPayload)).build();
                out.print(httpClient.send(nodeReq, HttpResponse.BodyHandlers.ofString()).body()); out.flush(); return;
            }
            if ("deleteUser".equals(action)) {
                String jsonPayload = String.format("{\"username\":\"%s\"}", request.getParameter("username"));
                HttpRequest nodeReq = HttpRequest.newBuilder().uri(URI.create(GATEWAY_URL + "/users/delete")).header("Content-Type", "application/json").POST(HttpRequest.BodyPublishers.ofString(jsonPayload)).build();
                out.print(httpClient.send(nodeReq, HttpResponse.BodyHandlers.ofString()).body()); out.flush(); return;
            }
            // 🌟 升级：支持 Admin 修改课程，同时支持学生提交作业时更新 3002 矩阵状态
            if ("adminCreateCourse".equals(action)) {
                String isUpdate = request.getParameter("isUpdate");
                String courseCode = request.getParameter("courseCode");
                String courseName = request.getParameter("courseName");
                String lecturerUsername = request.getParameter("lecturerUsername");
                String selectedStudentIds = request.getParameter("selectedStudentIds");

                // 🌟 捕获前端发来的学生更新后的 Submitted 矩阵状态数据
                String submissionsJson = request.getParameter("submissionsJson");

                String jsonPayload;
                if (submissionsJson != null && !submissionsJson.isEmpty()) {
                    // 如果是学生交作业触发的更新，直接把修改好 Submitted 的 submissions 数组透传给 Node.js
                    jsonPayload = String.format(
                            "{\"courseCode\":\"%s\",\"courseName\":\"%s\",\"lecturerUsername\":\"%s\",\"selectedStudentIds\":\"%s\",\"directSubmissions\":%s}",
                            courseCode, courseName, lecturerUsername, selectedStudentIds, submissionsJson
                    );
                } else {
                    // 如果是 Admin 正常的创建或修改课程
                    jsonPayload = String.format(
                            "{\"courseCode\":\"%s\",\"courseName\":\"%s\",\"lecturerUsername\":\"%s\",\"selectedStudentIds\":\"%s\"}",
                            courseCode, courseName, lecturerUsername, selectedStudentIds
                    );
                }

                String subPath = "true".equals(isUpdate) ? "/courses/update" : "/courses/create";

                HttpRequest nodeReq = HttpRequest.newBuilder()
                        .uri(URI.create(GATEWAY_URL + "/courses" + subPath))
                        .header("Content-Type", "application/json")
                        .POST(HttpRequest.BodyPublishers.ofString(jsonPayload))
                        .build();

                HttpResponse<String> nodeRes = httpClient.send(nodeReq, HttpResponse.BodyHandlers.ofString());
                response.setContentType("application/json");
                out.print(nodeRes.body());
                out.flush();
                return;
            }
            if ("deleteCourse".equals(action)) {
                String jsonPayload = String.format("{\"courseCode\":\"%s\"}", request.getParameter("courseCode"));
                HttpRequest nodeReq = HttpRequest.newBuilder().uri(URI.create(GATEWAY_URL + "/courses/delete")).header("Content-Type", "application/json").POST(HttpRequest.BodyPublishers.ofString(jsonPayload)).build();
                out.print(httpClient.send(nodeReq, HttpResponse.BodyHandlers.ofString()).body()); out.flush(); return;
            }

            // 🌟 多库联动更新与删除中枢
            if ("publishTask".equals(action)) {
                String courseCode = request.getParameter("courseCode");
                String taskTitle = request.getParameter("taskTitle");
                String taskDueDate = request.getParameter("taskDueDate");
                String materialTitle = request.getParameter("materialTitle");
                String announcementText = request.getParameter("announcementText");
                String subAction = request.getParameter("subAction");
                String targetTitle = request.getParameter("targetTitle");

                String jsonPayload = "";

                // 🌟 核心改进：删除时不仅扣减 3002 主库，同时给 3003、3004 独立服务下发永久毁灭指令
                if ("deleteNotice".equals(subAction)) {
                    jsonPayload = String.format("{\"courseCode\":\"%s\",\"removeAnnouncementTitle\":\"%s\"}", courseCode, targetTitle);
                }
                else if ("deleteMaterial".equals(subAction)) {
                    jsonPayload = String.format("{\"courseCode\":\"%s\",\"removeMaterialTitle\":\"%s\"}", courseCode, targetTitle);

                    // 🚀 级联清除 3003 Content 独立微服务数据库里的课件实体记录
                    String delPayload = String.format("{\"courseId\":\"%s\",\"title\":\"%s\"}", courseCode, targetTitle);
                    httpClient.send(HttpRequest.newBuilder().uri(URI.create(GATEWAY_URL + "/contents/contents/delete")).header("Content-Type", "application/json").POST(HttpRequest.BodyPublishers.ofString(delPayload)).build(), HttpResponse.BodyHandlers.ofString());
                }
                else if ("deleteAssignment".equals(subAction)) {
                    jsonPayload = String.format("{\"courseCode\":\"%s\",\"clearTask\":\"true\"}", courseCode);

                    // 🚀 级联清除 3004 Assignment 独立微服务数据库里的作业与全部学生成绩单实体
                    String delPayload = String.format("{\"courseId\":\"%s\",\"taskName\":\"%s\"}", courseCode, targetTitle);
                    httpClient.send(HttpRequest.newBuilder().uri(URI.create(GATEWAY_URL + "/assignments/assignments/delete")).header("Content-Type", "application/json").POST(HttpRequest.BodyPublishers.ofString(delPayload)).build(), HttpResponse.BodyHandlers.ofString());
                }
                else {
                    // 常规添加逻辑
                    if (announcementText != null && !announcementText.isEmpty()) {
                        jsonPayload = String.format("{\"courseCode\":\"%s\",\"newAnnouncement\":{\"title\":\"%s\"}}", courseCode, announcementText);
                    }
                    else if (materialTitle != null && !materialTitle.isEmpty()) {
                        Part filePart = request.getPart("materialFile");
                        String fileName = filePart.getSubmittedFileName();
                        InputStream is = filePart.getInputStream();
                        byte[] bytes = is.readAllBytes();
                        String base64Stream = Base64.getEncoder().encodeToString(bytes);

                        jsonPayload = String.format("{\"courseCode\":\"%s\",\"newMaterial\":{\"title\":\"%s\",\"file\":\"%s\",\"fileStream\":\"%s\"}}", courseCode, materialTitle, fileName, base64Stream);

                        String contentPayload = String.format("{\"courseId\":\"%s\",\"title\":\"%s\",\"fileName\":\"%s\",\"binaryStream\":\"%s\"}", courseCode, materialTitle, fileName, base64Stream);
                        httpClient.send(HttpRequest.newBuilder().uri(URI.create(GATEWAY_URL + "/contents/contents/add")).header("Content-Type", "application/json").POST(HttpRequest.BodyPublishers.ofString(contentPayload)).build(), HttpResponse.BodyHandlers.ofString());
                    }
                    else {
                        Part filePart = request.getPart("taskFile");
                        String fileName = filePart.getSubmittedFileName();
                        InputStream is = filePart.getInputStream();
                        byte[] bytes = is.readAllBytes();
                        String base64Stream = Base64.getEncoder().encodeToString(bytes);

                        jsonPayload = String.format("{\"courseCode\":\"%s\",\"taskTitle\":\"%s\",\"dueDate\":\"%s\",\"questionFile\":\"%s\",\"fileDataStream\":\"%s\"}", courseCode, taskTitle, taskDueDate, fileName, base64Stream);

                        String assignPayload = String.format("{\"courseId\":\"%s\",\"taskName\":\"%s\",\"deadline\":\"%s\"}", courseCode, taskTitle, taskDueDate);
                        httpClient.send(HttpRequest.newBuilder().uri(URI.create(GATEWAY_URL + "/assignments/assignments/add")).header("Content-Type", "application/json").POST(HttpRequest.BodyPublishers.ofString(assignPayload)).build(), HttpResponse.BodyHandlers.ofString());
                    }
                }

                HttpRequest nodeReq = HttpRequest.newBuilder().uri(URI.create(GATEWAY_URL + "/courses/update")).header("Content-Type", "application/json").POST(HttpRequest.BodyPublishers.ofString(jsonPayload)).build();
                out.print(httpClient.send(nodeReq, HttpResponse.BodyHandlers.ofString()).body()); out.flush(); return;
            }

        } catch (Exception e) { e.printStackTrace(); out.print("{\"status\":\"error\"}"); out.flush(); }
    }
}