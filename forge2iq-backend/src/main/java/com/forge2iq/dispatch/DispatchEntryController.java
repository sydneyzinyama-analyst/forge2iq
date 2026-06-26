package com.forge2iq.dispatch;

import com.forge2iq.dispatch.dto.ConfirmDispatchRequest;
import com.forge2iq.dispatch.dto.DispatchEntryResponse;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/dispatch")
@RequiredArgsConstructor
public class DispatchEntryController {

    private final DispatchEntryService dispatchEntryService;

    @GetMapping
    public List<DispatchEntryResponse> getAll(@RequestParam(defaultValue = "false") boolean today) {
        if (today) return dispatchEntryService.getToday();
        return dispatchEntryService.getAll();
    }

    @PostMapping
    @ResponseStatus(HttpStatus.CREATED)
    public DispatchEntryResponse confirm(@RequestBody ConfirmDispatchRequest request) {
        return dispatchEntryService.confirm(request);
    }
}
