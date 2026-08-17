package com.example.attendance.repository;

import com.example.attendance.entity.Meeting;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.time.LocalDateTime;
import java.util.List;

public interface MeetingRepository extends JpaRepository<Meeting, Long> {

    // Lấy tất cả cuộc họp của người tổ chức
    List<Meeting> findByOrganizerIdOrderByScheduledAtDesc(Long organizerId);

    // Lấy cuộc họp theo trạng thái
    List<Meeting> findByStatusOrderByScheduledAtDesc(Meeting.MeetingStatus status);

    // Cuộc họp sắp diễn ra (trong vòng 7 ngày tới)
    @Query("SELECT m FROM Meeting m WHERE m.scheduledAt BETWEEN :now AND :end AND m.status = 'SCHEDULED' ORDER BY m.scheduledAt")
    List<Meeting> findUpcoming(@Param("now") LocalDateTime now, @Param("end") LocalDateTime end);

    // Cuộc họp mà employee là người tham dự
    @Query("SELECT m FROM Meeting m JOIN m.participants p WHERE p.employee.id = :employeeId ORDER BY m.scheduledAt DESC")
    List<Meeting> findByParticipantEmployeeId(@Param("employeeId") Long employeeId);

    // Cuộc họp mà employee là organizer HOẶC participant
    @Query("""
        SELECT DISTINCT m FROM Meeting m
        LEFT JOIN m.participants p
        WHERE m.organizer.id = :employeeId OR p.employee.id = :employeeId
        ORDER BY m.scheduledAt DESC
    """)
    List<Meeting> findAllForEmployee(@Param("employeeId") Long employeeId);

    // Đếm theo trạng thái
    long countByStatus(Meeting.MeetingStatus status);
}
