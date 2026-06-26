package com.forge2iq.dispatch.dto;

import com.forge2iq.dispatch.DispatchEntry;

import java.time.LocalDateTime;

public record DispatchEntryResponse(
    Long id,
    Long workOrderId,
    String productName,
    String productType,
    Integer binsExpected,
    Integer binsDispatched,
    String destination,
    String notes,
    String batchNumber,
    String dispatchedBy,
    LocalDateTime dispatchedAt
) {
    public static DispatchEntryResponse from(DispatchEntry d) {
        String pName = d.getProductName() != null ? d.getProductName()
                     : d.getWorkOrder() != null ? d.getWorkOrder().getProductName() : null;
        String pType = d.getProductType() != null ? d.getProductType().name()
                     : d.getWorkOrder() != null ? d.getWorkOrder().getProductType().name() : null;
        return new DispatchEntryResponse(
            d.getId(),
            d.getWorkOrder() != null ? d.getWorkOrder().getId() : null,
            pName,
            pType,
            d.getBinsExpected(),
            d.getBinsDispatched(),
            d.getDestination(),
            d.getNotes(),
            d.getBatchNumber(),
            d.getDispatchedBy() != null ? d.getDispatchedBy().getName() : null,
            d.getDispatchedAt()
        );
    }
}
