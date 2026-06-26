package com.forge2iq.downtime.dto;

import java.time.LocalDateTime;

public record DowntimeResponse(
    Long id,
    String machineName,
    String reason,
    LocalDateTime startTime,
    LocalDateTime endTime
) {}
