package com.forge2iq.printingdispatch.dto;

import com.forge2iq.shiftentry.ShiftName;
import com.forge2iq.workorder.ProductType;

import java.time.LocalDate;

public record LogPrintingDispatchRequest(
    Long workOrderId,
    String productName,
    ProductType productType,
    Integer sheetsDispatched,
    LocalDate dispatchDate,
    ShiftName shift,
    String notes
) {}
