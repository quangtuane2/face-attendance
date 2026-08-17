package com.example.attendance.controller;

import com.example.attendance.entity.Employee;
import com.example.attendance.entity.Meeting;
import com.example.attendance.entity.MeetingParticipant;
import com.example.attendance.repository.EmployeeRepository;
import com.example.attendance.repository.MeetingParticipantRepository;
import com.example.attendance.repository.MeetingRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.bind.annotation.*;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Map;
import java.util.UUID;

@RestController
@RequestMapping("/api/meetings")
public class MeetingController {

    @Autowired private MeetingRepository            meetingRepository;
    @Autowired private MeetingParticipantRepository participantRepository;
    @Autowired private EmployeeRepository           employeeRepository;

    // DTO
    record MeetingRequest(
        String    title,
        String    description,
        Long      organizerId,
        String    scheduledAt,     // ISO: "2026-08-20T09:00:00"
        Integer   durationMinutes,
        List<Long> participantIds  // Danh sách employee IDs được mời
    ) {}

    /** GET /api/meetings – Tất cả cuộc họp (có lọc theo employeeId) */
    @GetMapping
    public ResponseEntity<List<Meeting>> getAll(
            @RequestParam(required = false) Long employeeId,
            @RequestParam(required = false) String status) {

        if (employeeId != null) {
            return ResponseEntity.ok(meetingRepository.findAllForEmployee(employeeId));
        }
        if (status != null) {
            try {
                return ResponseEntity.ok(meetingRepository.findByStatusOrderByScheduledAtDesc(
                    Meeting.MeetingStatus.valueOf(status.toUpperCase())
                ));
            } catch (Exception e) { /* fallthrough */ }
        }
        return ResponseEntity.ok(meetingRepository.findAll());
    }

    /** GET /api/meetings/upcoming – Cuộc họp sắp diễn ra (7 ngày tới) */
    @GetMapping("/upcoming")
    public ResponseEntity<List<Meeting>> getUpcoming() {
        return ResponseEntity.ok(
            meetingRepository.findUpcoming(LocalDateTime.now(), LocalDateTime.now().plusDays(7))
        );
    }

    /** GET /api/meetings/{id} */
    @GetMapping("/{id}")
    public ResponseEntity<Meeting> getById(@PathVariable Long id) {
        return meetingRepository.findById(id)
                .map(ResponseEntity::ok)
                .orElse(ResponseEntity.notFound().build());
    }

    /** POST /api/meetings – Tạo cuộc họp mới */
    @PostMapping
    @Transactional
    public ResponseEntity<?> create(@RequestBody MeetingRequest req) {
        if (req.title() == null || req.title().isBlank())
            return ResponseEntity.badRequest().body(Map.of("error", "Tiêu đề không được để trống"));
        if (req.organizerId() == null)
            return ResponseEntity.badRequest().body(Map.of("error", "Phải chọn người tổ chức"));
        if (req.scheduledAt() == null)
            return ResponseEntity.badRequest().body(Map.of("error", "Phải chọn thời gian họp"));

        Employee organizer = employeeRepository.findById(req.organizerId()).orElse(null);
        if (organizer == null)
            return ResponseEntity.badRequest().body(Map.of("error", "Không tìm thấy người tổ chức"));

        Meeting meeting = new Meeting();
        meeting.setTitle(req.title().trim());
        meeting.setDescription(req.description());
        meeting.setOrganizer(organizer);
        meeting.setScheduledAt(LocalDateTime.parse(req.scheduledAt()));
        meeting.setDurationMinutes(req.durationMinutes() != null ? req.durationMinutes() : 60);
        meeting.setRoomCode(generateRoomCode());

        final Meeting savedMeeting = meetingRepository.save(meeting);

        // Thêm người tham dự
        if (req.participantIds() != null) {
            for (Long empId : req.participantIds()) {
                if (participantRepository.existsByMeetingIdAndEmployeeId(savedMeeting.getId(), empId)) continue;
                employeeRepository.findById(empId).ifPresent(emp -> {
                    MeetingParticipant p = new MeetingParticipant();
                    p.setMeeting(savedMeeting);
                    p.setEmployee(emp);
                    participantRepository.save(p);
                });
            }
        }

        return ResponseEntity.ok(meetingRepository.findById(savedMeeting.getId()).orElse(savedMeeting));
    }

    /** PUT /api/meetings/{id} – Cập nhật thông tin cuộc họp */
    @PutMapping("/{id}")
    @Transactional
    public ResponseEntity<?> update(@PathVariable Long id, @RequestBody MeetingRequest req) {
        return meetingRepository.findById(id).map(meeting -> {
            if (req.title() != null && !req.title().isBlank())
                meeting.setTitle(req.title().trim());
            if (req.description() != null)
                meeting.setDescription(req.description());
            if (req.scheduledAt() != null)
                meeting.setScheduledAt(LocalDateTime.parse(req.scheduledAt()));
            if (req.durationMinutes() != null)
                meeting.setDurationMinutes(req.durationMinutes());
            return ResponseEntity.ok(meetingRepository.save(meeting));
        }).orElse(ResponseEntity.notFound().build());
    }

    /** PATCH /api/meetings/{id}/status – Đổi trạng thái cuộc họp */
    @PatchMapping("/{id}/status")
    public ResponseEntity<?> updateStatus(@PathVariable Long id, @RequestBody Map<String, String> body) {
        return meetingRepository.findById(id).map(meeting -> {
            try {
                meeting.setStatus(Meeting.MeetingStatus.valueOf(body.get("status").toUpperCase()));
                return ResponseEntity.ok(meetingRepository.save(meeting));
            } catch (Exception e) {
                return ResponseEntity.badRequest().<Meeting>body(null);
            }
        }).orElse(ResponseEntity.notFound().build());
    }

    /** PATCH /api/meetings/{id}/notes – Lưu biên bản cuộc họp */
    @PatchMapping("/{id}/notes")
    public ResponseEntity<?> updateNotes(@PathVariable Long id, @RequestBody Map<String, String> body) {
        return meetingRepository.findById(id).map(meeting -> {
            meeting.setMeetingNotes(body.get("notes"));
            return ResponseEntity.ok(meetingRepository.save(meeting));
        }).orElse(ResponseEntity.notFound().build());
    }

    /** DELETE /api/meetings/{id} */
    @DeleteMapping("/{id}")
    @Transactional
    public ResponseEntity<?> delete(@PathVariable Long id) {
        return meetingRepository.findById(id).map(meeting -> {
            meetingRepository.delete(meeting);
            return ResponseEntity.ok(Map.of("message", "Đã xóa cuộc họp"));
        }).orElse(ResponseEntity.notFound().build());
    }

    // ─── Participants ──────────────────────────────────────────

    /** GET /api/meetings/{id}/participants */
    @GetMapping("/{id}/participants")
    public ResponseEntity<List<MeetingParticipant>> getParticipants(@PathVariable Long id) {
        return ResponseEntity.ok(participantRepository.findByMeetingId(id));
    }

    /** POST /api/meetings/{id}/participants – Mời thêm người */
    @PostMapping("/{id}/participants")
    public ResponseEntity<?> addParticipant(@PathVariable Long id, @RequestBody Map<String, Long> body) {
        Long empId = body.get("employeeId");
        if (empId == null) return ResponseEntity.badRequest().body(Map.of("error", "Thiếu employeeId"));

        return meetingRepository.findById(id).map(meeting -> {
            if (participantRepository.existsByMeetingIdAndEmployeeId(id, empId))
                return ResponseEntity.badRequest().<MeetingParticipant>body(null);
            return employeeRepository.findById(empId).map(emp -> {
                MeetingParticipant p = new MeetingParticipant();
                p.setMeeting(meeting);
                p.setEmployee(emp);
                return ResponseEntity.ok(participantRepository.save(p));
            }).orElse(ResponseEntity.notFound().build());
        }).orElse(ResponseEntity.notFound().build());
    }

    /** PATCH /api/meetings/{meetingId}/participants/{empId}/status – Xác nhận tham dự */
    @PatchMapping("/{meetingId}/participants/{empId}/status")
    public ResponseEntity<?> updateParticipantStatus(
            @PathVariable Long meetingId,
            @PathVariable Long empId,
            @RequestBody Map<String, String> body) {

        return participantRepository.findByMeetingIdAndEmployeeId(meetingId, empId)
            .map(p -> {
                try {
                    p.setStatus(MeetingParticipant.ParticipantStatus.valueOf(body.get("status").toUpperCase()));
                    if ("ATTENDED".equals(body.get("status"))) p.setJoinedAt(LocalDateTime.now());
                    return ResponseEntity.ok(participantRepository.save(p));
                } catch (Exception e) {
                    return ResponseEntity.badRequest().<MeetingParticipant>body(null);
                }
            }).orElse(ResponseEntity.notFound().build());
    }

    /** DELETE /api/meetings/{meetingId}/participants/{empId} – Xóa người tham dự */
    @DeleteMapping("/{meetingId}/participants/{empId}")
    @Transactional
    public ResponseEntity<?> removeParticipant(@PathVariable Long meetingId, @PathVariable Long empId) {
        participantRepository.deleteByMeetingIdAndEmployeeId(meetingId, empId);
        return ResponseEntity.ok(Map.of("message", "Đã xóa người tham dự"));
    }

    // Helper tạo room code ngắn gọn
    private String generateRoomCode() {
        return "MTG-" + UUID.randomUUID().toString().substring(0, 8).toUpperCase();
    }
}
