package com.forge2iq.sheetreceipt.dto;

import com.forge2iq.sheetreceipt.SheetReceipt;

import java.time.LocalDateTime;

public record SheetReceiptResponse(
    Long id,
    Long workOrderId,
    String productName,
    String productType,
    String shift,
    Integer sheetsReceived,
    String batchNumber,
    String notes,
    String receivedBy,
    LocalDateTime receivedAt
) {
    public static SheetReceiptResponse from(SheetReceipt r) {
        return new SheetReceiptResponse(
            r.getId(),
            r.getWorkOrder() != null ? r.getWorkOrder().getId() : null,
            r.getProductName(),
            r.getProductType().name(),
            r.getShift() != null ? r.getShift().name() : null,
            r.getSheetsReceived(),
            r.getBatchNumber(),
            r.getNotes(),
            r.getReceivedBy() != null ? r.getReceivedBy().getName() : null,
            r.getReceivedAt()
        );
    }
}
