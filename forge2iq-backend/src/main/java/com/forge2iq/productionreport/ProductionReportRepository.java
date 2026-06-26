package com.forge2iq.productionreport;

import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;

public interface ProductionReportRepository extends JpaRepository<ProductionReport, Long> {
    List<ProductionReport> findByCompanyIdOrderByReportDateDescSubmittedAtDesc(Long companyId);
}
