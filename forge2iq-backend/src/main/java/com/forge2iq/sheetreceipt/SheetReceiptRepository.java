package com.forge2iq.sheetreceipt;

import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;

public interface SheetReceiptRepository extends JpaRepository<SheetReceipt, Long> {
    List<SheetReceipt> findByCompanyIdOrderByReceivedAtDesc(Long companyId);
}
