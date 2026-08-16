package com.example.attendance.controller;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.List;
import java.util.Map;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PatchMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import com.example.attendance.entity.Task;
import com.example.attendance.entity.TaskComment;
import com.example.attendance.repository.DepartmentRepository;
import com.example.attendance.repository.EmployeeRepository;
import com.example.attendance.repository.TaskCommentRepository;
import com.example.attendance.repository.TaskRepository;

@RestController
@RequestMapping("/api/tasks")
public class TaskController {

    @Autowired private TaskRepository taskRepository;
    @Autowired private TaskCommentRepository taskCommentRepository;
    @Autowired private EmployeeRepository employeeRepository;
    @Autowired private DepartmentRepository departmentRepository;

    //  DTO nội bộ
    record TaskRequest(
        String title,
        String description,
        String taskType,
        String priority,
        String status,
        Long   creatorId,
        Long   assigneeId,
        Long   departmentId,
        String startDate,     // "yyyy-MM-dd"
        String dueDate,
        Integer progress
    ) {}

    record CommentRequest(Long authorId, String content) {}

    //  TASK CRUD
    /** GET /api/tasks  –  Lấy danh sách (có lọc) */
    @GetMapping
    public ResponseEntity<List<Task>> getAll(
            @RequestParam(required = false) String status,
            @RequestParam(required = false) String priority,
            @RequestParam(required = false) Long   assigneeId,
            @RequestParam(required = false) Long   departmentId,
            @RequestParam(required = false) Long   creatorId) {

        Task.TaskStatus s = parseEnum(Task.TaskStatus.class, status);
        Task.Priority   p = parseEnum(Task.Priority.class,   priority);

        return ResponseEntity.ok(
            taskRepository.findWithFilters(s, p, assigneeId, departmentId, creatorId)
        );
    }

    /** GET /api/tasks/{id}  –  Lấy chi tiết 1 task */
    @GetMapping("/{id}")
    public ResponseEntity<Task> getById(@PathVariable Long id) {
        return taskRepository.findById(id)
                .map(ResponseEntity::ok)
                .orElse(ResponseEntity.notFound().build());
    }

    /** POST /api/tasks  –  Tạo task mới */
    @PostMapping
    public ResponseEntity<?> create(@RequestBody TaskRequest req) {
        if (req.title() == null || req.title().isBlank())
            return ResponseEntity.badRequest().body(Map.of("error", "Tiêu đề không được để trống"));

        if (req.creatorId() == null)
            return ResponseEntity.badRequest().body(Map.of("error", "Cần có người tạo task"));

        var creator = employeeRepository.findById(req.creatorId()).orElse(null);
        if (creator == null)
            return ResponseEntity.badRequest().body(Map.of("error", "Không tìm thấy người tạo"));

        Task task = new Task();
        task.setTitle(req.title().trim());
        task.setDescription(req.description());
        task.setCreator(creator);
        task.setProgress(req.progress() != null ? req.progress() : 0);

        if (req.taskType() != null)   task.setTaskType(Task.TaskType.valueOf(req.taskType()));
        if (req.priority()  != null)  task.setPriority(Task.Priority.valueOf(req.priority()));
        if (req.status()    != null)  task.setStatus(Task.TaskStatus.valueOf(req.status()));
        if (req.startDate() != null)  task.setStartDate(LocalDate.parse(req.startDate()));
        if (req.dueDate()   != null)  task.setDueDate(LocalDate.parse(req.dueDate()));

        if (req.assigneeId() != null)
            employeeRepository.findById(req.assigneeId()).ifPresent(task::setAssignee);

        if (req.departmentId() != null)
            departmentRepository.findById(req.departmentId()).ifPresent(task::setDepartment);

        return ResponseEntity.ok(taskRepository.save(task));
    }

    /** PUT /api/tasks/{id}  –  Cập nhật task */
    @PutMapping("/{id}")
    public ResponseEntity<?> update(@PathVariable Long id, @RequestBody TaskRequest req) {
        return taskRepository.findById(id).map(task -> {
            if (req.title() != null && !req.title().isBlank())
                task.setTitle(req.title().trim());
            if (req.description() != null)
                task.setDescription(req.description());
            if (req.taskType() != null)
                task.setTaskType(Task.TaskType.valueOf(req.taskType()));
            if (req.priority() != null)
                task.setPriority(Task.Priority.valueOf(req.priority()));
            if (req.status() != null) {
                task.setStatus(Task.TaskStatus.valueOf(req.status()));
                // Tự động ghi thời gian hoàn thành
                if (Task.TaskStatus.DONE.name().equals(req.status()) && task.getCompletedAt() == null)
                    task.setCompletedAt(LocalDateTime.now());
            }
            if (req.startDate() != null) task.setStartDate(LocalDate.parse(req.startDate()));
            if (req.dueDate()   != null) task.setDueDate(LocalDate.parse(req.dueDate()));
            if (req.progress()  != null) task.setProgress(req.progress());

            if (req.assigneeId() != null)
                employeeRepository.findById(req.assigneeId()).ifPresent(task::setAssignee);

            if (req.departmentId() != null)
                departmentRepository.findById(req.departmentId()).ifPresent(task::setDepartment);

            return ResponseEntity.ok(taskRepository.save(task));
        }).orElse(ResponseEntity.notFound().build());
    }

    /** PATCH /api/tasks/{id}/status  –  Cập nhật nhanh trạng thái (dùng Kanban kéo thả) */
    @PatchMapping("/{id}/status")
    public ResponseEntity<?> updateStatus(
            @PathVariable Long id,
            @RequestBody Map<String, String> body) {
        String newStatus = body.get("status");
        if (newStatus == null)
            return ResponseEntity.badRequest().body(Map.of("error", "Thiếu trường status"));

        return taskRepository.findById(id).map(task -> {
            task.setStatus(Task.TaskStatus.valueOf(newStatus));
            if (Task.TaskStatus.DONE.name().equals(newStatus) && task.getCompletedAt() == null)
                task.setCompletedAt(LocalDateTime.now());
            return ResponseEntity.ok(taskRepository.save(task));
        }).orElse(ResponseEntity.notFound().build());
    }

    /** PATCH /api/tasks/{id}/progress  –  Cập nhật % tiến độ */
    @PatchMapping("/{id}/progress")
    public ResponseEntity<?> updateProgress(
            @PathVariable Long id,
            @RequestBody Map<String, Integer> body) {
        Integer progress = body.get("progress");
        if (progress == null || progress < 0 || progress > 100)
            return ResponseEntity.badRequest().body(Map.of("error", "progress phải từ 0 đến 100"));

        return taskRepository.findById(id).map(task -> {
            task.setProgress(progress);
            if (progress == 100 && task.getCompletedAt() == null)
                task.setCompletedAt(LocalDateTime.now());
            return ResponseEntity.ok(taskRepository.save(task));
        }).orElse(ResponseEntity.notFound().build());
    }

    /** DELETE /api/tasks/{id} */
    @DeleteMapping("/{id}")
    public ResponseEntity<?> delete(@PathVariable Long id) {
        return taskRepository.findById(id).map(task -> {
            taskRepository.delete(task);
            return ResponseEntity.ok(Map.of("message", "Đã xóa task thành công"));
        }).orElse(ResponseEntity.notFound().build());
    }

    //  TASK STATS (dùng cho Dashboard)

    /** GET /api/tasks/stats  –  Thống kê số lượng theo trạng thái */
    @GetMapping("/stats")
    public ResponseEntity<Map<String, Long>> getStats() {
        return ResponseEntity.ok(Map.of(
            "total",       taskRepository.count(),
            "new",         taskRepository.countByStatus(Task.TaskStatus.NEW),
            "inProgress",  taskRepository.countByStatus(Task.TaskStatus.IN_PROGRESS),
            "review",      taskRepository.countByStatus(Task.TaskStatus.REVIEW),
            "done",        taskRepository.countByStatus(Task.TaskStatus.DONE),
            "overdue",     taskRepository.countOverdueTasks()
        ));
    }

    //  COMMENTS

    /** GET /api/tasks/{id}/comments */
    @GetMapping("/{id}/comments")
    public ResponseEntity<List<TaskComment>> getComments(@PathVariable Long id) {
        return ResponseEntity.ok(taskCommentRepository.findByTaskIdOrderByCreatedAtDesc(id));
    }

    /** POST /api/tasks/{id}/comments */
    @PostMapping("/{id}/comments")
    public ResponseEntity<?> addComment(
            @PathVariable Long id,
            @RequestBody CommentRequest req) {
        if (req.content() == null || req.content().isBlank())
            return ResponseEntity.badRequest().body(Map.of("error", "Nội dung bình luận không được để trống"));

        var task   = taskRepository.findById(id).orElse(null);
        var author = req.authorId() != null ? employeeRepository.findById(req.authorId()).orElse(null) : null;

        if (task == null)   return ResponseEntity.notFound().build();
        if (author == null) return ResponseEntity.badRequest().body(Map.of("error", "Không tìm thấy người bình luận"));

        TaskComment comment = new TaskComment();
        comment.setTask(task);
        comment.setAuthor(author);
        comment.setContent(req.content().trim());

        return ResponseEntity.ok(taskCommentRepository.save(comment));
    }

    /** DELETE /api/tasks/{taskId}/comments/{commentId} */
    @DeleteMapping("/{taskId}/comments/{commentId}")
    public ResponseEntity<?> deleteComment(
            @PathVariable Long taskId,
            @PathVariable Long commentId) {
        return taskCommentRepository.findById(commentId).map(c -> {
            taskCommentRepository.delete(c);
            return ResponseEntity.ok(Map.of("message", "Đã xóa bình luận"));
        }).orElse(ResponseEntity.notFound().build());
    }

    //  Helper
    private <E extends Enum<E>> E parseEnum(Class<E> clazz, String value) {
        try {
            return value == null ? null : Enum.valueOf(clazz, value.toUpperCase());
        } catch (IllegalArgumentException e) {
            return null;
        }
    }
}
