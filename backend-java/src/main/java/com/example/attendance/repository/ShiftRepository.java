package com.example.attendance.repository;

import org.springframework.data.jpa.repository.JpaRepository;

import com.example.attendance.entity.Shift;

public interface ShiftRepository extends JpaRepository<Shift, Long> {
}
