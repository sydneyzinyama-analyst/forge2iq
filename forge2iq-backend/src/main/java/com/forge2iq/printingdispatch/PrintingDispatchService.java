package com.forge2iq.printingdispatch;

import com.forge2iq.printingdispatch.dto.ConfirmReceiptRequest;
import com.forge2iq.printingdispatch.dto.LogPrintingDispatchRequest;
import com.forge2iq.printingdispatch.dto.PrintingDispatchResponse;
import com.forge2iq.sheetreceipt.SheetReceipt;
import com.forge2iq.sheetreceipt.SheetReceiptRepository;
import com.forge2iq.shiftentry.ShiftName;
import com.forge2iq.user.User;
import com.forge2iq.user.UserRepository;
import com.forge2iq.workorder.WorkOrder;
import com.forge2iq.workorder.WorkOrderRepository;
import com.forge2iq.workorder.WorkOrderStatus;
import lombok.RequiredArgsConstructor;
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
public class PrintingDispatchService {

    private final PrintingDispatchRepository printingDispatchRepository;
    private final SheetReceiptRepository sheetReceiptRepository;
    private final UserRepository userRepository;
    private final WorkOrderRepository workOrderRepository;

    private User currentUser() {
        return userRepository.findAll().stream().findFirst()
            .orElseThrow(() -> new ResponseStatusException(HttpStatus.INTERNAL_SERVER_ERROR, "No users in database"));
    }

    public List<PrintingDispatchResponse> getAll() {
        User user = currentUser();
        return printingDispatchRepository.findByCompanyIdOrderByDispatchedAtDesc(user.getCompany().getId())
            .stream().map(PrintingDispatchResponse::from).toList();
    }

    private String generateBatchNumber(Long companyId, LocalDate date) {
        String dateStr = date.format(DateTimeFormatter.ofPattern("yyyyMMdd"));
        long count = printingDispatchRepository.countByCompanyIdAndDispatchDate(companyId, date);
        return String.format("PRN-%s-%03d", dateStr, count + 1);
    }

    @Transactional
    public PrintingDispatchResponse log(LogPrintingDispatchRequest req) {
        if (req.sheetsDispatched() == null || req.sheetsDispatched() <= 0)
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Sheets dispatched must be positive");

        User user = currentUser();

        WorkOrder workOrder = null;
        String productName;
        com.forge2iq.workorder.ProductType productType;

        if (req.workOrderId() != null) {
            workOrder = workOrderRepository.findById(req.workOrderId())
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Work order not found"));
            if (workOrder.getStatus() != WorkOrderStatus.IN_PRINTING)
                throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Work order is not IN_PRINTING");
            if (!workOrder.getCompany().getId().equals(user.getCompany().getId()))
                throw new ResponseStatusException(HttpStatus.FORBIDDEN);

            int alreadyDispatched = printingDispatchRepository.sumSheetsDispatchedByWorkOrderId(workOrder.getId());
            int allocated = workOrder.getSheetsAllocated() != null ? workOrder.getSheetsAllocated() : Integer.MAX_VALUE;
            int remaining = allocated - alreadyDispatched;
            if (req.sheetsDispatched() > remaining)
                throw new ResponseStatusException(HttpStatus.BAD_REQUEST,
                    "Cannot dispatch " + req.sheetsDispatched() + " sheets — only " + remaining + " remaining for this order");

            productName = workOrder.getProductName();
            productType = workOrder.getProductType();
        } else {
            if (req.productName() == null || req.productName().isBlank())
                throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Product name is required");
            productName = req.productName().trim();
            productType = req.productType();
        }

        LocalDate dispatchDate = req.dispatchDate() != null ? req.dispatchDate() : LocalDate.now();
        String batchNumber = workOrder != null && workOrder.getBatchNumber() != null
            ? workOrder.getBatchNumber()
            : generateBatchNumber(user.getCompany().getId(), dispatchDate);

        PrintingDispatch dispatch = PrintingDispatch.builder()
            .company(user.getCompany())
            .workOrder(workOrder)
            .productName(productName)
            .productType(productType)
            .sheetsDispatched(req.sheetsDispatched())
            .dispatchDate(dispatchDate)
            .shift(req.shift())
            .notes(req.notes())
            .dispatchedBy(user)
            .batchNumber(batchNumber)
            .build();

        return PrintingDispatchResponse.from(printingDispatchRepository.save(dispatch));
    }

    @Transactional
    public PrintingDispatchResponse confirmReceipt(Long id, ConfirmReceiptRequest req) {
        PrintingDispatch dispatch = printingDispatchRepository.findById(id)
            .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Dispatch not found"));

        if (dispatch.isConfirmed())
            throw new ResponseStatusException(HttpStatus.CONFLICT, "Dispatch already confirmed");

        ShiftName receivedShift = ShiftName.valueOf(req.shift());
        User user = currentUser();

        dispatch.setConfirmed(true);
        dispatch.setReceivedShift(receivedShift);
        dispatch.setConfirmedAt(LocalDateTime.now());
        printingDispatchRepository.save(dispatch);

        SheetReceipt receipt = SheetReceipt.builder()
            .company(user.getCompany())
            .productName(dispatch.getProductName())
            .productType(dispatch.getProductType())
            .shift(receivedShift)
            .sheetsReceived(dispatch.getSheetsDispatched())
            .batchNumber(dispatch.getBatchNumber())
            .notes("Confirmed from printing dispatch #" + dispatch.getId())
            .receivedBy(user)
            .build();
        sheetReceiptRepository.save(receipt);

        return PrintingDispatchResponse.from(dispatch);
    }
}
