package com.forge2iq.printingdispatch;

import com.forge2iq.company.Company;
import com.forge2iq.shiftentry.ShiftName;
import com.forge2iq.user.User;
import com.forge2iq.workorder.ProductType;
import com.forge2iq.workorder.WorkOrder;
import jakarta.persistence.*;
import lombok.*;

import java.time.LocalDate;
import java.time.LocalDateTime;

@Entity
@Table(name = "printing_dispatches", indexes = {
    @Index(name = "idx_pd_company_id", columnList = "company_id"),
    @Index(name = "idx_pd_dispatch_date", columnList = "dispatchDate")
})
@Getter @Setter @NoArgsConstructor @AllArgsConstructor @Builder
public class PrintingDispatch {

    @Id @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.EAGER)
    @JoinColumn(name = "company_id", nullable = false)
    private Company company;

    @ManyToOne(fetch = FetchType.EAGER)
    @JoinColumn(name = "work_order_id")
    private WorkOrder workOrder;

    @Column(nullable = false)
    private String productName;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false)
    private ProductType productType;

    @Column(nullable = false)
    private Integer sheetsDispatched;

    @Column(nullable = false)
    private LocalDate dispatchDate;

    @Enumerated(EnumType.STRING)
    @Column
    private ShiftName shift;

    @Column
    private String notes;

    @ManyToOne(fetch = FetchType.EAGER)
    @JoinColumn(name = "dispatched_by")
    private User dispatchedBy;

    @Column(nullable = false)
    private LocalDateTime dispatchedAt;

    @Column
    private String batchNumber;

    @Builder.Default
    @Column(nullable = false)
    private boolean confirmed = false;

    @Enumerated(EnumType.STRING)
    @Column
    private ShiftName receivedShift;

    @Column
    private LocalDateTime confirmedAt;

    @PrePersist
    protected void onCreate() {
        dispatchedAt = LocalDateTime.now();
    }
}
