package com.forge2iq.shiftentry;

import com.forge2iq.shiftentry.dto.LogShiftEntryRequest;
import com.forge2iq.shiftentry.dto.ShiftEntryResponse;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/shift-entries")
@RequiredArgsConstructor
public class ShiftEntryController {

    private final ShiftEntryService shiftEntryService;

    @GetMapping
    public List<ShiftEntryResponse> getAll(@RequestParam(defaultValue = "false") boolean today) {
        if (today) return shiftEntryService.getToday();
        return shiftEntryService.getAll();
    }

    @PostMapping
    @ResponseStatus(HttpStatus.CREATED)
    public ShiftEntryResponse log(@RequestBody LogShiftEntryRequest request) {
        return shiftEntryService.log(request);
    }

    @PutMapping("/{id}")
    public ShiftEntryResponse update(@PathVariable Long id, @RequestBody LogShiftEntryRequest request) {
        return shiftEntryService.update(id, request);
    }
}
