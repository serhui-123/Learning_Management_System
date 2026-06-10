package com.example.lms.controller;

import javax.servlet.annotation.WebServlet;
import javax.servlet.http.*;
import java.io.IOException;
import java.io.PrintWriter;
import java.net.URI;
import java.net.http.HttpClient;
import java.net.http.HttpRequest;
import java.net.http.HttpResponse;

@WebServlet("/login")
public class LoginServlet extends HttpServlet {

    @Override
    protected void doGet(HttpServletRequest req, HttpServletResponse resp) throws IOException {
        resp.setContentType("text/plain");
        resp.getWriter().write("Servlet is alive! BFF Layer is working.");
    }

    @Override
    protected void doPost(HttpServletRequest request, HttpServletResponse response) throws IOException {
        // Set CORS headers for frontend access
        response.setHeader("Access-Control-Allow-Origin", "*");
        response.setContentType("application/json");
        response.setCharacterEncoding("UTF-8");

        PrintWriter out = response.getWriter();

        // Get parameters from the frontend (login.html)
        String user = request.getParameter("username");
        String pass = request.getParameter("password");
        String role = request.getParameter("role");

        System.out.println("Processing login for: " + user);

        try {
            // Construct JSON payload for Node.js Microservice
            String jsonBody = String.format(
                    "{\"username\":\"%s\", \"password\":\"%s\", \"role\":\"%s\"}",
                    user, pass, role
            );

            // Create HTTP Client to call Node.js API (Microservice Layer)
            HttpClient client = HttpClient.newHttpClient();
            HttpRequest nodeRequest = HttpRequest.newBuilder()
                    .uri(URI.create("http://localhost:3001/login")) // Ensure port 3001 matches Node.js
                    .header("Content-Type", "application/json")
                    .POST(HttpRequest.BodyPublishers.ofString(jsonBody))
                    .build();

            // Send request and get response from Node.js
            HttpResponse<String> nodeResponse = client.send(nodeRequest,
                    HttpResponse.BodyHandlers.ofString());

            // Forward the Microservice response back to the Frontend
            out.print(nodeResponse.body());

        } catch (Exception e) {
            e.printStackTrace();
            // Fallback error if Node.js service is down
            out.print("{\"status\":\"error\", \"message\":\"Microservice unreachable\"}");
        }
        out.flush();
    }
}