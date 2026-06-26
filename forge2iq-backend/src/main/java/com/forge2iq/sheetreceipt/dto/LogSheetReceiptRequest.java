package com.forge2iq.sheetreceipt.dto;

import com.forge2iq.shiftentry.ShiftName;
import com.forge2iq.workorder.ProductType;

public record LogSheetReceiptRequest(
    Long workOrderId,
    String productName,
    ProductType productType,
    ShiftName shift,
    Integer sheetsReceived,
    String notes
) {}
