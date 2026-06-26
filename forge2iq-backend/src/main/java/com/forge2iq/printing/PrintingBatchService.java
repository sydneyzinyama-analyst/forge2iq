package com.forge2iq.printing;

import com.forge2iq.printing.dto.LogPrintingRequest;
import com.forge2iq.printing.dto.PrintingBatchResponse;
import com.forge2iq.printing.dto.UpdatePrintingStatusRequest;
import com.forge2iq.user.User;
import com.forge2iq.user.UserRepository;
import com.forge2iq.workorder.WorkOrder;
import com.forge2iq.workorder.WorkOrderRepository;
import com.forge2iq.workorder.WorkOrderStatus;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.web.server.ResponseStatusException;

import java.time.LocalDateTime;
import java.util.List;

@Service
@RequiredArgsConstructor
public class PrintingBatchService {

    private final PrintingBatchRepository printingBatchRepository;
    private final WorkOrderRepository workOrderRepository;
    private final UserRepository userRepository;

    private User currentUser() {
        
        return userRepository.findAll().stream().findFirst()
            .orElseThrow(() -> new ResponseStatusException(HttpStatus.INTERNAL_SERVER_ERROR, "No users in database"));
    }

    public List<PrintingBatchResponse> getRecent() {
        User user = currentUser();
        LocalDateTime since = LocalDateTime.now().minusDays(7);
        return printingBatchRepository.findByCompanyIdAndLoggedAtAfterOrderByLoggedAtDesc(user.getCompany().getId(), since)
            .stream().map(PrintingBatchResponse::from).toList();
    }

    public List<PrintingBatchResponse> getAll() {
        User user = currentUser();
        return printingBatchRepository.findByCompanyIdOrderByLoggedAtDesc(user.getCompany().getId())
            .stream().map(PrintingBatchResponse::from).toList();
    }

    public PrintingBatchResponse log(LogPrintingRequest request) {
        User user = currentUser();
        WorkOrder workOrder = workOrderRepository.findById(request.workOrderId())
            .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Work order not found"));
        if (!workOrder.getCompany().getId().equals(user.getCompany().getId())) {
            throw new ResponseStatusException(HttpStatus.FORBIDDEN);
        }
        PrintingBatch batch = PrintingBatch.builder()
            .company(user.getCompany())
            .workOrder(workOrder)
            .sheetsUsed(request.sheetsUsed())
            .operatorName(request.operatorName())
            .status(request.status() != null ? request.status() : PrintingStatus.WIP)
            .notes(request.notes())
            .loggedBy(user)
            .build();
        PrintingBatch saved = printingBatchRepository.save(batch);
        // Auto-advance work order status to IN_PRINTING if still pending
        if (workOrder.getStatus() == WorkOrderStatus.PENDING_PRINT) {
            workOrder.setStatus(WorkOrderStatus.IN_PRINTING);
            workOrderRepository.save(workOrder);
        }
        return PrintingBatchResponse.from(saved);
    }

    public PrintingBatchResponse updateStatus(Long id, UpdatePrintingStatusRequest request) {
        User user = currentUser();
        PrintingBatch batch = printingBatchRepository.findById(id)
            .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND));
        if (!batch.getCompany().getId().equals(user.getCompany().getId())) {
            throw new ResponseStatusException(HttpStatus.FORBIDDEN);
        }
        batch.setStatus(request.status());
        // When all batches for a work order are ready to dispatch, advance the WO
        if (request.status() == PrintingStatus.READY_TO_DISPATCH) {
            WorkOrder wo = batch.getWorkOrder();
            boolean allReady = printingBatchRepository.findByWorkOrderId(wo.getId())
                .stream().allMatch(b -> b.getId().equals(id) || b.getStatus() == PrintingStatus.READY_TO_DISPATCH);
            if (allReady) {
                wo.setStatus(WorkOrderStatus.IN_PRODUCTION);
                workOrderRepository.save(wo);
            }
        }
        return PrintingBatchResponse.from(printingBatchRepository.save(batch));
    }
}
