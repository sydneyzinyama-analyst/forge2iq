package com.forge2iq.production.dto;

import com.forge2iq.production.OrderStatus;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotNull;

public record UpdateOrderRequest(
    @Min(0) int actualQuantity,
    @NotNull OrderStatus status
) {}
