package com.forge2iq.customerorder.dto;

import com.forge2iq.customerorder.CustomerOrder;
import com.forge2iq.customerorder.CustomerOrderStatus;
import com.forge2iq.workorder.dto.WorkOrderResponse;

import java.time.LocalDateTime;
import java.util.List;

public record CustomerOrderResponse(
    Long id,
    String customerName,
    String orderReference,
    CustomerOrderStatus status,
    String createdBy,
    LocalDateTime createdAt,
    String notes,
    List<WorkOrderResponse> items
) {
    public static CustomerOrderResponse from(CustomerOrder co, List<WorkOrderResponse> items) {
        return new CustomerOrderResponse(
            co.getId(),
            co.getCustomerName(),
            co.getOrderReference(),
            co.getStatus(),
            co.getCreatedBy() != null ? co.getCreatedBy().getName() : "System",
            co.getCreatedAt(),
            co.getNotes(),
            items
        );
    }
}
