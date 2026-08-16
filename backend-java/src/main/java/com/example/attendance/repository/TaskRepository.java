package com.example.attendance.repository;

import com.example.attendance.entity.Task;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.List;

public interface TaskRepository extends JpaRepository<Task, Long> {

    // Lấy tất cả task của người được giao
    List<Task> findByAssigneeId(Long assigneeId);

    // Lấy tất cả task do người này tạo
    List<Task> findByCreatorId(Long creatorId);

    // Lấy task theo phòng ban
    List<Task> findByDepartmentId(Long departmentId);

    // Lấy task theo trạng thái
    List<Task> findByStatus(Task.TaskStatus status);

    // Lấy task theo mức độ ưu tiên
    List<Task> findByPriority(Task.Priority priority);

    // Lọc kết hợp nhiều tiêu chí
    @Query("SELECT t FROM Task t WHERE " +
           "(:status IS NULL OR t.status = :status) AND " +
           "(:priority IS NULL OR t.priority = :priority) AND " +
           "(:assigneeId IS NULL OR t.assignee.id = :assigneeId) AND " +
           "(:departmentId IS NULL OR t.department.id = :departmentId) AND " +
           "(:creatorId IS NULL OR t.creator.id = :creatorId)")
    List<Task> findWithFilters(
        @Param("status")       Task.TaskStatus status,
        @Param("priority")     Task.Priority priority,
        @Param("assigneeId")   Long assigneeId,
        @Param("departmentId") Long departmentId,
        @Param("creatorId")    Long creatorId
    );

    // Đếm task theo trạng thái (dùng cho dashboard)
    long countByStatus(Task.TaskStatus status);

    // Đếm task quá hạn (due_date < hôm nay và chưa DONE)
    @Query("SELECT COUNT(t) FROM Task t WHERE t.dueDate < CURRENT_DATE " +
           "AND t.status NOT IN (com.example.attendance.entity.Task.TaskStatus.DONE, " +
           "com.example.attendance.entity.Task.TaskStatus.CANCELLED)")
    long countOverdueTasks();
}
