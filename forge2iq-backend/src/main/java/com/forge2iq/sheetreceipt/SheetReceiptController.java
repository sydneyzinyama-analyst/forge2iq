package com.forge2iq.sheetreceipt;

import com.forge2iq.sheetreceipt.dto.LogSheetReceiptRequest;
import com.forge2iq.sheetreceipt.dto.SheetReceiptResponse;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/sheet-receipts")
@RequiredArgsConstructor
public class SheetReceiptController {

    private final SheetReceiptService sheetReceiptService;

    @GetMapping
    public List<SheetReceiptResponse> getAll() {
        return sheetReceiptService.getAll();
    }

    @PostMapping
    @ResponseStatus(HttpStatus.CREATED)
    public SheetReceiptResponse log(@RequestBody LogSheetReceiptRequest request) {
        return sheetReceiptService.log(request);
    }
}
