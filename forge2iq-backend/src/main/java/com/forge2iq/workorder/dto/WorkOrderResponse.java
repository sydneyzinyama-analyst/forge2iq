package com.forge2iq.workorder.dto;

import com.forge2iq.workorder.ProductType;
import com.forge2iq.workorder.WorkOrder;
import com.forge2iq.workorder.WorkOrderStatus;

import java.time.LocalDateTime;

public record WorkOrderResponse(
    Long id,
    Long customerOrderId,
    String productName,
    ProductType productType,
    Integer plannedQuantity,
    Integer sheetsAllocated,
    Integer extraSheets,
    String batchNumber,
    Integer printingScrap,
    Integer productionScrap,
    WorkOrderStatus status,
    String createdBy,
    LocalDateTime createdAt,
    LocalDateTime closedAt,
    String notes,
    Integer plannedBins
) {
    public static WorkOrderResponse from(WorkOrder w) {
        int unitsPerBin = w.getProductType() == ProductType.LID ? 2856 : 1080;
        int plannedBins = (int) Math.ceil((double) w.getPlannedQuantity() / unitsPerBin);
        return new WorkOrderResponse(
            w.getId(),
            w.getCustomerOrder() != null ? w.getCustomerOrder().getId() : null,
            w.getProductName(),
            w.getProductType(),
            w.getPlannedQuantity(),
            w.getSheetsAllocated(),
            w.getExtraSheets() != null ? w.getExtraSheets() : 0,
            w.getBatchNumber(),
            w.getPrintingScrap() != null ? w.getPrintingScrap() : 0,
            w.getProductionScrap() != null ? w.getProductionScrap() : 0,
            w.getStatus(),
            w.getCreatedBy() != null ? w.getCreatedBy().getName() : "System",
            w.getCreatedAt(), w.getClosedAt(), w.getNotes(), plannedBins
        );
    }
}
