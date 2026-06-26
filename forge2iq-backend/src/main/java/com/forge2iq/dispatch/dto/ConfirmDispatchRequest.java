package com.forge2iq.dispatch.dto;

public record ConfirmDispatchRequest(
    String productName,
    String productType,
    Integer binsExpected,
    Integer binsDispatched,
    String destination,
    String notes,
    String batchNumber
) {}
