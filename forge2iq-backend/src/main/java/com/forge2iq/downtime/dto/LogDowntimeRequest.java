package com.forge2iq.downtime.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;

import java.time.LocalDateTime;

public record LogDowntimeRequest(
    @NotBlank String machineName,
    String reason,
    @NotNull LocalDateTime startTime,
    LocalDateTime endTime
) {}
