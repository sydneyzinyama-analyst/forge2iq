package com.forge2iq.dashboard.dto;

public record DashboardSummaryResponse(
    int totalProductionToday,
    long totalDowntimeMinutesToday,
    long activeOrders,
    double rejectionRate
) {}
