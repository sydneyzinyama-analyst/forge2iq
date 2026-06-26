package com.forge2iq.customerorder.dto;

import java.util.List;

public record CreateCustomerOrderRequest(
    String customerName,
    String orderReference,
    String notes,
    List<OrderItemRequest> items
) {}
