package com.forge2iq.printingshift.dto;

import com.forge2iq.printingshift.PrintingShiftLog;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.List;

public record PrintingShiftLogResponse(
    Long id,
    LocalDate logDate,
    String shift,
    List<PrintingStockItemResponse> items,
    String loggedBy,
    LocalDateTime loggedAt
) {
    public static PrintingShiftLogResponse from(PrintingShiftLog log) {
        return new PrintingShiftLogResponse(
            log.getId(),
            log.getLogDate(),
            log.getShift() != null ? log.getShift().name() : null,
            log.getItems() != null
                ? log.getItems().stream().map(PrintingStockItemResponse::from).toList()
                : List.of(),
            log.getLoggedBy() != null ? log.getLoggedBy().getName() : null,
            log.getLoggedAt()
        );
    }
}
