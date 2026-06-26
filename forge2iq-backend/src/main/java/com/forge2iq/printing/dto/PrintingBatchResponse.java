package com.forge2iq.printing.dto;

import com.forge2iq.printing.PrintingBatch;
import com.forge2iq.printing.PrintingStatus;
import com.forge2iq.printing.ProductionLine;

import java.time.LocalDateTime;

public record PrintingBatchResponse(
    Long id,
    Long workOrderId,
    String productName,
    String productType,
    ProductionLine line,
    Integer sheetsUsed,
    String operatorName,
    PrintingStatus status,
    String notes,
    String loggedBy,
    LocalDateTime loggedAt
) {
    public static PrintingBatchResponse from(PrintingBatch b) {
        return new PrintingBatchResponse(
            b.getId(),
            b.getWorkOrder().getId(),
            b.getWorkOrder().getProductName(),
            b.getWorkOrder().getProductType().name(),
            b.getLine(),
            b.getSheetsUsed(),
            b.getOperatorName(),
            b.getStatus(),
            b.getNotes(),
            b.getLoggedBy() != null ? b.getLoggedBy().getName() : null,
            b.getLoggedAt()
        );
    }
}
