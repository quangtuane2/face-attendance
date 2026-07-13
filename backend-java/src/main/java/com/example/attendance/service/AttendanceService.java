package com.example.attendance.service;

import com.example.attendance.entity.*;
import com.example.attendance.repository.*;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.data.domain.PageRequest;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.*;
import java.util.*;

@Service
public class AttendanceService {
    private static final Logger log = LoggerFactory.getLogger(AttendanceService.class);

    @Autowired private AiProxyService aiProxyService;
    @Autowired private EmployeeRepository employeeRepository;
    @Autowired private AttendanceLogRepository attendanceLogRepository;

    /**
     * Xử lý chấm công từ webcam:
     * 1. Gọi Python AI nhận diện khuôn mặt
     * 2. Tìm nhân viên trong DB
     * 3. Xác định IN hay OUT dựa theo ca làm việc
     * 4. Lưu log chấm công
     */
    @Transactional
    public Map<String, Object> processCheckIn(byte[] imageBytes) {
        // Bước 1: Gọi Python AI nhận diện
        Map<String, Object> aiResult = aiProxyService.recognizeFace(imageBytes, "frame.jpg");

        boolean recognized = Boolean.TRUE.equals(aiResult.get("recognized"));
        if (!recognized) {
            return Map.of(
                "success", false,
                "message", aiResult.getOrDefault("message", "Không nhận diện được khuôn mặt"),
                "confidence", aiResult.getOrDefault("confidence", 0.0)
            );
        }

        // Bước 2: Tìm nhân viên
        String employeeIdStr = (String) aiResult.get("employee_id");
        Long employeeId = Long.parseLong(employeeIdStr);
        Optional<Employee> empOpt = employeeRepository.findById(employeeId);

        if (empOpt.isEmpty() || !empOpt.get().getActive()) {
            return Map.of("success", false, "message", "Nhân viên không tồn tại hoặc đã bị vô hiệu hóa");
        }

        Employee employee = empOpt.get();
        float confidence = ((Number) aiResult.get("confidence")).floatValue();

        // Bước 3: Xác định loại chấm công (IN hay OUT)
        LocalDateTime now = LocalDateTime.now();
        LocalDateTime startOfDay = now.toLocalDate().atStartOfDay();
        LocalDateTime endOfDay = now.toLocalDate().atTime(LocalTime.MAX);

        Optional<AttendanceLog> existingIn = attendanceLogRepository.findTodayLog(
            employeeId, CheckType.IN, startOfDay, endOfDay
        );

        CheckType checkType;
        if (existingIn.isEmpty()) {
            checkType = CheckType.IN;
        } else {
            // Đã có IN rồi, kiểm tra xem đã OUT chưa
            Optional<AttendanceLog> existingOut = attendanceLogRepository.findTodayLog(
                employeeId, CheckType.OUT, startOfDay, endOfDay
            );
            if (existingOut.isPresent()) {
                return Map.of(
                    "success", false,
                    "message", "Bạn đã chấm công vào và ra hôm nay rồi",
                    "employee", buildEmployeeInfo(employee)
                );
            }
            checkType = CheckType.OUT;
        }

        // Bước 4: Tính trạng thái (đúng giờ / trễ / về sớm)
        AttendanceStatus status = calculateStatus(employee, checkType, now);

        // Bước 5: Lưu log
        AttendanceLog log2 = new AttendanceLog();
        log2.setEmployee(employee);
        log2.setCheckType(checkType);
        log2.setCheckTime(now);
        log2.setConfidenceScore(confidence);
        log2.setStatus(status);
        attendanceLogRepository.save(log2);

        log.info("Check-in recorded: employee={}, type={}, status={}, confidence={}",
            employee.getFullName(), checkType, status, confidence);

        return Map.of(
            "success", true,
            "checkType", checkType.name(),
            "status", status.name(),
            "checkTime", now.toString(),
            "confidence", confidence,
            "employee", buildEmployeeInfo(employee),
            "message", buildSuccessMessage(employee, checkType, status, now)
        );
    }

    private AttendanceStatus calculateStatus(Employee employee, CheckType checkType, LocalDateTime now) {
        if (employee.getShift() == null) return AttendanceStatus.UNKNOWN;

        Shift shift = employee.getShift();
        LocalTime currentTime = now.toLocalTime();

        if (checkType == CheckType.IN) {
            LocalTime deadline = shift.getCheckInTime().plusMinutes(shift.getLateToleranceMinutes());
            return currentTime.isAfter(deadline) ? AttendanceStatus.LATE : AttendanceStatus.ON_TIME;
        } else {
            return currentTime.isBefore(shift.getCheckOutTime()) ?
                AttendanceStatus.EARLY_LEAVE : AttendanceStatus.ON_TIME;
        }
    }

    private Map<String, Object> buildEmployeeInfo(Employee emp) {
        return Map.of(
            "id", emp.getId(),
            "employeeCode", emp.getEmployeeCode(),
            "fullName", emp.getFullName(),
            "department", emp.getDepartment() != null ? emp.getDepartment().getName() : "",
            "avatarPath", emp.getAvatarPath() != null ? emp.getAvatarPath() : ""
        );
    }

    private String buildSuccessMessage(Employee emp, CheckType checkType, AttendanceStatus status, LocalDateTime time) {
        String timeStr = time.toLocalTime().toString().substring(0, 5);
        String action = checkType == CheckType.IN ? "Chào buổi sáng" : "Chúc buổi chiều vui vẻ";
        String statusStr = switch (status) {
            case ON_TIME -> "✅ Đúng giờ";
            case LATE -> "⚠️ Đi trễ";
            case EARLY_LEAVE -> "⚠️ Về sớm";
            default -> "";
        };
        return String.format("%s, %s! %s %s", action, emp.getFullName(), timeStr, statusStr);
    }

    public List<AttendanceLog> getLogs(Long employeeId, LocalDateTime from, LocalDateTime to) {
        return attendanceLogRepository.findWithFilters(employeeId, from, to);
    }

    public Map<String, Long> getDashboardStats() {
        LocalDateTime startOfDay = LocalDate.now().atStartOfDay();
        LocalDateTime endOfDay = LocalDate.now().atTime(LocalTime.MAX);

        long onTime = attendanceLogRepository.countByStatusAndDate(AttendanceStatus.ON_TIME, startOfDay, endOfDay);
        long late = attendanceLogRepository.countByStatusAndDate(AttendanceStatus.LATE, startOfDay, endOfDay);
        long total = employeeRepository.findByActiveTrue().size();

        return Map.of(
            "totalEmployees", total,
            "presentOnTime", onTime,
            "presentLate", late,
            "absent", Math.max(0, total - onTime - late)
        );
    }

    /**
     * Thống kê chấm công 7 ngày gần nhất cho biểu đồ dashboard
     * Trả về list các object: { date, dayLabel, onTime, late, total }
     */
    public List<Map<String, Object>> getWeeklyStats() {
        List<Map<String, Object>> result = new ArrayList<>();
        String[] dayLabels = {"CN", "T2", "T3", "T4", "T5", "T6", "T7"};

        for (int i = 6; i >= 0; i--) {
            LocalDate date = LocalDate.now().minusDays(i);
            LocalDateTime from = date.atStartOfDay();
            LocalDateTime to = date.atTime(LocalTime.MAX);

            long onTime = attendanceLogRepository.countCheckInByStatusAndDay(AttendanceStatus.ON_TIME, from, to);
            long late   = attendanceLogRepository.countCheckInByStatusAndDay(AttendanceStatus.LATE, from, to);
            long total  = attendanceLogRepository.countCheckInByDay(from, to);

            Map<String, Object> dayData = new LinkedHashMap<>();
            dayData.put("date", date.toString());
            dayData.put("day", dayLabels[date.getDayOfWeek().getValue() % 7]);
            dayData.put("onTime", onTime);
            dayData.put("late", late);
            dayData.put("total", total);
            result.add(dayData);
        }
        return result;
    }

    /**
     * Lấy N log chấm công gần nhất cho dashboard
     */
    public List<AttendanceLog> getRecentLogs(int limit) {
        return attendanceLogRepository.findRecentLogs(PageRequest.of(0, limit));
    }
}
