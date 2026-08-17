package com.example.attendance.entity;

import com.fasterxml.jackson.annotation.JsonIgnoreProperties;
import jakarta.persistence.*;
import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.List;

@Entity
@Table(name = "meetings")
@JsonIgnoreProperties({"hibernateLazyInitializer", "handler"})
public class Meeting {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(nullable = false, length = 500)
    private String title;

    @Column(columnDefinition = "TEXT")
    private String description;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "organizer_id", nullable = false)
    @JsonIgnoreProperties({"attendanceLogs", "department", "shift"})
    private Employee organizer;

    @Column(name = "room_code", unique = true, length = 50)
    private String roomCode;

    @Column(name = "scheduled_at", nullable = false)
    private LocalDateTime scheduledAt;

    @Column(name = "duration_minutes")
    private Integer durationMinutes = 60;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false)
    private MeetingStatus status = MeetingStatus.SCHEDULED;

    @Column(name = "meeting_notes", columnDefinition = "TEXT")
    private String meetingNotes;

    @OneToMany(mappedBy = "meeting", cascade = CascadeType.ALL, fetch = FetchType.LAZY)
    @JsonIgnoreProperties("meeting")
    private List<MeetingParticipant> participants = new ArrayList<>();

    @Column(name = "created_at", updatable = false)
    private LocalDateTime createdAt;

    @PrePersist
    protected void onCreate() { this.createdAt = LocalDateTime.now(); }

    // Enums
    public enum MeetingStatus { SCHEDULED, ONGOING, ENDED, CANCELLED }

    // Getters & Setters
    public Long getId() { return id; }
    public void setId(Long id) { this.id = id; }

    public String getTitle() { return title; }
    public void setTitle(String title) { this.title = title; }

    public String getDescription() { return description; }
    public void setDescription(String description) { this.description = description; }

    public Employee getOrganizer() { return organizer; }
    public void setOrganizer(Employee organizer) { this.organizer = organizer; }

    public String getRoomCode() { return roomCode; }
    public void setRoomCode(String roomCode) { this.roomCode = roomCode; }

    public LocalDateTime getScheduledAt() { return scheduledAt; }
    public void setScheduledAt(LocalDateTime scheduledAt) { this.scheduledAt = scheduledAt; }

    public Integer getDurationMinutes() { return durationMinutes; }
    public void setDurationMinutes(Integer durationMinutes) { this.durationMinutes = durationMinutes; }

    public MeetingStatus getStatus() { return status; }
    public void setStatus(MeetingStatus status) { this.status = status; }

    public String getMeetingNotes() { return meetingNotes; }
    public void setMeetingNotes(String meetingNotes) { this.meetingNotes = meetingNotes; }

    public List<MeetingParticipant> getParticipants() { return participants; }
    public void setParticipants(List<MeetingParticipant> participants) { this.participants = participants; }

    public LocalDateTime getCreatedAt() { return createdAt; }
}
