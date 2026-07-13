package com.example.attendance.repository;

import com.example.attendance.entity.AttendanceLog;
import com.example.attendance.entity.AttendanceStatus;
import com.example.attendance.entity.CheckType;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import java.time.LocalDateTime;
import java.util.List;
import java.util.Optional;

public interface AttendanceLogRepository extends JpaRepository<AttendanceLog, Long> {

    List<AttendanceLog> findByEmployeeIdOrderByCheckTimeDesc(Long employeeId);

    List<AttendanceLog> findByCheckTimeBetweenOrderByCheckTimeDesc(
        LocalDateTime from, LocalDateTime to
    );

    @Query("SELECT a FROM AttendanceLog a WHERE " +
           "(:employeeId IS NULL OR a.employee.id = :employeeId) AND " +
           "a.checkTime BETWEEN :from AND :to " +
           "ORDER BY a.checkTime DESC")
    List<AttendanceLog> findWithFilters(
        @Param("employeeId") Long employeeId,
        @Param("from") LocalDateTime from,
        @Param("to") LocalDateTime to
    );

    // Kiểm tra nhân viên đã check-in hôm nay chưa
    @Query("SELECT a FROM AttendanceLog a WHERE a.employee.id = :employeeId " +
           "AND a.checkType = :checkType AND a.checkTime BETWEEN :from AND :to")
    Optional<AttendanceLog> findTodayLog(
        @Param("employeeId") Long employeeId,
        @Param("checkType") CheckType checkType,
        @Param("from") LocalDateTime from,
        @Param("to") LocalDateTime to
    );

    // Đếm theo trạng thái trong ngày (cho dashboard)
    @Query("SELECT COUNT(a) FROM AttendanceLog a WHERE a.checkType = 'IN' " +
           "AND a.checkTime BETWEEN :from AND :to AND a.status = :status")
    long countByStatusAndDate(
        @Param("status") AttendanceStatus status,
        @Param("from") LocalDateTime from,
        @Param("to") LocalDateTime to
    );

    // Đếm check-in theo ngày cụ thể (cho biểu đồ 7 ngày)
    @Query("SELECT COUNT(a) FROM AttendanceLog a WHERE a.checkType = 'IN' " +
           "AND a.checkTime BETWEEN :from AND :to AND a.status = :status")
    long countCheckInByStatusAndDay(
        @Param("status") AttendanceStatus status,
        @Param("from") LocalDateTime from,
        @Param("to") LocalDateTime to
    );

    // Tổng số check-in trong 1 ngày
    @Query("SELECT COUNT(a) FROM AttendanceLog a WHERE a.checkType = 'IN' " +
           "AND a.checkTime BETWEEN :from AND :to")
    long countCheckInByDay(
        @Param("from") LocalDateTime from,
        @Param("to") LocalDateTime to
    );

    // Lấy log gần đây nhất (dùng Pageable để limit)
    @Query("SELECT a FROM AttendanceLog a LEFT JOIN FETCH a.employee e " +
           "LEFT JOIN FETCH e.department ORDER BY a.checkTime DESC")
    List<AttendanceLog> findRecentLogs(Pageable pageable);
}
