package com.forge2iq.shiftentry.dto;

import com.forge2iq.printing.ProductionLine;
import com.forge2iq.shiftentry.ShiftName;
import com.forge2iq.workorder.ProductType;

import java.time.LocalDate;

public record LogShiftEntryRequest(
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
    Integer openingBins,
    Integer closingBins,
    String batchNumber,
    String operatorName
) {}
