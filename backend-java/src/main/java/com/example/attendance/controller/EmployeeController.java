package com.example.attendance.controller;

import com.example.attendance.entity.Employee;
import com.example.attendance.repository.DepartmentRepository;
import com.example.attendance.repository.EmployeeRepository;
import com.example.attendance.repository.ShiftRepository;
import com.example.attendance.service.AiProxyService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;

import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/employees")
public class EmployeeController {

    @Autowired private EmployeeRepository employeeRepository;
    @Autowired private DepartmentRepository departmentRepository;
    @Autowired private ShiftRepository shiftRepository;
    @Autowired private AiProxyService aiProxyService;

    @GetMapping
    public ResponseEntity<List<Employee>> getAll(
            @RequestParam(required = false) Long departmentId,
            @RequestParam(required = false) Long shiftId) {
        return ResponseEntity.ok(employeeRepository.findWithFilters(departmentId, shiftId));
    }

    @GetMapping("/{id}")
    public ResponseEntity<Employee> getById(@PathVariable Long id) {
        return employeeRepository.findById(id)
                .map(ResponseEntity::ok)
                .orElse(ResponseEntity.notFound().build());
    }

    @PostMapping
    public ResponseEntity<?> create(@RequestBody Employee employee) {
        if (employeeRepository.existsByEmployeeCode(employee.getEmployeeCode())) {
            return ResponseEntity.badRequest().body(Map.of("error", "Mã nhân viên đã tồn tại"));
        }
        return ResponseEntity.ok(employeeRepository.save(employee));
    }

    @PutMapping("/{id}")
    public ResponseEntity<?> update(@PathVariable Long id, @RequestBody Employee updated) {
        return employeeRepository.findById(id).map(emp -> {
            emp.setFullName(updated.getFullName());
            emp.setEmail(updated.getEmail());
            emp.setPhone(updated.getPhone());
            emp.setDepartment(updated.getDepartment());
            emp.setShift(updated.getShift());
            emp.setActive(updated.getActive());
            return ResponseEntity.ok(employeeRepository.save(emp));
        }).orElse(ResponseEntity.notFound().build());
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<?> delete(@PathVariable Long id) {
        return employeeRepository.findById(id).map(emp -> {
            // Xóa face embedding trong Python AI service
            aiProxyService.deleteFace(id.toString());
            employeeRepository.delete(emp);
            return ResponseEntity.ok(Map.of("message", "Đã xóa nhân viên thành công"));
        }).orElse(ResponseEntity.notFound().build());
    }

    @PostMapping("/{id}/enroll")
    public ResponseEntity<Map<String, Object>> enrollFace(
            @PathVariable Long id,
            @RequestParam("image") MultipartFile imageFile) {
        return employeeRepository.findById(id).map(emp -> {
            try {
                byte[] imageBytes = imageFile.getBytes();
                @SuppressWarnings("unchecked")
                Map<String, Object> result = (Map<String, Object>) aiProxyService.enrollFace(
                    id.toString(), imageBytes, imageFile.getOriginalFilename()
                );

                if (Boolean.TRUE.equals(result.get("success"))) {
                    emp.setFaceEnrolled(true);
                    employeeRepository.save(emp);
                }
                return ResponseEntity.ok(result);
            } catch (Exception e) {
                java.util.Map<String, Object> errorBody = new java.util.HashMap<>();
                errorBody.put("success", false);
                errorBody.put("message", e.getMessage());
                return ResponseEntity.<Map<String, Object>>internalServerError()
                    .body(errorBody);
            }
        }).orElse(ResponseEntity.<Map<String, Object>>notFound().build());
    }
}
