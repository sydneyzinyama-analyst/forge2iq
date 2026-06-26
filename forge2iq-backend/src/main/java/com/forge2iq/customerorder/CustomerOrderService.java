package com.forge2iq.customerorder;

import com.forge2iq.customerorder.dto.CreateCustomerOrderRequest;
import com.forge2iq.customerorder.dto.CustomerOrderResponse;
import com.forge2iq.customerorder.dto.OrderItemRequest;
import com.forge2iq.user.User;
import com.forge2iq.user.UserRepository;
import com.forge2iq.workorder.WorkOrder;
import com.forge2iq.workorder.WorkOrderRepository;
import com.forge2iq.workorder.dto.WorkOrderResponse;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;

import java.util.ArrayList;
import java.util.List;

@Service
@RequiredArgsConstructor
@Transactional
public class CustomerOrderService {

    private final CustomerOrderRepository customerOrderRepository;
    private final WorkOrderRepository workOrderRepository;
    private final UserRepository userRepository;

    private User currentUser() {
        return userRepository.findAll().stream().findFirst()
            .orElseThrow(() -> new ResponseStatusException(HttpStatus.INTERNAL_SERVER_ERROR, "No users in database"));
    }

    public List<CustomerOrderResponse> getAll() {
        User user = currentUser();
        return customerOrderRepository.findByCompanyIdOrderByCreatedAtDesc(user.getCompany().getId())
            .stream()
            .map(co -> {
                List<WorkOrderResponse> items = workOrderRepository.findByCustomerOrderId(co.getId())
                    .stream().map(WorkOrderResponse::from).toList();
                return CustomerOrderResponse.from(co, items);
            })
            .toList();
    }

    public CustomerOrderResponse getById(Long id) {
        User user = currentUser();
        CustomerOrder co = customerOrderRepository.findById(id)
            .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Customer order not found"));
        if (!co.getCompany().getId().equals(user.getCompany().getId())) {
            throw new ResponseStatusException(HttpStatus.FORBIDDEN);
        }
        List<WorkOrderResponse> items = workOrderRepository.findByCustomerOrderId(id)
            .stream().map(WorkOrderResponse::from).toList();
        return CustomerOrderResponse.from(co, items);
    }

    public CustomerOrderResponse create(CreateCustomerOrderRequest request) {
        if (request.customerName() == null || request.customerName().isBlank()) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Customer name is required");
        }
        if (request.items() == null || request.items().isEmpty()) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "At least one order item is required");
        }

        User user = currentUser();

        CustomerOrder co = CustomerOrder.builder()
            .company(user.getCompany())
            .customerName(request.customerName().trim())
            .orderReference(request.orderReference() != null ? request.orderReference().trim() : null)
            .notes(request.notes())
            .createdBy(user)
            .build();

        CustomerOrder saved = customerOrderRepository.save(co);

        List<WorkOrder> items = new ArrayList<>();
        for (OrderItemRequest item : request.items()) {
            if (item.productName() == null || item.productName().isBlank()) continue;
            if (item.plannedQuantity() == null || item.plannedQuantity() <= 0) continue;

            WorkOrder wo = WorkOrder.builder()
                .company(user.getCompany())
                .customerOrder(saved)
                .productName(item.productName().trim())
                .productType(item.productType())
                .plannedQuantity(item.plannedQuantity())
                .sheetsAllocated(item.sheetsAllocated())
                .extraSheets(item.extraSheets() != null ? item.extraSheets() : 0)
                .notes(item.notes())
                .createdBy(user)
                .build();

            items.add(workOrderRepository.save(wo));
        }

        List<WorkOrderResponse> itemResponses = items.stream().map(WorkOrderResponse::from).toList();
        return CustomerOrderResponse.from(saved, itemResponses);
    }
}
