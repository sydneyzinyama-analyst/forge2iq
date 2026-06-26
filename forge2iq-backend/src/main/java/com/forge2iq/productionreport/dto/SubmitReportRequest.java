package com.forge2iq.productionreport.dto;

import java.time.LocalDate;

public record SubmitReportRequest(LocalDate reportDate, String notes) {}
