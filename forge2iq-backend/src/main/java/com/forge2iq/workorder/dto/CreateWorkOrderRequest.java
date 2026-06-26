package com.forge2iq.workorder.dto;

import com.forge2iq.workorder.ProductType;

public record CreateWorkOrderRequest(String productName, ProductType productType, Integer plannedQuantity, String notes) {}
