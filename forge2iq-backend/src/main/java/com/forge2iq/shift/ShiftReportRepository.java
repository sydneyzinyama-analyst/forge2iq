package com.forge2iq.shift;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;

import java.time.LocalDateTime;
import java.util.List;

public interface ShiftReportRepository extends JpaRepository<ShiftReport, Long> {
    List<ShiftReport> findByCompanyId(Long companyId);

    @Query("SELECT sr FROM ShiftReport sr WHERE sr.company.id = :companyId AND sr.createdAt >= :start AND sr.createdAt < :end")
    List<ShiftReport> findByCompanyIdAndDateRange(Long companyId, LocalDateTime start, LocalDateTime end);
}
