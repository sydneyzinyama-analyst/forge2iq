package com.forge2iq.printing;

import com.forge2iq.printing.dto.LogPrintingRequest;
import com.forge2iq.printing.dto.PrintingBatchResponse;
import com.forge2iq.printing.dto.UpdatePrintingStatusRequest;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/printing")
@RequiredArgsConstructor
public class PrintingBatchController {

    private final PrintingBatchService printingBatchService;

    @GetMapping
    public List<PrintingBatchResponse> getAll(@RequestParam(defaultValue = "false") boolean all) {
        if (all) return printingBatchService.getAll();
        return printingBatchService.getRecent();
    }

    @PostMapping
    @ResponseStatus(HttpStatus.CREATED)
    public PrintingBatchResponse log(@RequestBody LogPrintingRequest request) {
        return printingBatchService.log(request);
    }

    @PatchMapping("/{id}/status")
    public PrintingBatchResponse updateStatus(@PathVariable Long id, @RequestBody UpdatePrintingStatusRequest request) {
        return printingBatchService.updateStatus(id, request);
    }
}
