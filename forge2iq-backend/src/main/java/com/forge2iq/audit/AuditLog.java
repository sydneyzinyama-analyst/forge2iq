package com.forge2iq.audit;

import jakarta.persistence.*;
import lombok.*;

import java.time.LocalDateTime;

@Entity
@Table(name = "audit_log", indexes = {
    @Index(name = "idx_audit_log_company_id", columnList = "company_id"),
    @Index(name = "idx_audit_log_timestamp",  columnList = "timestamp")
})
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class AuditLog {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    private Long   companyId;
    private Long   userId;
    private String userName;
    private String userRole;

    @Column(nullable = false)
    private String action;

    private String entityType;
    private Long   entityId;

    @Column(length = 512)
    private String description;

    @Column(nullable = false)
    private LocalDateTime timestamp;

    @PrePersist
    protected void onCreate() {
        if (timestamp == null) timestamp = LocalDateTime.now();
    }
}
