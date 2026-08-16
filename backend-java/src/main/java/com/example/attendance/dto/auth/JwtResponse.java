package com.example.attendance.dto.auth;

public class JwtResponse {
    private String token;
    private String username;
    private String fullName;
    private String role;
    private Long   employeeId;  // ID nhân viên (null nếu là admin/hr)

    public JwtResponse(String token, String username, String fullName, String role, Long employeeId) {
        this.token      = token;
        this.username   = username;
        this.fullName   = fullName;
        this.role       = role;
        this.employeeId = employeeId;
    }

    public String getToken()      { return token; }
    public String getUsername()   { return username; }
    public String getFullName()   { return fullName; }
    public String getRole()       { return role; }
    public Long   getEmployeeId() { return employeeId; }
}
