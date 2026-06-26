package com.forge2iq.product.dto;

import com.forge2iq.workorder.ProductType;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;

public record CreateProductRequest(
    @NotBlank String name,
    @NotNull ProductType productType,
    @NotNull @Min(1) Integer unitsPerSheet
) {}
