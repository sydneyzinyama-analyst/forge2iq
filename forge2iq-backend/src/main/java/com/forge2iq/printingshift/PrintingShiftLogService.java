package com.forge2iq.printingshift;

import com.forge2iq.printingshift.dto.LogPrintingShiftRequest;
import com.forge2iq.printingshift.dto.PrintingShiftLogResponse;
import com.forge2iq.user.User;
import com.forge2iq.user.UserRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.web.server.ResponseStatusException;

import java.util.List;

@Service
@RequiredArgsConstructor
public class PrintingShiftLogService {

    private final PrintingShiftLogRepository printingShiftLogRepository;
    private final PrintingStockItemRepository printingStockItemRepository;
    private final UserRepository userRepository;

    private User currentUser() {
        return userRepository.findAll().stream().findFirst()
            .orElseThrow(() -> new ResponseStatusException(HttpStatus.INTERNAL_SERVER_ERROR, "No users in database"));
    }

    public List<PrintingShiftLogResponse> getAll() {
        User user = currentUser();
        return printingShiftLogRepository.findByCompanyIdOrderByLogDateDescShiftDesc(user.getCompany().getId())
            .stream().map(PrintingShiftLogResponse::from).toList();
    }

    public PrintingShiftLogResponse log(LogPrintingShiftRequest req) {
        User user = currentUser();

        PrintingShiftLog shiftLog = PrintingShiftLog.builder()
            .company(user.getCompany())
            .logDate(req.logDate())
            .shift(req.shift())
            .loggedBy(user)
            .build();

        PrintingShiftLog savedLog = printingShiftLogRepository.save(shiftLog);

        if (req.items() != null) {
            List<PrintingStockItem> items = req.items().stream()
                .map(itemReq -> PrintingStockItem.builder()
                    .shiftLog(savedLog)
                    .productName(itemReq.productName())
                    .productType(itemReq.productType())
                    .batchNumber(itemReq.batchNumber())
                    .category(itemReq.category())
                    .sheetCount(itemReq.sheetCount())
                    .build())
                .toList();
            printingStockItemRepository.saveAll(items);
            savedLog.setItems(items);
        }

        return PrintingShiftLogResponse.from(savedLog);
    }
}
