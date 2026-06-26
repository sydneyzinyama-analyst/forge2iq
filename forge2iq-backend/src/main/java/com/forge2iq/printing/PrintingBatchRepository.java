package com.forge2iq.printing;

import org.springframework.data.jpa.repository.JpaRepository;
import java.time.LocalDateTime;
import java.util.List;

public interface PrintingBatchRepository extends JpaRepository<PrintingBatch, Long> {
    List<PrintingBatch> findByCompanyIdOrderByLoggedAtDesc(Long companyId);
    List<PrintingBatch> findByCompanyIdAndLoggedAtAfterOrderByLoggedAtDesc(Long companyId, LocalDateTime since);
    List<PrintingBatch> findByWorkOrderId(Long workOrderId);
}
