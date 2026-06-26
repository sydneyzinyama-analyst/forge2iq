package com.forge2iq.sheetreceipt;

import com.forge2iq.company.Company;
import com.forge2iq.shiftentry.ShiftName;
import com.forge2iq.user.User;
import com.forge2iq.workorder.ProductType;
import com.forge2iq.workorder.WorkOrder;
import jakarta.persistence.*;
import lombok.*;

import java.time.LocalDateTime;

@Entity
@Table(name = "sheet_receipts", indexes = {
    @Index(name = "idx_sr_company_id", columnList = "company_id"),
    @Index(name = "idx_sr_received_at", columnList = "receivedAt")
})
@Getter @Setter @NoArgsConstructor @AllArgsConstructor @Builder
public class SheetReceipt {

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

    @Enumerated(EnumType.STRING)
    @Column
    private ShiftName shift;

    @Column(nullable = false)
    private Integer sheetsReceived;

    @Column
    private String batchNumber;

    @Column
    private String notes;

    @ManyToOne(fetch = FetchType.EAGER)
    @JoinColumn(name = "received_by")
    private User receivedBy;

    @Column(nullable = false)
    private LocalDateTime receivedAt;

    @PrePersist
    protected void onCreate() {
        receivedAt = LocalDateTime.now();
    }
}
