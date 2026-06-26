package com.forge2iq.dispatch;

import org.springframework.data.jpa.repository.JpaRepository;
import java.time.LocalDateTime;
import java.util.List;

public interface DispatchEntryRepository extends JpaRepository<DispatchEntry, Long> {
    List<DispatchEntry> findByCompanyIdOrderByDispatchedAtDesc(Long companyId);
    List<DispatchEntry> findByCompanyIdAndDispatchedAtAfterOrderByDispatchedAtDesc(Long companyId, LocalDateTime since);
}
