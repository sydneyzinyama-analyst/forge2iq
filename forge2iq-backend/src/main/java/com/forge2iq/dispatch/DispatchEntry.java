package com.forge2iq.dispatch;

import com.forge2iq.company.Company;
import com.forge2iq.user.User;
import com.forge2iq.workorder.ProductType;
import com.forge2iq.workorder.WorkOrder;
import jakarta.persistence.*;
import lombok.*;

import java.time.LocalDateTime;

@Entity
@Table(name = "dispatch_entries", indexes = {
    @Index(name = "idx_de_company_id", columnList = "company_id"),
    @Index(name = "idx_de_work_order_id", columnList = "work_order_id")
})
@Getter @Setter @NoArgsConstructor @AllArgsConstructor @Builder
public class DispatchEntry {

    @Id @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.EAGER)
    @JoinColumn(name = "company_id", nullable = false)
    private Company company;

    @ManyToOne(fetch = FetchType.EAGER)
    @JoinColumn(name = "work_order_id")
    private WorkOrder workOrder;

    @Column
    private String productName;

    @Enumerated(EnumType.STRING)
    @Column
    private ProductType productType;

    @Column
    private String batchNumber;

    @Column(nullable = false)
    private Integer binsExpected;

    @Column(nullable = false)
    private Integer binsDispatched;

    private String destination;

    private String notes;

    @ManyToOne(fetch = FetchType.EAGER)
    @JoinColumn(name = "dispatched_by")
    private User dispatchedBy;

    @Column(nullable = false)
    private LocalDateTime dispatchedAt;

    @PrePersist
    protected void onCreate() {
        dispatchedAt = LocalDateTime.now();
    }
}
