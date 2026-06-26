package com.forge2iq.printingshift.dto;

import com.forge2iq.printingshift.PrintingStockCategory;
import com.forge2iq.workorder.ProductType;

public record PrintingStockItemRequest(
    String productName,
    ProductType productType,
    String batchNumber,
    PrintingStockCategory category,
    Integer sheetCount
) {}
