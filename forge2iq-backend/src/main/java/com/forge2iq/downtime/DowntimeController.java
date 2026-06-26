package com.forge2iq.downtime;

import com.forge2iq.downtime.dto.DowntimeResponse;
import com.forge2iq.downtime.dto.LogDowntimeRequest;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/downtime")
@RequiredArgsConstructor
public class DowntimeController {

    private final DowntimeService downtimeService;

    @GetMapping
    public List<DowntimeResponse> getDowntimes() {
        return downtimeService.getDowntimes();
    }

    @PostMapping
    public ResponseEntity<DowntimeResponse> logDowntime(@Valid @RequestBody LogDowntimeRequest request) {
        return ResponseEntity.status(HttpStatus.CREATED).body(downtimeService.logDowntime(request));
    }
}
