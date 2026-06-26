package com.forge2iq.printingshift;

import com.forge2iq.company.Company;
import com.forge2iq.shiftentry.ShiftName;
import com.forge2iq.user.User;
import jakarta.persistence.*;
import lombok.*;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.List;

@Entity
@Table(name = "printing_shift_logs", indexes = {
    @Index(name = "idx_psl_company_id", columnList = "company_id"),
    @Index(name = "idx_psl_log_date", columnList = "logDate")
})
@Getter @Setter @NoArgsConstructor @AllArgsConstructor @Builder
public class PrintingShiftLog {

    @Id @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.EAGER)
    @JoinColumn(name = "company_id", nullable = false)
    private Company company;

    @Column(nullable = false)
    private LocalDate logDate;

    @Enumerated(EnumType.STRING)
    @Column(nullable = true)
    private ShiftName shift;

    @OneToMany(mappedBy = "shiftLog", cascade = CascadeType.ALL, fetch = FetchType.EAGER)
    private List<PrintingStockItem> items;

    @ManyToOne(fetch = FetchType.EAGER)
    @JoinColumn(name = "logged_by")
    private User loggedBy;

    @Column(nullable = false)
    private LocalDateTime loggedAt;

    @PrePersist
    protected void onCreate() {
        loggedAt = LocalDateTime.now();
    }
}
