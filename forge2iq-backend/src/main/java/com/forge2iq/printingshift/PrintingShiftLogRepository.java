package com.forge2iq.printingshift;

import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;

public interface PrintingShiftLogRepository extends JpaRepository<PrintingShiftLog, Long> {
    List<PrintingShiftLog> findByCompanyIdOrderByLogDateDescShiftDesc(Long companyId);
}
