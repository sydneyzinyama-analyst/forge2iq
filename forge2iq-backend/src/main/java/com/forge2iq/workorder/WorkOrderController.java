package com.forge2iq.workorder;

import com.forge2iq.workorder.dto.CreateWorkOrderRequest;
import com.forge2iq.workorder.dto.LogScrapRequest;
import com.forge2iq.workorder.dto.UpdateWorkOrderStatusRequest;
import com.forge2iq.workorder.dto.WorkOrderResponse;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/work-orders")
@RequiredArgsConstructor
public class WorkOrderController {

    private final WorkOrderService workOrderService;

    @GetMapping
    public List<WorkOrderResponse> getAll(@RequestParam(required = false) WorkOrderStatus status) {
        if (status != null) return workOrderService.getByStatus(status);
        return workOrderService.getAll();
    }

    @PostMapping
    @ResponseStatus(HttpStatus.CREATED)
    public WorkOrderResponse create(@RequestBody CreateWorkOrderRequest request) {
        return workOrderService.create(request);
    }

    @PatchMapping("/{id}/status")
    public WorkOrderResponse updateStatus(@PathVariable Long id, @RequestBody UpdateWorkOrderStatusRequest request) {
        return workOrderService.updateStatus(id, request);
    }

    @PatchMapping("/{id}/accept")
    public WorkOrderResponse accept(@PathVariable Long id) {
        return workOrderService.acceptByPrinting(id);
    }

    @PatchMapping("/{id}/decline")
    public WorkOrderResponse decline(@PathVariable Long id) {
        return workOrderService.declineByPrinting(id);
    }

    @PatchMapping("/{id}/printing-scrap")
    public WorkOrderResponse logPrintingScrap(@PathVariable Long id, @RequestBody LogScrapRequest request) {
        return workOrderService.logPrintingScrap(id, request);
    }

    @PatchMapping("/{id}/production-scrap")
    public WorkOrderResponse logProductionScrap(@PathVariable Long id, @RequestBody LogScrapRequest request) {
        return workOrderService.logProductionScrap(id, request);
    }

    @DeleteMapping("/{id}")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    public void delete(@PathVariable Long id) {
        workOrderService.delete(id);
    }
}
