package com.forge2iq.shift;

import com.forge2iq.shift.dto.CreateShiftReportRequest;
import com.forge2iq.shift.dto.ShiftReportResponse;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/shift-reports")
@RequiredArgsConstructor
public class ShiftReportController {

    private final ShiftReportService shiftReportService;

    @GetMapping
    public List<ShiftReportResponse> getReports() {
        return shiftReportService.getReports();
    }

    @PostMapping
    public ResponseEntity<ShiftReportResponse> submitReport(@Valid @RequestBody CreateShiftReportRequest request) {
        return ResponseEntity.status(HttpStatus.CREATED).body(shiftReportService.submitReport(request));
    }
}
