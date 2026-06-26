package com.forge2iq.printingshift.dto;

import com.forge2iq.printingshift.PrintingStockItem;

public record PrintingStockItemResponse(
    Long id,
    String productName,
    String productType,
    String batchNumber,
    String category,
    Integer sheetCount
) {
    public static PrintingStockItemResponse from(PrintingStockItem item) {
        return new PrintingStockItemResponse(
            item.getId(),
            item.getProductName(),
            item.getProductType().name(),
            item.getBatchNumber(),
            item.getCategory().name(),
            item.getSheetCount()
        );
    }
}
