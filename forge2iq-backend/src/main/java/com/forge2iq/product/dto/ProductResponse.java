package com.forge2iq.product.dto;

import com.forge2iq.product.Product;
import com.forge2iq.workorder.ProductType;

public record ProductResponse(
    Long id,
    String name,
    ProductType productType,
    Integer unitsPerSheet,
    String createdBy,
    String createdAt
) {
    public static ProductResponse from(Product p) {
        return new ProductResponse(
            p.getId(),
            p.getName(),
            p.getProductType(),
            p.getUnitsPerSheet(),
            p.getCreatedBy() != null ? p.getCreatedBy().getName() : null,
            p.getCreatedAt().toString()
        );
    }
}
