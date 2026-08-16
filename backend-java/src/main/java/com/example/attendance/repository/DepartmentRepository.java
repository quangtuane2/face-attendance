package com.example.attendance.repository;

import java.util.List;

import org.springframework.data.jpa.repository.JpaRepository;

import com.example.attendance.entity.Department;

public interface DepartmentRepository extends JpaRepository<Department, Long> {
    List<Department> findByParentIsNull();  // lấy tất cả phòng ban gốc (root)
    List<Department> findByParentId(Long parentId);
    boolean existsByName(String name);
}
