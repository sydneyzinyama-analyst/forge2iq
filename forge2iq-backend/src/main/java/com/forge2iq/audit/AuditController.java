package com.forge2iq.audit;

import com.forge2iq.user.User;
import com.forge2iq.user.UserRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.http.HttpStatus;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.server.ResponseStatusException;

@RestController
@RequestMapping("/audit-logs")
@RequiredArgsConstructor
public class AuditController {

    private final AuditLogRepository repository;
    private final UserRepository userRepository;

    @GetMapping
    public Page<AuditLog> getLogs(
        @RequestParam(defaultValue = "0")   int page,
        @RequestParam(defaultValue = "50")  int size,
        @RequestParam(required = false)     Long userId,
        @RequestParam(required = false)     String action
    ) {
        User currentUser = userRepository
            .findByEmail(SecurityContextHolder.getContext().getAuthentication().getName())
            .orElseThrow(() -> new ResponseStatusException(HttpStatus.UNAUTHORIZED));

        Long companyId = currentUser.getCompany().getId();
        Pageable pageable = PageRequest.of(page, size);

        if (userId != null) {
            return repository.findByCompanyIdAndUserIdOrderByTimestampDesc(companyId, userId, pageable);
        }
        if (action != null && !action.isBlank()) {
            return repository.findByCompanyIdAndActionOrderByTimestampDesc(companyId, action, pageable);
        }
        return repository.findByCompanyIdOrderByTimestampDesc(companyId, pageable);
    }
}
