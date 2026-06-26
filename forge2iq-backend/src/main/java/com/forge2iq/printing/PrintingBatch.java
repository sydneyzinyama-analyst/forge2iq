package com.forge2iq.printing;

import com.forge2iq.company.Company;
import com.forge2iq.user.User;
import com.forge2iq.workorder.WorkOrder;
import jakarta.persistence.*;
import lombok.*;

import java.time.LocalDateTime;

@Entity
@Table(name = "printing_batches", indexes = {
    @Index(name = "idx_pb_company_id", columnList = "company_id"),
    @Index(name = "idx_pb_work_order_id", columnList = "work_order_id")
})
@Getter @Setter @NoArgsConstructor @AllArgsConstructor @Builder
public class PrintingBatch {

    @Id @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.EAGER)
    @JoinColumn(name = "company_id", nullable = false)
    private Company company;

    @ManyToOne(fetch = FetchType.EAGER)
    @JoinColumn(name = "work_order_id", nullable = false)
    private WorkOrder workOrder;

    @Enumerated(EnumType.STRING)
    @Column
    private ProductionLine line;

    @Column(nullable = false)
    private Integer sheetsUsed;

    @Column(nullable = false)
    private String operatorName;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false)
    private PrintingStatus status;

    private String notes;

    @ManyToOne(fetch = FetchType.EAGER)
    @JoinColumn(name = "logged_by")
    private User loggedBy;

    @Column(nullable = false)
    private LocalDateTime loggedAt;

    @PrePersist
    protected void onCreate() {
        loggedAt = LocalDateTime.now();
        if (status == null) status = PrintingStatus.WIP;
    }
}
