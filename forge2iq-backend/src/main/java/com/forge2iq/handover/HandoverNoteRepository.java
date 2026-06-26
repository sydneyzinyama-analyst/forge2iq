package com.forge2iq.handover;

import org.springframework.data.jpa.repository.JpaRepository;

import java.time.LocalDate;
import java.util.List;

public interface HandoverNoteRepository extends JpaRepository<HandoverNote, Long> {
    List<HandoverNote> findByCompanyIdOrderByCreatedAtDesc(Long companyId);
    List<HandoverNote> findByCompanyIdAndShiftDateOrderByCreatedAtDesc(Long companyId, LocalDate date);
}
