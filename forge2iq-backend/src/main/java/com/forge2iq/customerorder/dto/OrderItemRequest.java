package com.forge2iq.customerorder.dto;

import com.forge2iq.workorder.ProductType;

public record OrderItemRequest(
    String productName,
    ProductType productType,
    Integer plannedQuantity,
    Integer sheetsAllocated,
    Integer extraSheets,
    String notes
) {}
