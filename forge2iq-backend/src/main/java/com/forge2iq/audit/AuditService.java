package com.forge2iq.audit;

import lombok.RequiredArgsConstructor;
import org.springframework.scheduling.annotation.Async;
import org.springframework.stereotype.Service;

@Service
@RequiredArgsConstructor
public class AuditService {

    private final AuditLogRepository repository;

    @Async
    public void log(Long companyId, Long userId, String userName, String userRole,
                    String action, String entityType, Long entityId, String description) {
        repository.save(AuditLog.builder()
            .companyId(companyId)
            .userId(userId)
            .userName(userName)
            .userRole(userRole)
            .action(action)
            .entityType(entityType)
            .entityId(entityId)
            .description(description)
            .build());
    }
}
