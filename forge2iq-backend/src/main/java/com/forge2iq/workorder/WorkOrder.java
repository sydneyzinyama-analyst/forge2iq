package com.forge2iq.workorder;

import com.forge2iq.company.Company;
import com.forge2iq.customerorder.CustomerOrder;
import com.forge2iq.user.User;
import jakarta.persistence.*;
import lombok.*;

import java.time.LocalDateTime;

@Entity
@Table(name = "work_orders", indexes = {
    @Index(name = "idx_wo_company_id", columnList = "company_id"),
    @Index(name = "idx_wo_status", columnList = "status"),
    @Index(name = "idx_wo_customer_order_id", columnList = "customer_order_id")
})
@Getter @Setter @NoArgsConstructor @AllArgsConstructor @Builder
public class WorkOrder {

    @Id @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.EAGER)
    @JoinColumn(name = "company_id", nullable = false)
    private Company company;

    @ManyToOne(fetch = FetchType.EAGER)
    @JoinColumn(name = "customer_order_id")
    private CustomerOrder customerOrder;

    @Column(nullable = false)
    private String productName;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false)
    private ProductType productType;

    @Column(nullable = false)
    private Integer plannedQuantity;

    @Column
    private Integer sheetsAllocated;

    @Column
    private String batchNumber;

    @Column(nullable = false)
    @Builder.Default
    private Integer extraSheets = 0;

    @Column(nullable = false)
    @Builder.Default
    private Integer printingScrap = 0;

    @Column(nullable = false)
    @Builder.Default
    private Integer productionScrap = 0;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false)
    private WorkOrderStatus status;

    @ManyToOne(fetch = FetchType.EAGER)
    @JoinColumn(name = "created_by")
    private User createdBy;

    @Column(nullable = false)
    private LocalDateTime createdAt;

    private LocalDateTime closedAt;

    private String notes;

    @PrePersist
    protected void onCreate() {
        createdAt = LocalDateTime.now();
        if (status == null) status = WorkOrderStatus.PENDING_PRINT;
        if (extraSheets == null) extraSheets = 0;
        if (printingScrap == null) printingScrap = 0;
        if (productionScrap == null) productionScrap = 0;
    }
}
