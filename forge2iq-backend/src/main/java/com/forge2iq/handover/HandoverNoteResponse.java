package com.forge2iq.handover;

import com.forge2iq.shiftentry.ShiftName;

import java.time.LocalDate;
import java.time.LocalDateTime;

public record HandoverNoteResponse(
    Long id,
    ShiftName fromShift,
    LocalDate shiftDate,
    String notes,
    String writtenBy,
    LocalDateTime createdAt
) {
    public static HandoverNoteResponse from(HandoverNote n) {
        return new HandoverNoteResponse(
            n.getId(),
            n.getFromShift(),
            n.getShiftDate(),
            n.getNotes(),
            n.getWrittenBy() != null ? n.getWrittenBy().getName() : null,
            n.getCreatedAt()
        );
    }
}
