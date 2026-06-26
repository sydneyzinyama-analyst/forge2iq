package com.forge2iq.printingshift.dto;

import com.forge2iq.shiftentry.ShiftName;

import java.time.LocalDate;
import java.util.List;

public record LogPrintingShiftRequest(
    LocalDate logDate,
    ShiftName shift,
    List<PrintingStockItemRequest> items
) {}
