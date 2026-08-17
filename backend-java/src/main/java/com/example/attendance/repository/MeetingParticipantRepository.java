package com.example.attendance.repository;

import com.example.attendance.entity.MeetingParticipant;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.Optional;

public interface MeetingParticipantRepository extends JpaRepository<MeetingParticipant, Long> {

    List<MeetingParticipant> findByMeetingId(Long meetingId);

    Optional<MeetingParticipant> findByMeetingIdAndEmployeeId(Long meetingId, Long employeeId);

    void deleteByMeetingIdAndEmployeeId(Long meetingId, Long employeeId);

    boolean existsByMeetingIdAndEmployeeId(Long meetingId, Long employeeId);
}
