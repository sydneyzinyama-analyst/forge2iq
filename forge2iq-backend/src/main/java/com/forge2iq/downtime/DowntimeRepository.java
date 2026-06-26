package com.forge2iq.downtime;

import org.springframework.data.jpa.repository.JpaRepository;

import java.time.LocalDateTime;
import java.util.List;

public interface DowntimeRepository extends JpaRepository<Downtime, Long> {
    List<Downtime> findByCompanyId(Long companyId);
    List<Downtime> findByCompanyIdAndStartTimeGreaterThanEqualAndStartTimeLessThan(
        Long companyId, LocalDateTime start, LocalDateTime end);
}
