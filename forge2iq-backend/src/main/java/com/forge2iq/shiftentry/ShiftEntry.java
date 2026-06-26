package com.forge2iq.shiftentry;

import com.forge2iq.company.Company;
import com.forge2iq.printing.ProductionLine;
import com.forge2iq.user.User;
import com.forge2iq.workorder.ProductType;
import com.forge2iq.workorder.WorkOrder;
import jakarta.persistence.*;
import lombok.*;

import java.time.LocalDate;
import java.time.LocalDateTime;

@Entity
@Table(name = "shift_entries", indexes = {
    @Index(name = "idx_se_company_id", columnList = "company_id"),
    @Index(name = "idx_se_shift_date", columnList = "shiftDate")
})
@Getter @Setter @NoArgsConstructor @AllArgsConstructor @Builder
public class ShiftEntry {

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
    @Column(nullable = false)
    private ProductionLine line;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false)
    private ShiftName shift;

    @Column(nullable = false)
    private LocalDate shiftDate;

    @Column(nullable = false)
    private Integer openingStock;

    @Column
    private Integer sheetsReceived;

    @Column(nullable = false)
    private Integer sheetsUsed;

    @Column(nullable = false)
    private Integer productionQty;

    @Column(nullable = false)
    private Integer scrap;

    @Column(nullable = false)
    private Integer closingStock;

    @Column(nullable = false)
    private Integer openingBins;

    @Column(nullable = false)
    private Integer closingBins;

    @Column
    private String batchNumber;

    @Column(nullable = false)
    private String operatorName;

    @ManyToOne(fetch = FetchType.EAGER)
    @JoinColumn(name = "logged_by")
    private User loggedBy;

    @Column(nullable = false)
    private LocalDateTime loggedAt;

    @PrePersist
    protected void onCreate() {
        loggedAt = LocalDateTime.now();
    }

    public static int calculateBins(int productionQty, ProductType productType) {
        int unitsPerBin = productType == ProductType.LID ? 2856 : 1080;
        return (int) Math.ceil((double) productionQty / unitsPerBin);
    }
}
