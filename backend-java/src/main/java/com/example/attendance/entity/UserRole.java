package com.example.attendance.entity;

public enum UserRole {
    ADMIN,        // Quản trị viên – toàn quyền, xem mọi dashboard
    TRUONG_PHONG, // Trưởng phòng – quản lý nhân viên + task trong phòng
    PHO_PHONG,    // Phó phòng    – tương tự trưởng phòng
    CHUYEN_VIEN   // Chuyên viên  – chỉ xem task được giao, họp, comment
}
