package com.forge2iq.printingshift;

import com.forge2iq.printingshift.dto.LogPrintingShiftRequest;
import com.forge2iq.printingshift.dto.PrintingShiftLogResponse;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/printing-shift-logs")
@RequiredArgsConstructor
public class PrintingShiftLogController {

    private final PrintingShiftLogService printingShiftLogService;

    @GetMapping
    public List<PrintingShiftLogResponse> getAll() {
        return printingShiftLogService.getAll();
    }

    @PostMapping
    @ResponseStatus(HttpStatus.CREATED)
    public PrintingShiftLogResponse log(@RequestBody LogPrintingShiftRequest request) {
        return printingShiftLogService.log(request);
    }
}
