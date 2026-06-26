package com.forge2iq.shift.dto;

import com.forge2iq.shift.ShiftName;

import java.time.LocalDateTime;

public record ShiftReportResponse(
    Long id,
    ShiftName shiftName,
    int producedQuantity,
    int rejectedQuantity,
    String comments,
    String submittedBy,
    LocalDateTime createdAt
) {}
