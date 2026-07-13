package com.example.attendance.controller;

import java.io.PrintWriter;
import java.io.StringWriter;
import java.time.LocalDateTime;
import java.util.List;
import java.util.Map;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.format.annotation.DateTimeFormat;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.multipart.MultipartFile;

import com.example.attendance.entity.AttendanceLog;
import com.example.attendance.service.AttendanceService;

@RestController
@RequestMapping("/api/attendance")
public class AttendanceController {

    @Autowired private AttendanceService attendanceService;

    /**
     * Endpoint chấm công — public (không cần JWT, gọi từ kiosk)
     */
    @PostMapping("/check-in")
    public ResponseEntity<Map<String, Object>> checkIn(
            @RequestParam("image") MultipartFile imageFile) {
        try {
            byte[] imageBytes = imageFile.getBytes();
            Map<String, Object> result = attendanceService.processCheckIn(imageBytes);
            return ResponseEntity.ok(result);
        } catch (Exception e) {
            return ResponseEntity.internalServerError()
                    .body(Map.of("success", false, "message", e.getMessage()));
        }
    }

    /**
     * Xem lịch sử chấm công (cần JWT)
     */
    @GetMapping("/logs")
    public ResponseEntity<List<AttendanceLog>> getLogs(
            @RequestParam(required = false) Long employeeId,
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE_TIME) LocalDateTime from,
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE_TIME) LocalDateTime to) {

        if (from == null) from = LocalDateTime.now().minusDays(30);
        if (to == null) to = LocalDateTime.now();

        return ResponseEntity.ok(attendanceService.getLogs(employeeId, from, to));
    }

    /**
    * Thống kê dashboard hôm nay
    */
     
    @GetMapping("/dashboard/stats")
    public ResponseEntity<Map<String, Long>> getDashboardStats() {
        return ResponseEntity.ok(attendanceService.getDashboardStats());
    }

    /**
     * Thống kê 7 ngày gần nhất cho biểu đồ
     */
    @GetMapping("/dashboard/weekly")
    public ResponseEntity<List<Map<String, Object>>> getWeeklyStats() {
        return ResponseEntity.ok(attendanceService.getWeeklyStats());
    }

    /**
     * Lấy log chấm công gần nhất (mặc định 10 bản ghi)
     */
    @GetMapping("/dashboard/recent")
    public ResponseEntity<List<AttendanceLog>> getRecentLogs(
            @RequestParam(defaultValue = "10") int limit) {
        return ResponseEntity.ok(attendanceService.getRecentLogs(limit));
    }

    /**
     * Xuất báo cáo CSV
     */
    @GetMapping("/export/csv")
    public ResponseEntity<byte[]> exportCsv(
            @RequestParam(required = false) Long employeeId,
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE_TIME) LocalDateTime from,
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE_TIME) LocalDateTime to) {
        try {
            if (from == null) from = LocalDateTime.now().minusDays(30);
            if (to == null) to = LocalDateTime.now();

            List<AttendanceLog> logs = attendanceService.getLogs(employeeId, from, to);

            StringWriter sw = new StringWriter();
            PrintWriter pw = new PrintWriter(sw);
            pw.println("\uFEFFID,Mã NV,Họ Tên,Phòng Ban,Loại,Thời Gian,Trạng Thái,Độ Chính Xác AI");
            for (AttendanceLog log : logs) {
                pw.printf("%d,%s,%s,%s,%s,%s,%s,%.2f%n",
                    log.getId(),
                    safe(log.getEmployee() != null ? log.getEmployee().getEmployeeCode() : ""),
                    safe(log.getEmployee() != null ? log.getEmployee().getFullName() : ""),
                    safe(log.getEmployee() != null && log.getEmployee().getDepartment() != null
                        ? log.getEmployee().getDepartment().getName() : ""),
                    log.getCheckType(),
                    log.getCheckTime(),
                    log.getStatus(),
                    log.getConfidenceScore() != null ? log.getConfidenceScore() * 100 : 0.0
                );
            }
            byte[] csvBytes = sw.toString().getBytes(java.nio.charset.StandardCharsets.UTF_8);

            return ResponseEntity.ok()
                .header(HttpHeaders.CONTENT_DISPOSITION, "attachment; filename=\"attendance-report.csv\"")
                .contentType(MediaType.parseMediaType("text/csv; charset=UTF-8"))
                .body(csvBytes);
        } catch (Exception e) {
            return ResponseEntity.internalServerError().build();
        }
    }

    private String safe(String s) {
        if (s == null) return "";
        // Escape dấu phẩy và nháy kép trong CSV
        if (s.contains(",") || s.contains("\"")) return "\"" + s.replace("\"", "\"\"") + "\"";
        return s;
    }
}
