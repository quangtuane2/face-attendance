package com.example.attendance.repository;

import com.example.attendance.entity.Employee;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import java.util.List;
import java.util.Optional;

public interface EmployeeRepository extends JpaRepository<Employee, Long> {
    Optional<Employee> findByEmployeeCode(String employeeCode);
    boolean existsByEmployeeCode(String employeeCode);
    boolean existsByEmail(String email);
    List<Employee> findByDepartmentId(Long departmentId);
    List<Employee> findByShiftId(Long shiftId);
    List<Employee> findByActiveTrue();

    @Query(value = "SELECT * FROM employees e WHERE e.active = true " +
           "AND (:departmentId IS NULL OR e.department_id = :departmentId) " +
           "AND (:shiftId IS NULL OR e.shift_id = :shiftId)",
           nativeQuery = true)
    List<Employee> findWithFilters(
        @Param("departmentId") Long departmentId,
        @Param("shiftId") Long shiftId
    );

    // Lấy số thứ tự lớn nhất trong mã NV (VD: NV003 → trả về 3)
    @Query(value = "SELECT MAX(CAST(SUBSTRING(employee_code, 3) AS UNSIGNED)) FROM employees " +
                   "WHERE employee_code REGEXP '^NV[0-9]+$'", nativeQuery = true)
    Optional<Long> findMaxEmployeeCodeNumber();
}
