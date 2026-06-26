package com.forge2iq.production.dto;

import com.forge2iq.production.OrderStatus;

import java.time.LocalDate;

public record OrderResponse(
    Long id,
    String productName,
    int targetQuantity,
    int actualQuantity,
    OrderStatus status,
    LocalDate createdDate
) {}
