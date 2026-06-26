package com.forge2iq.audit;

import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;

public interface AuditLogRepository extends JpaRepository<AuditLog, Long> {
    Page<AuditLog> findByCompanyIdOrderByTimestampDesc(Long companyId, Pageable pageable);
    Page<AuditLog> findByCompanyIdAndUserIdOrderByTimestampDesc(Long companyId, Long userId, Pageable pageable);
    Page<AuditLog> findByCompanyIdAndActionOrderByTimestampDesc(Long companyId, String action, Pageable pageable);
}
