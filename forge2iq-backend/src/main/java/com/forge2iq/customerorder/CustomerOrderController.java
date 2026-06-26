package com.forge2iq.customerorder;

import com.forge2iq.customerorder.dto.CreateCustomerOrderRequest;
import com.forge2iq.customerorder.dto.CustomerOrderResponse;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/customer-orders")
@RequiredArgsConstructor
public class CustomerOrderController {

    private final CustomerOrderService customerOrderService;

    @GetMapping
    public List<CustomerOrderResponse> getAll() {
        return customerOrderService.getAll();
    }

    @GetMapping("/{id}")
    public CustomerOrderResponse getById(@PathVariable Long id) {
        return customerOrderService.getById(id);
    }

    @PostMapping
    @ResponseStatus(HttpStatus.CREATED)
    public CustomerOrderResponse create(@RequestBody CreateCustomerOrderRequest request) {
        return customerOrderService.create(request);
    }
}
