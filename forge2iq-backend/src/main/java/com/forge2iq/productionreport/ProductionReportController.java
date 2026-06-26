package com.forge2iq.productionreport;

import com.forge2iq.productionreport.dto.ProductionReportResponse;
import com.forge2iq.productionreport.dto.SubmitReportRequest;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/production-reports")
@RequiredArgsConstructor
public class ProductionReportController {

    private final ProductionReportService reportService;

    @GetMapping
    public List<ProductionReportResponse> getAll() {
        return reportService.getAll();
    }

    @PostMapping
    @ResponseStatus(HttpStatus.CREATED)
    public ProductionReportResponse submit(@RequestBody SubmitReportRequest request) {
        return reportService.submit(request);
    }

    @PatchMapping("/{id}/review")
    public ProductionReportResponse markReviewed(@PathVariable Long id) {
        return reportService.markReviewed(id);
    }
}
