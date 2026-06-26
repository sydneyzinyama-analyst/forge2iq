package com.forge2iq.production;

import com.forge2iq.production.dto.CreateOrderRequest;
import com.forge2iq.production.dto.OrderResponse;
import com.forge2iq.production.dto.UpdateOrderRequest;
import com.forge2iq.user.User;
import com.forge2iq.user.UserRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.stereotype.Service;
import org.springframework.web.server.ResponseStatusException;

import java.util.List;

@Service
@RequiredArgsConstructor
public class ProductionOrderService {

    private final ProductionOrderRepository orderRepository;
    private final UserRepository userRepository;

    private User currentUser() {
        String email = SecurityContextHolder.getContext().getAuthentication().getName();
        return userRepository.findByEmail(email)
            .orElseThrow(() -> new ResponseStatusException(HttpStatus.UNAUTHORIZED));
    }

    public List<OrderResponse> getOrders() {
        return orderRepository.findByCompanyId(currentUser().getCompany().getId())
            .stream().map(this::toResponse).toList();
    }

    public OrderResponse createOrder(CreateOrderRequest request) {
        User user = currentUser();
        ProductionOrder order = ProductionOrder.builder()
            .productName(request.productName())
            .targetQuantity(request.targetQuantity())
            .actualQuantity(0)
            .status(OrderStatus.PLANNED)
            .company(user.getCompany())
            .build();
        return toResponse(orderRepository.save(order));
    }

    public OrderResponse updateOrder(Long id, UpdateOrderRequest request) {
        Long companyId = currentUser().getCompany().getId();
        ProductionOrder order = orderRepository.findById(id)
            .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Order not found"));
        if (!order.getCompany().getId().equals(companyId)) {
            throw new ResponseStatusException(HttpStatus.FORBIDDEN);
        }
        order.setActualQuantity(request.actualQuantity());
        order.setStatus(request.status());
        return toResponse(orderRepository.save(order));
    }

    private OrderResponse toResponse(ProductionOrder o) {
        return new OrderResponse(o.getId(), o.getProductName(), o.getTargetQuantity(),
            o.getActualQuantity(), o.getStatus(), o.getCreatedDate());
    }
}
