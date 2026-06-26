package com.forge2iq.workorder;

import com.forge2iq.messaging.Message;
import com.forge2iq.messaging.MessageRepository;
import com.forge2iq.user.Role;
import com.forge2iq.user.User;
import com.forge2iq.user.UserRepository;
import com.forge2iq.workorder.dto.CreateWorkOrderRequest;
import com.forge2iq.workorder.dto.LogScrapRequest;
import com.forge2iq.workorder.dto.UpdateWorkOrderStatusRequest;
import com.forge2iq.workorder.dto.WorkOrderResponse;
import lombok.RequiredArgsConstructor;
import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.format.DateTimeFormatter;
import java.util.List;

@Service
@RequiredArgsConstructor
public class WorkOrderService {

    private final WorkOrderRepository workOrderRepository;
    private final UserRepository userRepository;
    private final MessageRepository messageRepository;

    private User currentUser() {
        return userRepository.findAll().stream().findFirst()
            .orElseThrow(() -> new ResponseStatusException(HttpStatus.INTERNAL_SERVER_ERROR, "No users in database"));
    }

    public List<WorkOrderResponse> getAll() {
        User user = currentUser();
        return workOrderRepository.findByCompanyIdOrderByCreatedAtDesc(user.getCompany().getId())
            .stream().map(WorkOrderResponse::from).toList();
    }

    public List<WorkOrderResponse> getByStatus(WorkOrderStatus status) {
        User user = currentUser();
        return workOrderRepository.findByCompanyIdAndStatusOrderByCreatedAtDesc(user.getCompany().getId(), status)
            .stream().map(WorkOrderResponse::from).toList();
    }

    public WorkOrderResponse create(CreateWorkOrderRequest request) {
        User user = currentUser();
        if (request.productName() == null || request.productName().isBlank()) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Product name is required");
        }
        if (request.plannedQuantity() == null || request.plannedQuantity() <= 0) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Planned quantity must be positive");
        }
        WorkOrder order = WorkOrder.builder()
            .company(user.getCompany())
            .productName(request.productName().trim())
            .productType(request.productType())
            .plannedQuantity(request.plannedQuantity())
            .notes(request.notes())
            .createdBy(user)
            .build();
        return WorkOrderResponse.from(workOrderRepository.save(order));
    }

    public WorkOrderResponse updateStatus(Long id, UpdateWorkOrderStatusRequest request) {
        User user = currentUser();
        WorkOrder order = workOrderRepository.findById(id)
            .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Work order not found"));
        if (!order.getCompany().getId().equals(user.getCompany().getId())) {
            throw new ResponseStatusException(HttpStatus.FORBIDDEN);
        }
        order.setStatus(request.status());
        if (request.status() == WorkOrderStatus.CLOSED) {
            order.setClosedAt(LocalDateTime.now());
        }
        return WorkOrderResponse.from(workOrderRepository.save(order));
    }

    @Transactional
    public WorkOrderResponse acceptByPrinting(Long id) {
        User user = currentUser();
        WorkOrder order = workOrderRepository.findById(id)
            .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Work order not found"));
        if (!order.getCompany().getId().equals(user.getCompany().getId())) {
            throw new ResponseStatusException(HttpStatus.FORBIDDEN);
        }
        if (order.getStatus() != WorkOrderStatus.PENDING_PRINT) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Only PENDING_PRINT orders can be accepted");
        }

        String batchNumber = generateBatchNumber(user.getCompany().getId());
        order.setBatchNumber(batchNumber);
        order.setStatus(WorkOrderStatus.IN_PRINTING);

        return WorkOrderResponse.from(workOrderRepository.save(order));
    }

    @Transactional
    public WorkOrderResponse declineByPrinting(Long id) {
        User user = currentUser();
        WorkOrder order = workOrderRepository.findById(id)
            .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Work order not found"));
        if (!order.getCompany().getId().equals(user.getCompany().getId())) {
            throw new ResponseStatusException(HttpStatus.FORBIDDEN);
        }
        if (order.getStatus() != WorkOrderStatus.PENDING_PRINT) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Only PENDING_PRINT orders can be declined");
        }
        order.setStatus(WorkOrderStatus.DECLINED);
        return WorkOrderResponse.from(workOrderRepository.save(order));
    }

    @Transactional
    public WorkOrderResponse logPrintingScrap(Long id, LogScrapRequest request) {
        User user = currentUser();
        WorkOrder order = workOrderRepository.findById(id)
            .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Work order not found"));
        if (!order.getCompany().getId().equals(user.getCompany().getId())) {
            throw new ResponseStatusException(HttpStatus.FORBIDDEN);
        }

        int scrap = request.scrap() != null ? request.scrap() : 0;
        order.setPrintingScrap((order.getPrintingScrap() != null ? order.getPrintingScrap() : 0) + scrap);
        WorkOrder saved = workOrderRepository.save(order);

        checkAndAlertShortfall(saved, user, "printing");
        return WorkOrderResponse.from(saved);
    }

    @Transactional
    public WorkOrderResponse logProductionScrap(Long id, LogScrapRequest request) {
        User user = currentUser();
        WorkOrder order = workOrderRepository.findById(id)
            .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Work order not found"));
        if (!order.getCompany().getId().equals(user.getCompany().getId())) {
            throw new ResponseStatusException(HttpStatus.FORBIDDEN);
        }

        int scrap = request.scrap() != null ? request.scrap() : 0;
        order.setProductionScrap((order.getProductionScrap() != null ? order.getProductionScrap() : 0) + scrap);
        WorkOrder saved = workOrderRepository.save(order);

        checkAndAlertShortfall(saved, user, "production");
        return WorkOrderResponse.from(saved);
    }

    private void checkAndAlertShortfall(WorkOrder order, User sender, String stage) {
        if (order.getSheetsAllocated() == null) return;

        int totalScrap = (order.getPrintingScrap() != null ? order.getPrintingScrap() : 0)
            + (order.getProductionScrap() != null ? order.getProductionScrap() : 0);
        int remaining = order.getSheetsAllocated() - totalScrap;

        if (remaining < order.getPlannedQuantity()) {
            int shortfall = order.getPlannedQuantity() - remaining;
            String content = String.format(
                "REORDER ALERT — Batch %s (%s): %d sheets scrapped at %s. Short by %d sheets. Please reorder to fulfil order.",
                order.getBatchNumber() != null ? order.getBatchNumber() : "unassigned",
                order.getProductName(),
                stage.equals("printing") ? order.getPrintingScrap() : order.getProductionScrap(),
                stage,
                shortfall
            );

            List<User> officeManagers = userRepository.findByCompanyIdAndRole(
                order.getCompany().getId(), Role.OFFICE_MANAGER);

            for (User om : officeManagers) {
                Message alert = Message.builder()
                    .company(order.getCompany())
                    .sender(sender)
                    .recipient(om)
                    .content(content)
                    .build();
                messageRepository.save(alert);
            }
        }
    }

    private String generateBatchNumber(Long companyId) {
        String dateStr = LocalDate.now().format(DateTimeFormatter.ofPattern("yyyyMMdd"));
        String prefix = "BN-" + dateStr;
        long count = workOrderRepository.countByCompanyIdAndBatchNumberStartingWith(companyId, prefix);
        return String.format("%s-%03d", prefix, count + 1);
    }

    @Transactional
    public void delete(Long id) {
        User user = currentUser();
        WorkOrder order = workOrderRepository.findById(id)
            .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND));
        if (!order.getCompany().getId().equals(user.getCompany().getId())) {
            throw new ResponseStatusException(HttpStatus.FORBIDDEN);
        }
        try {
            workOrderRepository.delete(order);
            workOrderRepository.flush();
        } catch (DataIntegrityViolationException e) {
            throw new ResponseStatusException(HttpStatus.CONFLICT,
                "Cannot delete this order — it has printing batches, shift entries, or dispatch records linked to it. Close it instead.");
        }
    }
}
