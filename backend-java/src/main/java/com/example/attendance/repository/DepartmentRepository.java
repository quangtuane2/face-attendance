package com.example.attendance.repository;

import com.example.attendance.entity.Department;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import java.util.List;

public interface DepartmentRepository extends JpaRepository<Department, Long> {
    List<Department> findByParentIsNull();  // lấy tất cả phòng ban gốc (root)
    List<Department> findByParentId(Long parentId);
    boolean existsByName(String name);
}
