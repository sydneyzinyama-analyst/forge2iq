package com.forge2iq.printingdispatch.dto;

import com.forge2iq.printingdispatch.PrintingDispatch;

import java.time.LocalDate;
import java.time.LocalDateTime;

public record PrintingDispatchResponse(
    Long id,
    Long workOrderId,
    String productName,
    String productType,
    Integer sheetsDispatched,
    LocalDate dispatchDate,
    String shift,
    String notes,
    String dispatchedBy,
    LocalDateTime dispatchedAt,
    boolean confirmed,
    String receivedShift,
    LocalDateTime confirmedAt,
    String batchNumber
) {
    public static PrintingDispatchResponse from(PrintingDispatch d) {
        return new PrintingDispatchResponse(
            d.getId(),
            d.getWorkOrder() != null ? d.getWorkOrder().getId() : null,
            d.getProductName(),
            d.getProductType().name(),
            d.getSheetsDispatched(),
            d.getDispatchDate(),
            d.getShift() != null ? d.getShift().name() : null,
            d.getNotes(),
            d.getDispatchedBy() != null ? d.getDispatchedBy().getName() : null,
            d.getDispatchedAt(),
            d.isConfirmed(),
            d.getReceivedShift() != null ? d.getReceivedShift().name() : null,
            d.getConfirmedAt(),
            d.getBatchNumber()
        );
    }
}
