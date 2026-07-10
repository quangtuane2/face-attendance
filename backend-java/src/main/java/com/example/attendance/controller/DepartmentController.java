package com.example.attendance.controller;

import com.example.attendance.entity.Department;
import com.example.attendance.repository.DepartmentRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/departments")
public class DepartmentController {

    @Autowired private DepartmentRepository departmentRepository;

    @GetMapping
    public ResponseEntity<List<Department>> getAll() {
        return ResponseEntity.ok(departmentRepository.findAll());
    }

    // Trả về cây phân cấp (chỉ root nodes, children lồng nhau)
    @GetMapping("/tree")
    public ResponseEntity<List<Department>> getTree() {
        return ResponseEntity.ok(departmentRepository.findByParentIsNull());
    }

    @GetMapping("/{id}")
    public ResponseEntity<Department> getById(@PathVariable Long id) {
        return departmentRepository.findById(id)
                .map(ResponseEntity::ok)
                .orElse(ResponseEntity.notFound().build());
    }

    @PostMapping
    public ResponseEntity<?> create(@RequestBody Department department) {
        return ResponseEntity.ok(departmentRepository.save(department));
    }

    @PutMapping("/{id}")
    public ResponseEntity<?> update(@PathVariable Long id, @RequestBody Department updated) {
        return departmentRepository.findById(id).map(dept -> {
            dept.setName(updated.getName());
            dept.setDescription(updated.getDescription());
            dept.setParent(updated.getParent());
            dept.setManager(updated.getManager());
            return ResponseEntity.ok(departmentRepository.save(dept));
        }).orElse(ResponseEntity.notFound().build());
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<?> delete(@PathVariable Long id) {
        departmentRepository.deleteById(id);
        return ResponseEntity.ok(Map.of("message", "Đã xóa phòng ban"));
    }
}
