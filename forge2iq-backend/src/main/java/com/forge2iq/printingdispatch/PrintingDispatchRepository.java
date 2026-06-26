package com.forge2iq.printingdispatch;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.time.LocalDate;
import java.util.List;

public interface PrintingDispatchRepository extends JpaRepository<PrintingDispatch, Long> {
    List<PrintingDispatch> findByCompanyIdOrderByDispatchedAtDesc(Long companyId);
    long countByCompanyIdAndDispatchDate(Long companyId, LocalDate dispatchDate);

    @Query("SELECT COALESCE(SUM(pd.sheetsDispatched), 0) FROM PrintingDispatch pd WHERE pd.workOrder.id = :workOrderId")
    int sumSheetsDispatchedByWorkOrderId(@Param("workOrderId") Long workOrderId);
}
