package com.example.attendance.controller;

import com.example.attendance.entity.Shift;
import com.example.attendance.repository.ShiftRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/shifts")
public class ShiftController {

    @Autowired private ShiftRepository shiftRepository;

    @GetMapping
    public ResponseEntity<List<Shift>> getAll() {
        return ResponseEntity.ok(shiftRepository.findAll());
    }

    @GetMapping("/{id}")
    public ResponseEntity<Shift> getById(@PathVariable Long id) {
        return shiftRepository.findById(id)
                .map(ResponseEntity::ok)
                .orElse(ResponseEntity.notFound().build());
    }

    @PostMapping
    public ResponseEntity<Shift> create(@RequestBody Shift shift) {
        return ResponseEntity.ok(shiftRepository.save(shift));
    }

    @PutMapping("/{id}")
    public ResponseEntity<?> update(@PathVariable Long id, @RequestBody Shift updated) {
        return shiftRepository.findById(id).map(shift -> {
            shift.setName(updated.getName());
            shift.setCheckInTime(updated.getCheckInTime());
            shift.setCheckOutTime(updated.getCheckOutTime());
            shift.setLateToleranceMinutes(updated.getLateToleranceMinutes());
            return ResponseEntity.ok(shiftRepository.save(shift));
        }).orElse(ResponseEntity.notFound().build());
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<?> delete(@PathVariable Long id) {
        shiftRepository.deleteById(id);
        return ResponseEntity.ok(Map.of("message", "Đã xóa ca làm việc"));
    }
}
