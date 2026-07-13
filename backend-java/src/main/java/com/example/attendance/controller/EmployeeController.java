package com.example.attendance.controller;

import com.example.attendance.entity.Department;
import com.example.attendance.entity.Employee;
import com.example.attendance.entity.Shift;
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

    /**
     * Tạo mã nhân viên tự động theo pattern NV001, NV002, ...
     */
    private String generateNextEmployeeCode() {
        Long maxNum = employeeRepository.findMaxEmployeeCodeNumber().orElse(0L);
        long next = (maxNum == null ? 0L : maxNum) + 1;
        return String.format("NV%03d", next);
    }

    /**
     * DTO cho create/update employee
     */
    record EmployeeRequest(
        String employeeCode,
        String fullName,
        String email,
        String phone,
        DeptRef department,
        ShiftRef shift
    ) {}
    record DeptRef(Long id) {}
    record ShiftRef(Long id) {}

    @PostMapping
    public ResponseEntity<?> create(@RequestBody EmployeeRequest req) {
        // Tự động sinh mã nếu không cung cấp hoặc trống
        String code = (req.employeeCode() == null || req.employeeCode().isBlank())
            ? generateNextEmployeeCode()
            : req.employeeCode().trim();

        // Kiểm tra trùng mã
        if (employeeRepository.existsByEmployeeCode(code)) {
            return ResponseEntity.badRequest()
                .body(Map.of("error", "Mã nhân viên \"" + code + "\" đã tồn tại"));
        }

        // Validate họ tên
        if (req.fullName() == null || req.fullName().isBlank()) {
            return ResponseEntity.badRequest()
                .body(Map.of("error", "Họ và tên không được để trống"));
        }

        Employee emp = new Employee();
        emp.setEmployeeCode(code);
        emp.setFullName(req.fullName().trim());
        emp.setEmail(nullIfBlank(req.email()));
        emp.setPhone(nullIfBlank(req.phone()));
        emp.setActive(true);
        emp.setFaceEnrolled(false);

        // Resolve Department
        if (req.department() != null && req.department().id() != null) {
            departmentRepository.findById(req.department().id())
                .ifPresent(emp::setDepartment);
        }

        // Resolve Shift
        if (req.shift() != null && req.shift().id() != null) {
            shiftRepository.findById(req.shift().id())
                .ifPresent(emp::setShift);
        }

        Employee saved = employeeRepository.save(emp);
        return ResponseEntity.ok(saved);
    }

    @PutMapping("/{id}")
    public ResponseEntity<?> update(@PathVariable Long id, @RequestBody EmployeeRequest req) {
        return employeeRepository.findById(id).map(emp -> {
            if (req.fullName() != null && !req.fullName().isBlank())
                emp.setFullName(req.fullName().trim());
            emp.setEmail(nullIfBlank(req.email()));
            emp.setPhone(nullIfBlank(req.phone()));

            // Resolve Department
            if (req.department() != null && req.department().id() != null) {
                departmentRepository.findById(req.department().id())
                    .ifPresent(emp::setDepartment);
            } else {
                emp.setDepartment(null);
            }

            // Resolve Shift
            if (req.shift() != null && req.shift().id() != null) {
                shiftRepository.findById(req.shift().id())
                    .ifPresent(emp::setShift);
            } else {
                emp.setShift(null);
            }

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

    /**
     * Lấy mã nhân viên tiếp theo (dùng cho frontend preview)
     */
    @GetMapping("/next-code")
    public ResponseEntity<Map<String, String>> getNextCode() {
        return ResponseEntity.ok(Map.of("code", generateNextEmployeeCode()));
    }

    /** Convert chuỗi rỗng hoặc chỉ khoảng trắng thành null (tránh UNIQUE constraint với "") */
    private String nullIfBlank(String s) {
        return (s == null || s.isBlank()) ? null : s.trim();
    }
}
