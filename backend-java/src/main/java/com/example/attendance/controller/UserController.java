package com.example.attendance.controller;

import com.example.attendance.entity.Employee;
import com.example.attendance.entity.User;
import com.example.attendance.entity.UserRole;
import com.example.attendance.repository.EmployeeRepository;
import com.example.attendance.repository.UserRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/users")
public class UserController {

    @Autowired private UserRepository userRepository;
    @Autowired private EmployeeRepository employeeRepository;
    @Autowired private PasswordEncoder passwordEncoder;

    // DTO
    record UserRequest(
        String   username,
        String   password,
        String   fullName,
        String   role,        // ADMIN | TRUONG_PHONG | PHO_PHONG | CHUYEN_VIEN
        Long     employeeId,
        Boolean  active
    ) {}

    /** GET /api/users – Danh sách tất cả tài khoản */
    @GetMapping
    public ResponseEntity<List<User>> getAll() {
        return ResponseEntity.ok(userRepository.findAll());
    }

    /** GET /api/users/{id} */
    @GetMapping("/{id}")
    public ResponseEntity<User> getById(@PathVariable Long id) {
        return userRepository.findById(id)
                .map(ResponseEntity::ok)
                .orElse(ResponseEntity.notFound().build());
    }

    /** POST /api/users – Tạo tài khoản mới (Admin dùng) */
    @PostMapping
    public ResponseEntity<?> create(@RequestBody UserRequest req) {
        // Validate
        if (req.username() == null || req.username().isBlank())
            return ResponseEntity.badRequest().body(Map.of("error", "Username không được để trống"));
        if (req.password() == null || req.password().length() < 6)
            return ResponseEntity.badRequest().body(Map.of("error", "Password tối thiểu 6 ký tự"));
        if (userRepository.existsByUsername(req.username().trim()))
            return ResponseEntity.badRequest().body(Map.of("error", "Username \"" + req.username() + "\" đã tồn tại"));

        User user = new User();
        user.setUsername(req.username().trim());
        user.setPassword(passwordEncoder.encode(req.password()));
        user.setFullName(req.fullName());
        user.setActive(req.active() != null ? req.active() : true);

        // Role
        UserRole role = parseRole(req.role());
        user.setRole(role);

        // Liên kết Employee nếu KHÔNG phải ADMIN
        if (role != UserRole.ADMIN && req.employeeId() != null) {
            Employee emp = employeeRepository.findById(req.employeeId()).orElse(null);
            if (emp == null)
                return ResponseEntity.badRequest().body(Map.of("error", "Không tìm thấy nhân viên ID=" + req.employeeId()));
            user.setEmployee(emp);
            // Tự động lấy fullName từ nhân viên nếu chưa có
            if (user.getFullName() == null || user.getFullName().isBlank())
                user.setFullName(emp.getFullName());
        }

        return ResponseEntity.ok(userRepository.save(user));
    }

    /** PUT /api/users/{id} – Cập nhật tài khoản */
    @PutMapping("/{id}")
    public ResponseEntity<?> update(@PathVariable Long id, @RequestBody UserRequest req) {
        return userRepository.findById(id).map(user -> {
            if (req.fullName() != null) user.setFullName(req.fullName());
            if (req.active()   != null) user.setActive(req.active());
            if (req.role()     != null) user.setRole(parseRole(req.role()));

            // Đổi password (nếu có)
            if (req.password() != null && !req.password().isBlank()) {
                if (req.password().length() < 6)
                    return ResponseEntity.badRequest().<User>body(null);
                user.setPassword(passwordEncoder.encode(req.password()));
            }

            // Cập nhật liên kết employee
            if (req.employeeId() != null) {
                employeeRepository.findById(req.employeeId()).ifPresent(user::setEmployee);
            }

            return ResponseEntity.ok(userRepository.save(user));
        }).orElse(ResponseEntity.notFound().build());
    }

    /** PATCH /api/users/{id}/toggle – Kích hoạt / Vô hiệu hóa tài khoản */
    @PatchMapping("/{id}/toggle")
    public ResponseEntity<?> toggle(@PathVariable Long id) {
        return userRepository.findById(id).map(user -> {
            user.setActive(!Boolean.TRUE.equals(user.getActive()));
            return ResponseEntity.ok(userRepository.save(user));
        }).orElse(ResponseEntity.notFound().build());
    }

    /** DELETE /api/users/{id} */
    @DeleteMapping("/{id}")
    public ResponseEntity<?> delete(@PathVariable Long id) {
        return userRepository.findById(id).map(user -> {
            userRepository.delete(user);
            return ResponseEntity.ok(Map.of("message", "Đã xóa tài khoản"));
        }).orElse(ResponseEntity.notFound().build());
    }

    /** POST /api/users/create-for-employee – Tạo nhanh account cho nhân viên chưa có acc */
    @PostMapping("/create-for-employee/{employeeId}")
    public ResponseEntity<?> createForEmployee(@PathVariable Long employeeId,
                                               @RequestBody Map<String, String> body) {
        Employee emp = employeeRepository.findById(employeeId).orElse(null);
        if (emp == null)
            return ResponseEntity.badRequest().body(Map.of("error", "Không tìm thấy nhân viên"));

        // Username mặc định = mã nhân viên (vd: NV001)
        String username = body.getOrDefault("username", emp.getEmployeeCode().toLowerCase());
        // Password mặc định = "123456" hoặc do admin nhập
        String rawPassword = body.getOrDefault("password", "123456");

        if (userRepository.existsByUsername(username))
            return ResponseEntity.badRequest().body(Map.of("error", "Username \"" + username + "\" đã tồn tại"));

        User user = new User();
        user.setUsername(username);
        user.setPassword(passwordEncoder.encode(rawPassword));
        user.setFullName(emp.getFullName());
        user.setEmployee(emp);
        user.setRole(UserRole.CHUYEN_VIEN);
        user.setActive(true);

        return ResponseEntity.ok(Map.of(
            "user",     userRepository.save(user),
            "username", username,
            "password", rawPassword,  // trả về để admin thông báo cho nhân viên
            "message",  "Tạo tài khoản thành công"
        ));
    }

    // Helper
    private UserRole parseRole(String role) {
        try { return role == null ? UserRole.CHUYEN_VIEN : UserRole.valueOf(role.toUpperCase()); }
        catch (Exception e) { return UserRole.CHUYEN_VIEN; }
    }
}
