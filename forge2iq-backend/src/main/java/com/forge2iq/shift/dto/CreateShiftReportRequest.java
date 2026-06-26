package com.forge2iq.shift.dto;

import com.forge2iq.shift.ShiftName;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotNull;

public record CreateShiftReportRequest(
    @NotNull ShiftName shiftName,
    @Min(0) int producedQuantity,
    @Min(0) int rejectedQuantity,
    String comments
) {}
