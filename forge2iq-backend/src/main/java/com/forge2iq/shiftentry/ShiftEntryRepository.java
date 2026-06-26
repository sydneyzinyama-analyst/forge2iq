package com.forge2iq.shiftentry;

import com.forge2iq.printing.ProductionLine;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import java.time.LocalDate;
import java.util.List;

public interface ShiftEntryRepository extends JpaRepository<ShiftEntry, Long> {
    List<ShiftEntry> findByCompanyIdOrderByLoggedAtDesc(Long companyId);
    List<ShiftEntry> findByCompanyIdAndShiftDateOrderByLineAsc(Long companyId, LocalDate date);

    @Query("SELECT COALESCE(SUM(e.closingStock), 0) FROM ShiftEntry e WHERE e.company.id = :cid AND e.line = :line AND e.shift = :shift AND e.shiftDate = :date")
    Integer findLastClosingStock(@Param("cid") Long companyId, @Param("line") ProductionLine line, @Param("shift") ShiftName shift, @Param("date") LocalDate date);

    @Query("SELECT COUNT(e) > 0 FROM ShiftEntry e WHERE e.company.id = :cid AND e.productName = :productName AND e.shift = :shift AND e.shiftDate = :shiftDate AND ((:batchNumber IS NULL AND e.batchNumber IS NULL) OR e.batchNumber = :batchNumber)")
    boolean existsDuplicate(@Param("cid") Long companyId, @Param("productName") String productName, @Param("batchNumber") String batchNumber, @Param("shift") ShiftName shift, @Param("shiftDate") LocalDate shiftDate);
}
