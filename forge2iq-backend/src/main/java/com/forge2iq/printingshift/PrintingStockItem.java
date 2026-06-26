package com.forge2iq.printingshift;

import com.forge2iq.workorder.ProductType;
import jakarta.persistence.*;
import lombok.*;

@Entity
@Table(name = "printing_stock_items")
@Getter @Setter @NoArgsConstructor @AllArgsConstructor @Builder
public class PrintingStockItem {

    @Id @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "shift_log_id", nullable = false)
    private PrintingShiftLog shiftLog;

    @Column(nullable = false)
    private String productName;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false)
    private ProductType productType;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false)
    private PrintingStockCategory category;

    @Column
    private String batchNumber;

    @Column(nullable = false)
    private Integer sheetCount;
}
