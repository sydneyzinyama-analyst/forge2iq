package com.forge2iq.sheetreceipt;

import com.forge2iq.sheetreceipt.dto.LogSheetReceiptRequest;
import com.forge2iq.sheetreceipt.dto.SheetReceiptResponse;
import com.forge2iq.user.User;
import com.forge2iq.user.UserRepository;
import com.forge2iq.workorder.WorkOrder;
import com.forge2iq.workorder.WorkOrderRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.web.server.ResponseStatusException;

import java.util.List;

@Service
@RequiredArgsConstructor
public class SheetReceiptService {

    private final SheetReceiptRepository sheetReceiptRepository;
    private final WorkOrderRepository workOrderRepository;
    private final UserRepository userRepository;

    private User currentUser() {
        return userRepository.findAll().stream().findFirst()
            .orElseThrow(() -> new ResponseStatusException(HttpStatus.INTERNAL_SERVER_ERROR, "No users in database"));
    }

    public List<SheetReceiptResponse> getAll() {
        User user = currentUser();
        return sheetReceiptRepository.findByCompanyIdOrderByReceivedAtDesc(user.getCompany().getId())
            .stream().map(SheetReceiptResponse::from).toList();
    }

    public SheetReceiptResponse log(LogSheetReceiptRequest req) {
        if (req.productName() == null || req.productName().isBlank())
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Product name is required");
        if (req.sheetsReceived() == null || req.sheetsReceived() <= 0)
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Sheets received must be positive");

        User user = currentUser();

        WorkOrder workOrder = null;
        if (req.workOrderId() != null) {
            workOrder = workOrderRepository.findById(req.workOrderId())
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Work order not found"));
            if (!workOrder.getCompany().getId().equals(user.getCompany().getId()))
                throw new ResponseStatusException(HttpStatus.FORBIDDEN);
        }

        SheetReceipt receipt = SheetReceipt.builder()
            .company(user.getCompany())
            .workOrder(workOrder)
            .productName(req.productName().trim())
            .productType(req.productType())
            .shift(req.shift())
            .sheetsReceived(req.sheetsReceived())
            .notes(req.notes())
            .receivedBy(user)
            .build();

        return SheetReceiptResponse.from(sheetReceiptRepository.save(receipt));
    }
}
