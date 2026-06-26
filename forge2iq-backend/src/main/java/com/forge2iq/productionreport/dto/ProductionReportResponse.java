package com.forge2iq.productionreport.dto;

import com.forge2iq.productionreport.ProductionReport;

import java.time.LocalDate;
import java.time.LocalDateTime;

public record ProductionReportResponse(
    Long id,
    LocalDate reportDate,
    String status,
    String notes,
    String submittedBy,
    LocalDateTime submittedAt,
    String reviewedBy,
    LocalDateTime reviewedAt
) {
    public static ProductionReportResponse from(ProductionReport r) {
        return new ProductionReportResponse(
            r.getId(),
            r.getReportDate(),
            r.getStatus().name(),
            r.getNotes(),
            r.getSubmittedBy() != null ? r.getSubmittedBy().getName() : null,
            r.getSubmittedAt(),
            r.getReviewedBy() != null ? r.getReviewedBy().getName() : null,
            r.getReviewedAt()
        );
    }
}
