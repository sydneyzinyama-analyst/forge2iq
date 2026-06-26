package com.forge2iq.shiftentry;

import com.forge2iq.shiftentry.dto.LogShiftEntryRequest;
import com.forge2iq.shiftentry.dto.ShiftEntryResponse;
import com.forge2iq.user.User;
import com.forge2iq.user.UserRepository;
import com.forge2iq.workorder.WorkOrder;
import com.forge2iq.workorder.WorkOrderRepository;
import com.forge2iq.workorder.WorkOrderStatus;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.web.server.ResponseStatusException;

import java.time.LocalDate;
import java.util.List;

@Service
@RequiredArgsConstructor
public class ShiftEntryService {

    private final ShiftEntryRepository shiftEntryRepository;
    private final WorkOrderRepository workOrderRepository;
    private final UserRepository userRepository;

    private User currentUser() {
        
        return userRepository.findAll().stream().findFirst()
            .orElseThrow(() -> new ResponseStatusException(HttpStatus.INTERNAL_SERVER_ERROR, "No users in database"));
    }

    public List<ShiftEntryResponse> getAll() {
        User user = currentUser();
        return shiftEntryRepository.findByCompanyIdOrderByLoggedAtDesc(user.getCompany().getId())
            .stream().map(ShiftEntryResponse::from).toList();
    }

    public List<ShiftEntryResponse> getToday() {
        User user = currentUser();
        return shiftEntryRepository.findByCompanyIdAndShiftDateOrderByLineAsc(user.getCompany().getId(), LocalDate.now())
            .stream().map(ShiftEntryResponse::from).toList();
    }

    public ShiftEntryResponse log(LogShiftEntryRequest req) {
        User user = currentUser();

        WorkOrder workOrder = null;
        if (req.workOrderId() != null) {
            workOrder = workOrderRepository.findById(req.workOrderId())
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Work order not found"));
            if (!workOrder.getCompany().getId().equals(user.getCompany().getId())) {
                throw new ResponseStatusException(HttpStatus.FORBIDDEN);
            }
        }

        int received = req.sheetsReceived() != null ? req.sheetsReceived() : 0;
        int closingStock = req.openingStock() + received - req.sheetsUsed();
        int openingBins = req.openingBins() != null ? req.openingBins() : 0;
        int closingBins = req.closingBins() != null ? req.closingBins() : 0;

        LocalDate shiftDate = req.shiftDate() != null ? req.shiftDate() : LocalDate.now();

        if (shiftEntryRepository.existsDuplicate(user.getCompany().getId(), req.productName(), req.batchNumber(), req.shift(), shiftDate)) {
            String batch = req.batchNumber() != null ? " (batch " + req.batchNumber() + ")" : "";
            throw new ResponseStatusException(HttpStatus.CONFLICT,
                "A " + req.shift().name().toLowerCase() + " shift entry for " + req.productName() + batch + " on " + shiftDate + " already exists");
        }

        ShiftEntry entry = ShiftEntry.builder()
            .company(user.getCompany())
            .workOrder(workOrder)
            .productName(req.productName())
            .productType(req.productType())
            .line(req.line())
            .shift(req.shift())
            .shiftDate(shiftDate)
            .openingStock(req.openingStock())
            .sheetsReceived(req.sheetsReceived())
            .sheetsUsed(req.sheetsUsed())
            .productionQty(req.productionQty())
            .scrap(req.scrap())
            .closingStock(closingStock)
            .openingBins(openingBins)
            .closingBins(closingBins)
            .batchNumber(req.batchNumber())
            .operatorName(req.operatorName())
            .loggedBy(user)
            .build();

        ShiftEntry saved = shiftEntryRepository.save(entry);

        // Advance work order to IN_PRODUCTION if still in printing
        if (workOrder != null && workOrder.getStatus() == WorkOrderStatus.IN_PRINTING) {
            workOrder.setStatus(WorkOrderStatus.IN_PRODUCTION);
            workOrderRepository.save(workOrder);
        }

        return ShiftEntryResponse.from(saved);
    }
}
