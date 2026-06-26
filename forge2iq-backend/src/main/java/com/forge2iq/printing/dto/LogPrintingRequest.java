package com.forge2iq.printing.dto;

import com.forge2iq.printing.PrintingStatus;

public record LogPrintingRequest(
    Long workOrderId,
    Integer sheetsUsed,
    String operatorName,
    PrintingStatus status,
    String notes
) {}
