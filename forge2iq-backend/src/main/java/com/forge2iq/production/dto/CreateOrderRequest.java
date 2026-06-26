package com.forge2iq.production.dto;

import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotBlank;

public record CreateOrderRequest(
    @NotBlank String productName,
    @Min(1) int targetQuantity
) {}
