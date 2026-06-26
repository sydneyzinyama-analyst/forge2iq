package com.forge2iq.shiftentry.dto;

import com.forge2iq.printing.ProductionLine;
import com.forge2iq.shiftentry.ShiftEntry;
import com.forge2iq.shiftentry.ShiftName;
import com.forge2iq.workorder.ProductType;

import java.time.LocalDate;
import java.time.LocalDateTime;

public record ShiftEntryResponse(
    Long id,
    Long workOrderId,
    String productName,
    ProductType productType,
    ProductionLine line,
    ShiftName shift,
    LocalDate shiftDate,
    Integer openingStock,
    Integer sheetsReceived,
    Integer sheetsUsed,
    Integer productionQty,
    Integer scrap,
    Integer closingStock,
    Integer openingBins,
    Integer closingBins,
    String batchNumber,
    String operatorName,
    String loggedBy,
    LocalDateTime loggedAt
) {
    public static ShiftEntryResponse from(ShiftEntry e) {
        return new ShiftEntryResponse(
            e.getId(),
            e.getWorkOrder() != null ? e.getWorkOrder().getId() : null,
            e.getProductName(), e.getProductType(), e.getLine(),
            e.getShift(), e.getShiftDate(),
            e.getOpeningStock(), e.getSheetsReceived(), e.getSheetsUsed(),
            e.getProductionQty(), e.getScrap(), e.getClosingStock(),
            e.getOpeningBins(), e.getClosingBins(),
            e.getBatchNumber(),
            e.getOperatorName(),
            e.getLoggedBy() != null ? e.getLoggedBy().getName() : null,
            e.getLoggedAt()
        );
    }
}
