package com.example.attendance.repository;

import java.util.List;

import org.springframework.data.jpa.repository.JpaRepository;

import com.example.attendance.entity.TaskComment;

public interface TaskCommentRepository extends JpaRepository<TaskComment, Long> {

    // Lấy tất cả bình luận của một task, mới nhất trước
    List<TaskComment> findByTaskIdOrderByCreatedAtDesc(Long taskId);

    // Đếm số bình luận của một task
    long countByTaskId(Long taskId);
}
