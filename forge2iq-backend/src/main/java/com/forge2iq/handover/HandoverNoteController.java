package com.forge2iq.handover;

import com.forge2iq.shiftentry.ShiftName;
import lombok.RequiredArgsConstructor;
import org.springframework.format.annotation.DateTimeFormat;
import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.*;

import java.time.LocalDate;
import java.util.List;

@RestController
@RequestMapping("/handover-notes")
@RequiredArgsConstructor
public class HandoverNoteController {

    private final HandoverNoteService handoverNoteService;

    @GetMapping
    public List<HandoverNoteResponse> getAll(
        @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate date
    ) {
        if (date != null) return handoverNoteService.getByDate(date);
        return handoverNoteService.getAll();
    }

    @PostMapping
    @ResponseStatus(HttpStatus.CREATED)
    public HandoverNoteResponse create(@RequestBody CreateHandoverNoteRequest request) {
        return handoverNoteService.create(request.notes(), request.fromShift(), request.shiftDate());
    }

    public record CreateHandoverNoteRequest(String notes, ShiftName fromShift, LocalDate shiftDate) {}
}
