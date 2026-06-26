package com.forge2iq.printingdispatch;

import com.forge2iq.printingdispatch.dto.ConfirmReceiptRequest;
import com.forge2iq.printingdispatch.dto.LogPrintingDispatchRequest;
import com.forge2iq.printingdispatch.dto.PrintingDispatchResponse;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/printing-dispatches")
@RequiredArgsConstructor
public class PrintingDispatchController {

    private final PrintingDispatchService printingDispatchService;

    @GetMapping
    public List<PrintingDispatchResponse> getAll() {
        return printingDispatchService.getAll();
    }

    @PostMapping
    @ResponseStatus(HttpStatus.CREATED)
    public PrintingDispatchResponse log(@RequestBody LogPrintingDispatchRequest request) {
        return printingDispatchService.log(request);
    }

    @PatchMapping("/{id}/confirm")
    public PrintingDispatchResponse confirmReceipt(@PathVariable Long id,
                                                   @RequestBody ConfirmReceiptRequest request) {
        return printingDispatchService.confirmReceipt(id, request);
    }
}
